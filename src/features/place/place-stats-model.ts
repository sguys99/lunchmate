// place_stats, place_reviews, place_deals_list 행을 화면 모델로 (T6.6 함수 → T6.14, T6.20, D-10 상세).
// 순수 함수, React와 네트워크 의존 없음. 브라우저, 서버 공용.
//
// - 생성 타입(types.ts)은 함수 반환 열을 모두 non-null로 적지만 실제로는 null이 온다(LEFT JOIN, 없는 값).
//   그래서 행 입력 타입을 nullable로 받는다.
// - 비공개 후기 글은 이 함수들에 들어오지 않는다(AC-FB-2, DB가 거른다). 작성자 user_id도 없다.
// - 할인은 표시만 한다. 점수에 쓰지 않는다(AC-DEAL-2). deal_count는 카드 배지용.
import type { WaitingLevel } from "@/components/badges/pick-badges";
import { reviewTagLabels } from "@/copy/feedback";
import { isReviewTag, type ReviewTag } from "@/features/feedback/labels";
import type { MyVisit } from "@/features/feedback/feedback-target";
import {
  DEAL_TYPES,
  waitLevelFromDb,
  type DealSlot,
  type DealType,
} from "@/features/report/labels";
import { dateKeyDiff, kstDateKey } from "@/lib/time";
import type {
  PlaceDetailStats,
  PlaceReview,
} from "./detail-model";

type Nullable<T> = { [K in keyof T]: T[K] | null };

/** place_stats 한 행 (DB 열 이름 그대로) */
export type PlaceStatsRow = Nullable<{
  place_id: string;
  price_count: number;
  price_median: number;
  price_points: number[];
  thumbs_up: number;
  thumbs_down: number;
  top_tags: unknown;
  closed_reports: number;
  closed: boolean;
  wait_level: string;
  wait_reported_at: string;
  wait_minutes_ago: number;
  deal_count: number;
}>;

/** 식당 익명 집계. 추천(T6.11, T6.25)과 카드 배지, 상세가 함께 쓴다 */
export type PlaceStats = {
  readonly placeId: string;
  readonly priceCount: number;
  readonly priceMedian: number | null;
  /** 가격 제보 값(원, 오름차순, 익명) */
  readonly pricePoints: readonly number[];
  readonly thumbsUp: number;
  readonly thumbsDown: number;
  /** 태그 상위 5, 많은 순 */
  readonly topTags: readonly { readonly tag: ReviewTag; readonly count: number }[];
  readonly closedReports: number;
  /** 폐업 제보 서로 다른 3명 이상(추천 제외, MOD-03) */
  readonly closed: boolean;
  /** 30분 안의 최신 웨이팅 1건 */
  readonly wait: {
    readonly level: WaitingLevel;
    readonly reportedAt: string;
    readonly minutesAgo: number;
  } | null;
  /** 지금 보이는 할인 수. 표시만, 점수 반영 0 (AC-DEAL-2) */
  readonly dealCount: number;
};

const n = (v: number | null | undefined) =>
  typeof v === "number" && Number.isFinite(v) ? v : 0;

function parseTags(raw: unknown): PlaceStats["topTags"] {
  if (!Array.isArray(raw)) return [];
  return raw.flatMap((item: unknown) => {
    if (typeof item !== "object" || item === null) return [];
    const { tag, count } = item as { tag?: unknown; count?: unknown };
    return typeof tag === "string" && isReviewTag(tag) && typeof count === "number"
      ? [{ tag, count }]
      : [];
  });
}

export function parsePlaceStatsRow(row: PlaceStatsRow): PlaceStats | null {
  if (!row.place_id) return null;
  const level = waitLevelFromDb(row.wait_level);
  return {
    placeId: row.place_id,
    priceCount: n(row.price_count),
    priceMedian: typeof row.price_median === "number" ? row.price_median : null,
    pricePoints: (row.price_points ?? []).filter((p) => Number.isFinite(p)),
    thumbsUp: n(row.thumbs_up),
    thumbsDown: n(row.thumbs_down),
    topTags: parseTags(row.top_tags),
    closedReports: n(row.closed_reports),
    closed: row.closed === true,
    wait:
      level && row.wait_reported_at
        ? {
            level,
            reportedAt: row.wait_reported_at,
            minutesAgo: n(row.wait_minutes_ago),
          }
        : null,
    dealCount: n(row.deal_count),
  };
}

