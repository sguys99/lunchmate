// 온보딩 시안 쿼리 (T4.1). 서버와 클라이언트 양쪽에서 쓰는 순수 함수.
//   ?step=1|2|3|done          캡처용 단계 바로가기. 2단계 이후는 핀을 놓은 상태로 시작한다
//   ?state=loading|empty|error|offline   4상태 (scripts/shots.mjs 규약)
//   ?perm=denied              위치 권한 거부 (AC-ONB-2). 현위치 대신 검색 안내가 처음부터 보인다
//   ?pin=placed               1단계를 핀을 놓은 상태로 연다
import {
  parseDesignState,
  type DesignState,
  type DesignStateSearchParams,
} from "@/features/design-lab/mock";

export type OnboardingStep = 1 | 2 | 3 | "done";

export type OnboardingParams = {
  step: OnboardingStep;
  state: DesignState;
  permDenied: boolean;
  pinPlaced: boolean;
};

function first(searchParams: DesignStateSearchParams, key: string) {
  if (!searchParams) return undefined;
  const raw =
    searchParams instanceof URLSearchParams
      ? searchParams.get(key)
      : searchParams[key];
  const value = typeof raw === "string" ? raw : raw?.[0];
  return value?.trim().toLowerCase();
}

export function parseOnboardingParams(
  searchParams: DesignStateSearchParams,
): OnboardingParams {
  const rawStep = first(searchParams, "step");
  const step: OnboardingStep =
    rawStep === "2" ? 2 : rawStep === "3" ? 3 : rawStep === "done" ? "done" : 1;
  return {
    step,
    state: parseDesignState(searchParams),
    permDenied: first(searchParams, "perm") === "denied",
    pinPlaced: step !== 1 || first(searchParams, "pin") === "placed",
  };
}
