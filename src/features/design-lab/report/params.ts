// 제보와 신고 입력 시안 쿼리 (T6.3): /design-lab/report/<a|b|c>?...
//   flow=deal|deal-check|wait|place|review-report   어느 입력을 열어 둘지. 없으면 상세만(진입점 확인)
//   phase=form|dup|done|ended|cooldown              흐름 안 단계
//     deal: form(기본), dup(같은 유형 제보가 이미 있음, DEAL-04 병합), done(보낸 뒤)
//     deal-check: form(누르기 전), done(아직 해요 누른 뒤), ended(끝났어요 누른 뒤)
//     wait: form(누르기 전), done(방금 누름), cooldown(30분 1회 제한 중에 다시 연 상태)
//     place, review-report: form, done
//   error=limit|banned-word   하루 한도(MOD-05, DEAL-04) / 금칙어 거절(MOD-04)
//   state=ready|loading|empty|error|offline   4상태 (error는 보내기 실패, empty는 할인과 웨이팅 제보 0건)
//   kind=closed|price|wrong   flow=place의 제보 종류 (더 보기 메뉴에서 고른 것)
//   target=review|deal        flow=review-report의 신고 대상. deal이면 사유에 "광고성, 허위" (DEAL-04)
//   step=1..4                 C안 질문 단계
//   menu=open                 하단 더 보기 메뉴를 연 채로
import { parseDesignState, type DesignState } from "@/features/design-lab/mock";

export const REPORT_FLOWS = [
  "none",
  "deal",
  "deal-check",
  "wait",
  "place",
  "review-report",
] as const;
export type ReportFlow = (typeof REPORT_FLOWS)[number];

export const REPORT_PHASES = [
  "form",
  "dup",
  "done",
  "ended",
  "cooldown",
] as const;
export type ReportPhase = (typeof REPORT_PHASES)[number];

export type PlaceReportKind = "closed" | "price" | "wrong";

export type ReportParams = {
  state: DesignState;
  flow: ReportFlow;
  phase: ReportPhase;
  error: "limit" | "banned-word" | null;
  kind: PlaceReportKind;
  target: "review" | "deal";
  step: number;
  menu: boolean;
};

type Raw = Readonly<Record<string, string | readonly string[] | undefined>>;

function first(raw: Raw, key: string): string | undefined {
  const v = raw[key];
  const s = typeof v === "string" ? v : v?.[0];
  return s?.trim().toLowerCase();
}

function oneOf<T extends string>(
  list: readonly T[],
  value: string | undefined,
  fallback: T,
): T {
  return value && (list as readonly string[]).includes(value)
    ? (value as T)
    : fallback;
}

export function parseReportParams(raw: Raw): ReportParams {
  const error = first(raw, "error");
  const step = Number.parseInt(first(raw, "step") ?? "", 10);
  return {
    state: parseDesignState(raw),
    flow: oneOf(REPORT_FLOWS, first(raw, "flow"), "none"),
    phase: oneOf(REPORT_PHASES, first(raw, "phase"), "form"),
    error: error === "limit" || error === "banned-word" ? error : null,
    kind: oneOf(["closed", "price", "wrong"], first(raw, "kind"), "closed"),
    target: first(raw, "target") === "deal" ? "deal" : "review",
    step: Number.isFinite(step) ? Math.min(4, Math.max(1, step)) : 1,
    menu: first(raw, "menu") === "open",
  };
}
