// 취향 설정 시안 쿼리 (T9.17): /design-lab/taste/<a|b|c>?...
//   view=step|band   step 온보딩의 취향 단계, band 설정을 건너뛴 사용자의 홈(다시 부르기). 기본 step
//   state=ready|loading|empty|error|offline   4상태(pnpm shots --states 규약)
//     step: loading 시트 뼈대, empty 근처 식당 종류를 모름(전체 표시 안내), error 저장 실패, offline 연결 끊김
//     band: 홈 추천 본문의 4상태. 띠는 ready, empty에서만 보인다(오류, 오프라인에서 설정을 권하지 않는다)
//   demo=result      C 캡처용: 세 번을 다 고른 뒤 결과 화면(step), 고른 뒤 고마움 줄(band)
import { parseDesignState, type DesignState } from "@/features/design-lab/mock";

export const TASTE_VIEWS = ["step", "band"] as const;
export type TasteView = (typeof TASTE_VIEWS)[number];

export type TasteParams = {
  view: TasteView;
  state: DesignState;
  result: boolean;
};

type Raw = Readonly<Record<string, string | readonly string[] | undefined>>;

export function parseTasteParams(raw: Raw): TasteParams {
  const v = raw.view;
  const view = (typeof v === "string" ? v : v?.[0])?.trim().toLowerCase();
  return {
    view: (TASTE_VIEWS as readonly string[]).includes(view ?? "")
      ? (view as TasteView)
      : "step",
    state: parseDesignState(raw),
    result:
      (typeof raw.demo === "string" ? raw.demo : raw.demo?.[0]) === "result",
  };
}
