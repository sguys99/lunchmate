// 디자인 랩 시스템 비교 화면 계약 (T1.11~T1.14). 시안 화면 컴포넌트는 이 타입만 의존한다.
// G1 확정(D-01, 시안 B) 후 미선택 시안 A, C 코드는 지웠다(T1.20). 3단계 G3 홈 시안은 DESIGN_IDS에 id를 더해 이 하네스를 재사용한다.
import type { DesignState } from "@/features/design-lab/mock";
import type { DesignFrontmatter } from "@/lib/design/schema";

export const DESIGN_IDS = ["b"] as const;
export type DesignId = (typeof DESIGN_IDS)[number];

/** home: 오늘 추천 카드 3장 + 하단 탭 (T1.11), sheet: 바텀시트 식당 상세 + 득표 바 (T1.12) */
export const DESIGN_SCREEN_IDS = ["home", "sheet"] as const;
export type DesignScreenId = (typeof DESIGN_SCREEN_IDS)[number];

export function isDesignId(value: unknown): value is DesignId {
  return (DESIGN_IDS as readonly unknown[]).includes(value);
}

export function isDesignScreenId(value: unknown): value is DesignScreenId {
  return (DESIGN_SCREEN_IDS as readonly unknown[]).includes(value);
}

/**
 * 화면 컴포넌트가 JS에서 쓰는 토큰. 색, 간격, 라운드, 타입은 CSS 변수(Tailwind 유틸리티)로 쓰고,
 * 여기에는 CSS 변수만으로 다루기 어려운 값(Motion spring, easing 배열, 레이아웃 수치)만 담는다.
 * 서버에서 루트 DESIGN.md(확정본)를 파싱해 내려준다(getScreenTokens, tokens.server.ts). 직렬화 가능한 값만 있다.
 * 시안 id와 무관하게 모든 화면이 같은 확정 토큰을 쓴다(T1.20). DESIGN.md를 고치면 화면이 따라 바뀐다(T1.21).
 */
export type DesignScreenTokens = {
  meta: Pick<DesignFrontmatter["meta"], "id" | "name" | "concept" | "mood">;
  motion: DesignFrontmatter["motion"];
  layout: DesignFrontmatter["layout"];
  illustration: DesignFrontmatter["illustration"];
};

export type DesignMotionTokens = DesignScreenTokens["motion"];
export type SpringPreset = keyof DesignMotionTokens["spring"];
export type EasingPreset = keyof DesignMotionTokens["easing"];
export type DurationStep = keyof DesignMotionTokens["duration"];

/** 시안 화면 컴포넌트 props. HomeScreenA, SheetScreenB 등 모두 같은 props를 받는다. */
export type DesignScreenProps = {
  /** 4상태 + 정상. ?state= 쿼리 또는 스위처에서 온다 */
  state: DesignState;
  tokens: DesignScreenTokens;
};

/** 테마: system이면 data-theme을 붙이지 않고 prefers-color-scheme을 따른다 */
export const DESIGN_THEMES = ["system", "light", "dark"] as const;
export type DesignTheme = (typeof DESIGN_THEMES)[number];

/** 보기: 390x844 폰 프레임 / 부모를 꽉 채우는 전체 폭 */
export const SCREEN_VIEWS = ["frame", "full"] as const;
export type ScreenView = (typeof SCREEN_VIEWS)[number];
