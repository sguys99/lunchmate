"use client";
// 오늘(홈) 카드 길찾기 (T5.20 REC-08, NAV-01~04). 상세와 같은 흐름(features/place/directions-flow.ts)을 쓴다.
// 흐름 묶음(서버 액션 참조, 네이버 URL, 앱 감지)은 홈 첫 로드 밖이다. 카드가 보이면 바로 받아 두고(preloadDirections),
// 누를 때 받아 둔 함수를 탭 안에서 동기로 부른다. 아직 못 받았으면 받은 뒤 부른다(브라우저의 사용자 동작 유효 시간 안).
// 출발지는 지금 기준 위치(사무실 핀 또는 현위치). 현위치 좌표는 네이버 URL에도 넣지 않는다(directions.ts가 거른다).
import { useCallback, useRef, useState } from "react";
import type { DirectionsOrigin } from "@/lib/naver/directions";
import type { Meal } from "@/lib/time";
import type { TodayCard } from "./card-model";

type Flow = typeof import("@/features/place/directions-flow");

let flow: Flow | null = null;
let loading: Promise<Flow> | null = null;

/** 길찾기 흐름 묶음을 미리 받는다. 실패하면 다음 호출 때 다시 시도한다 */
export function preloadDirections(): Promise<Flow> {
  if (flow) return Promise.resolve(flow);
  loading ??= import("@/features/place/directions-flow").then(
    (m) => {
      flow = m;
      return m;
    },
    (e: unknown) => {
      loading = null;
      throw e;
    },
  );
  return loading;
}

export function useCardDirections(ctx: {
  meal: Meal;
  /** 렌더마다 새 객체가 되지 않게 useMemo로 만든 값 */
  origin: DirectionsOrigin | null;
  signedIn: boolean;
  online: boolean;
}) {
  const [opening, setOpening] = useState(false);
  const busy = useRef(false);
  const { meal, origin, signedIn, online } = ctx;

  const open = useCallback(
    (card: TodayCard) => {
      if (busy.current) return;
      busy.current = true;
      setOpening(true);
      const run = (m: Flow) =>
        m.startDirections({
          placeId: card.id,
          placeUrl: card.placeUrl,
          name: card.name,
          position: card.position,
          origin,
          meal,
          source: "rec",
          signedIn,
          online,
        });
      const done = () => {
        busy.current = false;
        setOpening(false);
      };
      (flow ? run(flow) : preloadDirections().then(run)).then(done, done);
    },
    [meal, origin, signedIn, online],
  );

  return { open, opening };
}
