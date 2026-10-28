// 스위처 선택값 <-> URL 쿼리 (T1.14). 새로고침과 공유에도 선택이 남게 쿼리에 둔다.
// 쿼리: ?design=b&screen=home&state=ready&theme=system&view=frame (기본값은 생략)
import {
  DESIGN_STATES,
  parseDesignState,
  type DesignState,
  type DesignStateSearchParams,
} from "@/features/design-lab/mock";
import {
  DESIGN_IDS,
  DESIGN_SCREEN_IDS,
  DESIGN_THEMES,
  SCREEN_VIEWS,
  type DesignId,
  type DesignScreenId,
  type DesignTheme,
  type ScreenView,
} from "./types";

export type SwitcherSelection = {
  design: DesignId;
  screen: DesignScreenId;
  state: DesignState;
  theme: DesignTheme;
  view: ScreenView;
};

export const DEFAULT_SELECTION: SwitcherSelection = {
  design: DESIGN_IDS[0],
  screen: "home",
  state: "ready",
  theme: "system",
  view: "frame",
};

function readParam(params: DesignStateSearchParams, key: string) {
  if (!params) return undefined;
  const raw = params instanceof URLSearchParams ? params.get(key) : params[key];
  const first = typeof raw === "string" ? raw : raw?.[0];
  return first?.trim().toLowerCase();
}

function pick<T extends string>(
  options: readonly T[],
  value: string | undefined,
  fallback: T,
): T {
  return value !== undefined && (options as readonly string[]).includes(value)
    ? (value as T)
    : fallback;
}

/** 쿼리 해석. 모르는 값은 기본값으로 */
export function parseSelection(
  params: DesignStateSearchParams,
): SwitcherSelection {
  const d = DEFAULT_SELECTION;
  return {
    design: pick(DESIGN_IDS, readParam(params, "design"), d.design),
    screen: pick(DESIGN_SCREEN_IDS, readParam(params, "screen"), d.screen),
    state: parseDesignState(params),
    theme: pick(DESIGN_THEMES, readParam(params, "theme"), d.theme),
    view: pick(SCREEN_VIEWS, readParam(params, "view"), d.view),
  };
}

/** 선택값 → 쿼리 문자열(앞의 ? 없음). 기본값인 키는 뺀다 */
export function serializeSelection(sel: SwitcherSelection): string {
  const params = new URLSearchParams();
  for (const key of ["design", "screen", "state", "theme", "view"] as const) {
    if (sel[key] !== DEFAULT_SELECTION[key]) params.set(key, sel[key]);
  }
  return params.toString();
}

/** 상태 목록에서 앞뒤로 이동 (끝에서 돌아감) */
export function cycleState(current: DesignState, step: 1 | -1): DesignState {
  const i = DESIGN_STATES.indexOf(current);
  const n = DESIGN_STATES.length;
  return DESIGN_STATES[(i + step + n) % n] ?? current;
}

/** 단독 화면 경로 (캡처용). 상태가 ready가 아니면 ?state=를 붙인다 */
export function standaloneHref(sel: SwitcherSelection): string {
  const base = `/design-lab/system/${sel.design}/${sel.screen}`;
  return sel.state === "ready" ? base : `${base}?state=${sel.state}`;
}
