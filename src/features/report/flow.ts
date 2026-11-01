// 제보와 신고 화면 흐름의 순수 함수 (T6.15, T6.16, T6.19~T6.22, T6.24, D-13). React, 네트워크 의존 없음(flow.test.ts).
// - 할인 등록 3단계(유형 → 내용 → 확인 카드)와 중복 단계, 확인 카드 "바꾸기"의 종료일, 요일, 시간대.
// - 아직 해요/끝났어요 수(내 답을 바로 반영), 웨이팅 결과 줄 단계(2분 되돌리기 → 30분 제한), 하루 한도.
// - 요청 모양은 report-requests.ts 스키마와 같다(서버가 다시 검사한다). 카카오 값은 place_id, place_url만.
//
// 주의: src/lib/time은 홈 첫 로드 공용 청크에 한 모듈로 합쳐진다. 여기서는 홈이나 상세가 이미 쓰는
// kstDateKey, addKstDays, dateKeyDiff, getKstParts만 쓴다(새 함수를 끌어오면 홈 첫 로드가 는다, bundle-log 11/01).
import type { WaitingLevel } from "@/components/badges/pick-badges";
import { badgeCopy } from "@/copy/badges";
import { placeCopy } from "@/copy/place";
import { reportCopy, reportLabels } from "@/copy/report";
import {
  monthDayLabel,
  type PlaceDeal,
} from "@/features/place/place-stats-model";
import type { DailyLimits } from "@/features/feedback/my-records";
import { addKstDays, dateKeyDiff, getKstParts, kstDateKey } from "@/lib/time";
import {
  DEAL_DAY_BITS,
  DEAL_SLOTS,
  DEAL_WEEKDAYS_MASK,
  REPORT_NOTE_MAX,
  type ClosedDetail,
  type DealReportReason,
  type DealSlot,
  type DealType,
  type InfoField,
  type ReviewReportReason,
} from "./labels";

const copy = reportCopy;

/* ---------- 할인 기간과 요일 ---------- */

/** 종료일 기본 7일, 최대 30일 (DEAL-01, D-13 안건 7) */
export const DEAL_DEFAULT_UNTIL_DAYS = 7;
export const DEAL_UNTIL_MAX_DAYS = 30;
const WEEKEND_MASK = 32 | 64;

/** 오늘(KST)에서 days일 뒤 날짜 키 */
export function endsOnAfter(now: Date, days: number): string {
  return kstDateKey(addKstDays(now, days));
}

/** 날짜 고르기 범위(오늘~30일 뒤) */
export function dealEndRange(now: Date): { min: string; max: string } {
  return { min: kstDateKey(now), max: endsOnAfter(now, DEAL_UNTIL_MAX_DAYS) };
}

/** 종료일이 고를 수 있는 범위 안인지 */
export function isEndsOnInRange(endsOn: string, now: Date): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(endsOn)) return false;
  const diff = dateKeyDiff(kstDateKey(now), endsOn);
  return diff >= 0 && diff <= DEAL_UNTIL_MAX_DAYS;
}

/** 빠른 칩 값(3, 7, 14, 30일)과 같은 종료일이면 그 일수, 아니면 null(직접 고른 날) */
export function untilChipOf(endsOn: string, now: Date): number | null {
  const hit = copy.deal.untilOptions.find(
    (o) => endsOnAfter(now, o.days) === endsOn,
  );
  return hit ? hit.days : null;
}

/** "11월 7일까지", 오늘이면 "오늘까지" */
export function untilText(endsOn: string, now: Date): string {
  if (endsOn === kstDateKey(now)) return copy.deal.untilToday;
  return copy.deal.until(monthDayLabel(endsOn));
}

/** "오늘 제보", "3일 전 제보" */
export function reportedText(createdAt: string, now: Date): string {
  const t = Date.parse(createdAt);
  if (!Number.isFinite(t)) return copy.deal.reportedToday;
  const days = dateKeyDiff(kstDateKey(new Date(t)), kstDateKey(now));
  return days <= 0 ? copy.deal.reportedToday : copy.deal.reportedAgo(days);
}

