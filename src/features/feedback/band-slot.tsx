"use client";
// 홈 어제 피드백 띠 자리 (T6.8, FB-01, D-05 D1). 오늘(홈) 첫 로드에 들어가는 유일한 피드백 코드라 아주 작게 둔다.
// - 비로그인, 오프라인이면 아무것도 그리지 않는다(DESIGN.md 5장: 오프라인은 띠를 숨김).
// - 띠 본체(내 방문 쿼리, 이름 해석, 서버 액션, 시트 진입점)는 React.lazy로 따로 받는다. 받는 동안은 같은 높이(64)의
//   빈 띠 틀(위아래 헤어라인)만 두고, 막대 뼈대는 본체가 그린다(홈 첫 로드 예산, bundle-log 2026-11-01).
// - 띠 데이터는 추천과 따로 온다. 실패하면 띠만 숨기고 추천은 그대로다(AC-FB-1).
import { lazy, Suspense } from "react";
import type { LatLng } from "@/lib/map/types";

const FeedbackBand = lazy(() => import("./feedback-band"));

export type FeedbackBandProps = {
  now: Date;
  /** 이름 해석 기준점(사무실 핀 또는 현위치). 화면 메모리 값, 저장하지 않는다 */
  anchor: LatLng | null;
  /** 기준점을 찾는 중이면 이름 해석을 기다린다 */
  anchorPending: boolean;
  /** 이 탭에서 오늘 길찾기를 눌렀는가(D-11 안건 2) */
  directedToday: boolean;
};

export function FeedbackBandSlot({
  signedIn,
  online,
  className,
  ...props
}: FeedbackBandProps & {
  signedIn: boolean;
  online: boolean;
  className?: string;
}) {
  if (!signedIn || !online) return null;
  return (
    <Suspense
      fallback={
        <div className={className}>
          <div aria-hidden className="min-h-16 border-y border-border" />
        </div>
      }
    >
      <FeedbackBand {...props} className={className} />
    </Suspense>
  );
}
