"use client";
// 식당 상세 행동 훅 (T5.35 PLACE-04, T5.36~T5.38 NAV-01~04). 길찾기, 즐겨찾기, 공유를 한곳에서 다룬다.
//
// 길찾기 순서 (사용자 탭 안에서 동기로)
//   1. 로그인 상태면 방문 후보 저장 요청을 먼저 보낸다(NAV-04, 결과를 기다리지 않음. 실패해도 길찾기는 계속)
//   2. 앱 시도 → 미설치면 웹, 데스크톱은 바로 웹(launch-directions.ts)
//   3. directions_clicked(place_id, source, app_or_web). 장소명, 좌표는 보내지 않는다
// 출발지 좌표(사무실 핀, 현위치)는 네이버 URL에만 들어가고 우리 서버로 가지 않는다(CLAUDE.md 7장).
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useCallback, useState } from "react";
import { toast } from "@/components/ui/lazy-toaster";
import { placeCopy } from "@/copy/place";
import { useLoginPrompt } from "@/features/auth/login-prompt";
import { track } from "@/lib/analytics";
import { siteUrl } from "@/lib/env/site";
import { naverAppName, type DirectionsOrigin } from "@/lib/naver/directions";
import type { LatLng } from "@/lib/map/types";
import type { Meal } from "@/lib/time";
import {
  placeUserStateAction,
  saveVisitAction,
  setFavoriteAction,
} from "../actions";
import {
  browserLaunchEnv,
  launchDirections,
  type DirectionsResult,
} from "../launch-directions";
import type { PlaceUserState } from "../place-requests";

const copy = placeCopy;

export type DirectionsSource = "rec" | "map" | "poll";

export const placeUserStateKey = (placeId: string) =>
  ["place-user-state", placeId] as const;

/** 상세를 열 때 즐겨찾기 상태. 서버 액션이라 세션 쿠키로 판정한다 */
export function usePlaceUserState(placeId: string, enabled = true) {
  return useQuery<PlaceUserState>({
    queryKey: placeUserStateKey(placeId),
    queryFn: () => placeUserStateAction({ placeId }),
    enabled,
    staleTime: 60_000,
    retry: false,
  });
}

export function useFavorite(args: {
  placeId: string;
  placeUrl: string;
  online: boolean;
}) {
  const { placeId, placeUrl, online } = args;
  const client = useQueryClient();
  const state = usePlaceUserState(placeId);
  const login = useLoginPrompt();
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState("");

  const signedIn = state.data?.signedIn ?? false;
  const on = state.data?.signedIn ? state.data.favorite : false;

  const toggle = useCallback(async () => {
    if (pending) return;
    if (!online) {
      void toast(copy.toasts.offline);
      return;
    }
    if (!state.data || !state.data.signedIn) {
      login.prompt("save");
      return;
    }
    const next = !on;
    const prev = state.data;
    setPending(true);
    const optimistic: PlaceUserState = { ...prev, favorite: next };
    client.setQueryData(placeUserStateKey(placeId), optimistic);
    try {
      const result = await setFavoriteAction({ placeId, placeUrl, on: next });
      if (result.ok) {
        const text = result.on
          ? copy.toasts.favoriteOn
          : copy.toasts.favoriteOff;
        setMessage(text);
        void toast(text);
        if (result.on) {
          track({
            name: "favorite_added",
            properties: { place_id: placeId, source: "detail" },
          });
        }
        return;
      }
      client.setQueryData(placeUserStateKey(placeId), prev);
      if (result.error === "unauthenticated") {
        login.prompt("save");
        return;
      }
      const text =
        result.error === "blocked"
          ? copy.toasts.favoriteBlocked
          : result.error === "limit"
            ? copy.toasts.favoriteLimit
            : copy.toasts.favoriteFailed;
      setMessage(text);
      void toast(text);
    } catch {
      client.setQueryData(placeUserStateKey(placeId), prev);
      setMessage(copy.toasts.favoriteFailed);
      void toast(copy.toasts.favoriteFailed);
    } finally {
      setPending(false);
    }
  }, [client, login, on, online, pending, placeId, placeUrl, state.data]);

  return {
    on,
    signedIn,
    loading: state.isPending,
    pending,
    /** sr-only status로 알릴 마지막 결과 */
    message,
    toggle,
    /** 로그인 유도 시트. 화면 어딘가에 그려 둔다 */
    loginSheet: login.sheet,
  };
}

export function useDirections(args: {
  placeId: string;
  placeUrl: string;
  name: string | null;
  position: LatLng | null;
  origin: DirectionsOrigin | null;
  meal: Meal;
  source: DirectionsSource;
  /** 로그인 상태면 true. 모르면 저장을 시도한다(서버가 비로그인이면 저장하지 않음) */
  signedIn: boolean | null;
  online: boolean;
  onLaunched?: (result: DirectionsResult) => void;
}) {
  const [opening, setOpening] = useState(false);
  const available = args.name !== null && args.position !== null;

  const open = useCallback(() => {
    if (!args.name || !args.position || opening) return;
    if (args.online && args.signedIn !== false) {
      void saveVisitAction({
        placeId: args.placeId,
        placeUrl: args.placeUrl,
        meal: args.meal,
        source: args.source,
      }).catch(() => undefined);
    }
    setOpening(true);
    const appname = naverAppName(siteUrl());
    void launchDirections(
      {
        destination: { name: args.name, position: args.position },
        origin: args.origin,
        appname,
      },
      browserLaunchEnv(),
    ).then((result) => {
      setOpening(false);
      track({
        name: "directions_clicked",
        properties: {
          place_id: args.placeId,
          source: args.source,
          app_or_web: result,
        },
      });
      args.onLaunched?.(result);
    });
  }, [args, opening]);

  return { available, opening, open };
}

/** 카카오맵 place_url 공유 (D-10 안건 6). Web Share, 안 되면 링크 복사 */
export async function sharePlace(name: string | null, placeUrl: string) {
  const title = name ? copy.share.title(name) : copy.openKakaoMap;
  const text = name ? copy.share.text(name) : undefined;
  if (
    typeof navigator !== "undefined" &&
    typeof navigator.share === "function"
  ) {
    try {
      await navigator.share({ title, text, url: placeUrl });
      return;
    } catch (e) {
      // 사용자가 공유 창을 닫았으면 끝
      if (e instanceof DOMException && e.name === "AbortError") return;
    }
  }
  try {
    await navigator.clipboard.writeText(placeUrl);
    void toast(copy.toasts.linkCopied);
  } catch {
    void toast(copy.toasts.shareFailed);
  }
}