/** 요일 비트 + 시간대 → "평일 점심", "월, 수 저녁", "주말". 둘 다 없으면 null(언제든) */
export function whenText(
  days: number,
  slots: readonly DealSlot[],
): string | null {
  let day = "";
  if (days === DEAL_WEEKDAYS_MASK) day = copy.deal.weekdays;
  else if (days === WEEKEND_MASK) day = copy.deal.weekend;
  else
    day = DEAL_DAY_BITS.flatMap((bit, i) =>
      (days & bit) !== 0 ? [reportLabels.dealDays[i]] : [],
    ).join(", ");
  const slot = DEAL_SLOTS.filter((s) => slots.includes(s))
    .map((s) => reportLabels.dealSlots[s])
    .join(", ");
  const parts = [day, slot].filter(Boolean);
  return parts.length > 0 ? parts.join(" ") : null;
}

/** 할인 한 줄의 메타: "3일 전 제보, 11월 5일까지" + (있으면) "평일 점심" */
export function dealMeta(
  deal: Pick<PlaceDeal, "createdAt" | "endsOn" | "days" | "slots">,
  now: Date,
): { meta: string; when: string | null } {
  return {
    meta: copy.deal.meta(
      reportedText(deal.createdAt, now),
      untilText(deal.endsOn, now),
    ),
    when: whenText(deal.days, deal.slots),
  };
}

/* ---------- 할인 등록 단계 (D-13 안건 1~3) ---------- */

export type DealStep = "type" | "dup" | "text" | "confirm" | "done";

/**
 * 단계 막대 값. 중복 단계가 없으면 3칸(유형, 내용, 확인), 이번 흐름에서 중복 단계를 거쳤으면 4칸.
 * 완료는 막대 없음(step 0).
 */
export function dealStepProgress(
  step: DealStep,
  withDup: boolean,
): { step: number; total: number } {
  const total = withDup ? 4 : 3;
  const order: DealStep[] = withDup
    ? ["type", "dup", "text", "confirm"]
    : ["type", "text", "confirm"];
  const i = order.indexOf(step);
  return i < 0 ? { step: 0, total: 0 } : { step: i + 1, total };
}

/** 같은 식당, 같은 출처(사용자 제보), 같은 유형의 유효한 제보 (병합 키, D-13 안건 2) */
export function findDuplicate(
  deals: readonly PlaceDeal[],
  type: DealType,
): PlaceDeal | null {
  return deals.find((d) => d.source === "user" && d.type === type) ?? null;
}

/** 유형을 고른 다음 단계: 같은 유형이 있으면 중복 단계, 아니면 내용 */
export function stepAfterType(
  deals: readonly PlaceDeal[],
  type: DealType,
): "dup" | "text" {
  return findDuplicate(deals, type) ? "dup" : "text";
}

export type DealForm = {
  type: DealType | null;
  content: string;
  /** KST 날짜 키 */
  endsOn: string;
  /** 요일 인덱스 월(0)~일(6) */
  dayIndexes: readonly number[];
  slots: readonly DealSlot[];
  /** "다른 내용이라 새로 남기기"를 골랐다 */
  replace: boolean;
};

export function initialDealForm(now: Date): DealForm {
  return {
    type: null,
    content: "",
    endsOn: endsOnAfter(now, DEAL_DEFAULT_UNTIL_DAYS),
    dayIndexes: [],
    slots: [],
    replace: false,
  };
}

export function dealDaysMask(indexes: readonly number[]): number {
  return indexes.reduce((acc, i) => acc | (DEAL_DAY_BITS[i] ?? 0), 0);
}

/** 내용이 다음으로 넘어갈 수 있는지(빈칸, 60자 초과는 안 됨. 금칙어는 서버가 본다) */
export function canSubmitContent(content: string, max: number): boolean {
  const v = content.trim();
  return v.length > 0 && v.length <= max;
}

