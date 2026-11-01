"use client";
// 투표 만들기 시트 자리를 비동기로 마운트한다(T7.11). 서버 페이지와 레이아웃(지도 탭, 투표 탭과 회식)이 둔다.
// 자리 코드도 첫 로드 밖이다. 시트 본체는 openPollCreate 뒤에 다시 따로 받는다(host.tsx).
import { lazy, Suspense } from "react";

const PollCreateHost = lazy(() => import("./host"));

export function PollCreateHostSlot() {
  return (
    <Suspense fallback={null}>
      <PollCreateHost />
    </Suspense>
  );
}
