"use client";
// 루트 오류 경계 (T2.18, APP-06). 랜딩, 약관처럼 앱 셸 밖 화면과, (app) 레이아웃 자체가 깨진 경우를 받는다.
// 셸이 깨졌을 수 있으므로 오늘 추천 버튼은 /today가 아니라 랜딩(/)으로 보낸다.
// Next 16: retry()는 세그먼트를 다시 받아 그린다. reset()은 다시 받지 않고 상태만 지워 쓰지 않는다.
import { ErrorScreen } from "@/components/states/error-screen";
import { StandaloneFrame } from "@/components/states/screens";

export default function RootError({
  error,
  retry,
}: {
  error: unknown;
  retry: () => void;
}) {
  return (
    <StandaloneFrame>
      <ErrorScreen error={error} onRetry={retry} homeHref="/" />
    </StandaloneFrame>
  );
}