/** 집계가 없는 식당 (요청 id마다 한 행이 오므로 보통은 쓰지 않는다) */
export function emptyPlaceStats(placeId: string): PlaceStats {
  return {
    placeId,
    priceCount: 0,
    priceMedian: null,
    pricePoints: [],
    thumbsUp: 0,
    thumbsDown: 0,
    topTags: [],
    closedReports: 0,
    closed: false,
    wait: null,
    dealCount: 0,
  };
}

/* ---------- 공개 후기 ---------- */

export type PlaceReviewRow = Nullable<{
  id: string;
  nickname: string;
  avatar_url: string;
  visit_month: number;
  rating: string;
  price_krw: number;
  tags: string[];
  body: string;
  is_mine: boolean;
  reported_by_me: boolean;
}>;

/** 공개 후기 한 건(화면용). 상세 PlaceReview에 신고, 내 것 표시와 태그를 더한 것 */
export type PublicReview = PlaceReview & {
  readonly avatarUrl: string | null;
  readonly priceKrw: number | null;
  readonly tags: readonly ReviewTag[];
  readonly isMine: boolean;
  /** 내가 신고한 후기: 나에게는 바로 가리고 "보기"로 연다(D-13 안건 11) */
  readonly reportedByMe: boolean;
};

export function parsePlaceReviewRow(row: PlaceReviewRow): PublicReview | null {
  if (!row.id || !row.body || (row.rating !== "up" && row.rating !== "down"))
    return null;
  return {
    id: row.id,
    nickname: row.nickname ?? "",
    visitMonth: n(row.visit_month),
    thumb: row.rating,
    text: row.body,
    avatarUrl: row.avatar_url,
    priceKrw: typeof row.price_krw === "number" ? row.price_krw : null,
    tags: (row.tags ?? []).filter(isReviewTag),
    isMine: row.is_mine === true,
    reportedByMe: row.reported_by_me === true,
  };
}

/** 공개 후기 목록 상태. 비로그인은 목록 대신 로그인 안내(place_reviews는 로그인만, T6.6 사용자 결정) */
export type PlaceReviewsResult =
  | {
      readonly status: "ok";
      readonly reviews: readonly PublicReview[];
      /** 한 쪽이 꽉 찼으면 더 있을 수 있다 */
      readonly hasMore: boolean;
    }
  | {
      readonly status: "login_required";
      /**
       * 평가를 남긴 사람 수(👍 + 👎, place_stats). 공개 글 수는 비로그인에게 줄 함수가 없어 대신 쓴다.
       * 정확한 공개 글 수가 필요하면 place_stats에 열을 더하는 마이그레이션이 필요하다.
       */
      readonly ratingCount: number;
    };

/* ---------- 할인 ---------- */

export type PlaceDealRow = Nullable<{
  id: string;
  source: string;
  type: string;
  content: string;
  days: number;
  slots: string[];
  starts_on: string;
  ends_on: string;
  created_at: string;
  still_count: number;
  ended_count: number;
  my_answer: string;
  is_mine: boolean;
}>;

export type PlaceDeal = {
  readonly id: string;
  readonly source: "user" | "owner" | "sponsor";
  readonly type: DealType;
  readonly content: string;
  /** 요일 비트(월 1 ... 일 64), 0이면 언제든 */
  readonly days: number;
  readonly slots: readonly DealSlot[];
  readonly startsOn: string;
  readonly endsOn: string;
  readonly createdAt: string;
  readonly stillCount: number;
  readonly endedCount: number;
  readonly myAnswer: "still" | "ended" | null;
  readonly isMine: boolean;
};