/** registerDealAction 입력 (report-requests.ts registerDealSchema 모양) */
export function registerDealRequest(
  form: DealForm,
  place: { placeId: string; placeUrl: string | null },
) {
  if (!form.type) return null;
  return {
    placeId: place.placeId,
    placeUrl: place.placeUrl,
    type: form.type,
    content: form.content.trim(),
    endsOn: form.endsOn,
    days: dealDaysMask(form.dayIndexes),
    slots: [...form.slots],
    replace: form.replace || undefined,
  };
}

/* ---------- 아직 해요 / 끝났어요 (DEAL-03) ---------- */

export type DealAnswer = "still" | "ended" | null;

/**
 * 화면에 보일 내 답과 수. 서버 수에는 서버가 아는 내 답이 들어 있으므로 그것을 빼고 지금 답(local)을 더한다.
 * local이 undefined면 서버 값 그대로.
 */
export function dealCounts(
  deal: Pick<PlaceDeal, "stillCount" | "endedCount" | "myAnswer">,
  local: DealAnswer | undefined,
): { answer: DealAnswer; still: number; ended: number } {
  const answer = local === undefined ? deal.myAnswer : local;
  const baseStill = deal.stillCount - (deal.myAnswer === "still" ? 1 : 0);
  const baseEnded = deal.endedCount - (deal.myAnswer === "ended" ? 1 : 0);
  return {
    answer,
    still: Math.max(0, baseStill) + (answer === "still" ? 1 : 0),
    ended: Math.max(0, baseEnded) + (answer === "ended" ? 1 : 0),
  };
}

/** 끝났어요 점 3개에 칠할 수 (3명이면 숨김, AC-DEAL-3) */
export function endedDots(ended: number): number {
  return Math.min(3, Math.max(0, ended));
}

/* ---------- 웨이팅 (PLACE-07, D-13 안건 8) ---------- */

export type MyWait =
  /** 방금 내가 알린 제보. undoUntil까지 취소, retryAt까지 다시 못 알림 */
  | {
      kind: "sent";
      level: WaitingLevel;
      reportId: string;
      reportedAt: string;
      undoUntil: string;
      retryAt: string;
    }
  /** 서버가 30분 제한이라고 답함(다른 화면에서 알렸음) */
  | { kind: "cooldown"; retryAt: string };

export type WaitPhase = "idle" | "undo" | "cooldown";

export function waitPhase(mine: MyWait | null, now: Date): WaitPhase {
  if (!mine) return "idle";
  const t = now.getTime();
  if (mine.kind === "sent" && t < Date.parse(mine.undoUntil)) return "undo";
  if (t < Date.parse(mine.retryAt)) return "cooldown";
  return "idle";
}

/** 다음 단계가 바뀔 때까지 남은 ms(타이머용). 바뀔 일이 없으면 null */
export function msToNextWaitPhase(
  mine: MyWait | null,
  now: Date,
): number | null {
  const phase = waitPhase(mine, now);
  if (!mine || phase === "idle") return null;
  const until =
    phase === "undo" && mine.kind === "sent"
      ? Date.parse(mine.undoUntil)
      : Date.parse(mine.retryAt);
  return Math.max(0, until - now.getTime());
}

/** "12시 24분" (KST) */
export function clockText(iso: string): string {
  const p = getKstParts(new Date(iso));
  return copy.wait.clock(p.hour, p.minute);
}

/** wait_reported 이벤트 단계 (PRD 10.2: 바로 입장은 none) */
export function waitEventLevel(level: WaitingLevel): "none" | "short" | "long" {
  return level === "walkIn" ? "none" : level;
}

/* ---------- 하루 한도 (MOD-05, DEAL-04, D-13 안건 12) ---------- */

export type LimitState =
  | { kind: "unknown" }
  | { kind: "signedOut" }
  | { kind: "blocked" }
  | { kind: "open"; remaining: number };

/** 열 때 한도. 남은 수가 이 값 이하이면 "오늘 N건 더" 한 줄을 보인다 */
export const LIMIT_WARN_AT = 3;

