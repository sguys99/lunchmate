"use client";
// 식당 상세 행동 훅 (T5.35 PLACE-04, T5.36~T5.38 NAV-01~04). 길찾기, 즐겨찾기, 공유를 한곳에서 다룬다.
//
// 길찾기 한 번의 흐름(방문 후보 저장, 앱 또는 웹, directions_clicked)은 directions-flow.ts. 홈 카드도 같은 함수를 쓴다(T5.20).
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useCallback, useState } from "react";
import { toast } from "@/components/ui/lazy-toaster";
import { placeCopy } from "@/copy/place";
import { useLoginPrompt } from "@/features/auth/login-prompt";
import { track } from "@/lib/analytics";
import type { DirectionsOrigin } from "@/lib/naver/directions";
import type { LatLng } from "@/lib/map/types";
import type { Meal } from "@/lib/time";
import { placeUserStateAction, setFavoriteAction } from "../actions";
import { startDirections, type DirectionsSource } from "../directions-flow";
import type { DirectionsResult } from "../launch-directions";
import type { PlaceUserState } from "../place-requests";

const copy = placeCopy;

export type { DirectionsSource } from "../directions-flow";

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
  /** favorite_added의 출처. 상세 안이면 detail, 홈 카드 더 보기면 rec (PRD 10.2) */
  source?: "rec" | "map" | "detail";
}) {
  const { placeId, placeUrl, online, source = "detail" } = args;
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
            properties: { place_id: placeId, source },
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
  }, [
    client,
    login,
    on,
    online,
    pending,
    placeId,
    placeUrl,
    source,
    state.data,
  ]);

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
    setOpening(true);
    void startDirections({
      placeId: args.placeId,
      placeUrl: args.placeUrl,
      name: args.name,
      position: args.position,
      origin: args.origin,
      meal: args.meal,
      source: args.source,
      signedIn: args.signedIn,
      online: args.online,
    }).then((result) => {
      setOpening(false);
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