const SLOT_SET = new Set<string>(["lunch", "afternoon", "dinner"]);

export function parsePlaceDealRow(row: PlaceDealRow): PlaceDeal | null {
  if (!row.id || !row.content || !row.ends_on || !row.starts_on) return null;
  const type = (DEAL_TYPES as readonly string[]).includes(row.type ?? "")
    ? (row.type as DealType)
    : "other";
  const source =
    row.source === "owner" || row.source === "sponsor" ? row.source : "user";
  return {
    id: row.id,
    source,
    type,
    content: row.content,
    days: n(row.days),
    slots: (row.slots ?? []).filter((s): s is DealSlot => SLOT_SET.has(s)),
    startsOn: row.starts_on,
    endsOn: row.ends_on,
    createdAt: row.created_at ?? "",
    stillCount: n(row.still_count),
    endedCount: n(row.ended_count),
    myAnswer:
      row.my_answer === "still" || row.my_answer === "ended"
        ? row.my_answer
        : null,
    isMine: row.is_mine === true,
  };
}

/* ---------- 상세 모델로 ---------- */

/** "11월 5일" (KST 날짜 키에서) */
export function monthDayLabel(dateKey: string): string {
  const m = /^\d{4}-(\d{2})-(\d{2})$/.exec(dateKey);
  return m ? `${Number(m[1])}월 ${Number(m[2])}일` : "";
}

/**
 * 상세 화면 모델(PlaceDetailStats)로 합친다. EMPTY_PLACE_STATS 대신 이것을 넘기면 된다.
 * - reviews: 공개 후기 상태. 없으면(불러오는 중) [], 실패면 null(상세의 "불러오지 못함").
 *   내 후기와 내가 신고한 후기는 목록에서 뺀다(내 후기는 상세가 따로 보이고, 신고한 후기는 가린다).
 * - myVisits: 이 식당의 내 방문(최신순 아니어도 된다). 가장 최근 것을 "내 방문 기록" 한 줄로.
 */
export function toPlaceDetailStats(input: {
  stats: PlaceStats | null | undefined;
  reviews?: PlaceReviewsResult | null;
  deals?: readonly PlaceDeal[] | null;
  myVisits?: readonly Pick<MyVisit, "visitedOn" | "createdAt" | "status" | "review">[];
  now: Date;
}): PlaceDetailStats {
  const s = input.stats;
  const reviewsResult = input.reviews;
  const reviews: PlaceDetailStats["reviews"] =
    reviewsResult === null
      ? null
      : reviewsResult?.status === "ok"
        ? reviewsResult.reviews.filter((r) => !r.isMine && !r.reportedByMe)
        : [];
  const firstDeal = input.deals?.[0] ?? null;
  const today = kstDateKey(input.now);
  const visits = [...(input.myVisits ?? [])]
    .filter((v) => v.status !== "not_visited")
    .sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt));
  const lastVisit = visits[0] ?? null;
  return {
    priceReports: s?.pricePoints ?? [],
    thumbs: { up: s?.thumbsUp ?? 0, down: s?.thumbsDown ?? 0 },
    tags: (s?.topTags ?? []).map((t) => ({
      label: reviewTagLabels[t.tag],
      count: t.count,
    })),
    reviews,
    reviewTotal: reviews?.length ?? 0,
    waiting: s?.wait
      ? { level: s.wait.level, minutesAgo: s.wait.minutesAgo }
      : null,
    deal: firstDeal
      ? {
          title: firstDeal.content,
          daysAgo: Math.max(
            0,
            firstDeal.createdAt
              ? dateKeyDiff(kstDateKey(new Date(firstDeal.createdAt)), today)
              : 0,
          ),
          untilLabel: monthDayLabel(firstDeal.endsOn) || null,
        }
      : null,
    myVisit: lastVisit
      ? {
          dateLabel: monthDayLabel(lastVisit.visitedOn),
          rating: lastVisit.review?.rating ?? null,
        }
      : null,
  };
}