export function limitState(
  result:
    { signedIn: false } | { signedIn: true; limits: DailyLimits } | undefined,
  bucket: "reports" | "deals",
): LimitState {
  if (!result) return { kind: "unknown" };
  if (!result.signedIn) return { kind: "signedOut" };
  const r = result.limits[bucket].remaining;
  return r <= 0 ? { kind: "blocked" } : { kind: "open", remaining: r };
}

/* ---------- 식당 정보 제보 (PLACE-05) ---------- */

/** 상세 메뉴의 제보 종류(place-detail ReportKind)와 DB 종류 */
export type PlaceKindInput = "closed" | "price" | "wrong";
export function placeKindToDb(
  kind: PlaceKindInput,
): "closed" | "price" | "info" {
  return kind === "wrong" ? "info" : kind;
}

export const PRICE_MIN = 1000;
export const PRICE_MAX = 100000;

/** 가격 칸 글자 → 원. 비었으면 null, 범위 밖이거나 숫자가 아니면 NaN */
export function parsePrice(text: string): number | null {
  const digits = text.replace(/[^0-9]/g, "");
  if (digits === "") return null;
  const n = Number(digits);
  return n >= PRICE_MIN && n <= PRICE_MAX ? n : Number.NaN;
}

export type PlaceDetailInput = {
  closed: ClosedDetail | null;
  price: string;
  fields: readonly InfoField[];
};

export function hasPlaceDetail(
  kind: "closed" | "price" | "info",
  d: PlaceDetailInput,
): boolean {
  if (kind === "closed") return d.closed !== null;
  if (kind === "price") return parsePrice(d.price) !== null;
  return d.fields.length > 0;
}

/** 보낼 수 있는지(가격을 적었으면 범위 안이어야 한다) */
export function placeDetailValid(
  kind: "closed" | "price" | "info",
  d: PlaceDetailInput,
): boolean {
  if (kind !== "price") return true;
  const p = parsePrice(d.price);
  return p === null || Number.isFinite(p);
}

/** reportPlaceAction 입력 (세부는 모두 선택) */
export function placeReportRequest(
  kind: "closed" | "price" | "info",
  d: PlaceDetailInput,
  place: { placeId: string; placeUrl: string | null },
) {
  const base = { placeId: place.placeId, placeUrl: place.placeUrl };
  if (kind === "closed")
    return { ...base, kind, ...(d.closed ? { closed: d.closed } : {}) };
  if (kind === "price") {
    const p = parsePrice(d.price);
    return {
      ...base,
      kind,
      ...(p !== null && Number.isFinite(p) ? { priceKrw: p } : {}),
    };
  }
  return {
    ...base,
    kind,
    ...(d.fields.length ? { fields: [...d.fields] } : {}),
  };
}

/* ---------- 신고 (MOD-01, DEAL-04) ---------- */

export type FlagTarget = "review" | "deal";
export type FlagReason = ReviewReportReason | DealReportReason;

/** 기타 글은 사유가 기타일 때만, 빈 글은 보내지 않는다 */
export function flagNote(reason: FlagReason, note: string): string | null {
  if (reason !== "other") return null;
  const v = note.trim().slice(0, REPORT_NOTE_MAX);
  return v === "" ? null : v;
}

/** report_submitted 이벤트 type (PRD 10.2, 글 없음) */
export function reportEventType(
  target: FlagTarget | "closed" | "price" | "info",
): string {
  return target === "review" || target === "deal" ? target : `place_${target}`;
}

/* ---------- 상세 "지금" 행 요약 ---------- */

/** 웨이팅, 아니면 할인 수, 아니면 없음 */
export function nowSummaryText(
  waiting: { level: WaitingLevel; minutesAgo: number } | null,
  dealCount: number,
): string {
  if (waiting)
    return badgeCopy.waitingReport(
      waiting.minutesAgo,
      badgeCopy.waitingLevels[waiting.level],
    );
  if (dealCount > 0) return copy.deal.summaryCount(dealCount);
  return placeCopy.now.waitingNone;
}
