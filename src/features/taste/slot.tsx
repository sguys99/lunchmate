"use client";
// 홈 취향 띠 자리 (T9.17, D-39). 홈 첫 로드에는 이 작은 껍데기만 들어가고, 띠와 시트 본체(taste-band.tsx)는 React.lazy로 받는다.
// 받는 동안은 아무것도 그리지 않는다(피드백 띠 뼈대가 이미 그 자리를 잡고 있다가 비켜 준다).
import { lazy, Suspense } from "react";

const TasteBand = lazy(() => import("./taste-band"));

export function TasteBandSlot({ className }: { className?: string }) {
  return (
    <Suspense fallback={null}>
      <TasteBand className={className} />
    </Suspense>
  );
}
