// 관리자 화면 시안 목업 (T8.5a). 닉네임, 식당 이름, 후기 글은 모두 지어낸 값이다.
// 카카오 장소 값은 place_id와 place_url만 DB에 있다(T0.16). placeName은 "관리자 브라우저 세션에서 이름을 찾았을 때"만
// 채워지는 값을 흉내 낸 것이고, null이면 화면은 장소 번호 + 카카오맵 링크로만 보인다(T5.12a 순서의 마지막 단계).
// 신고는 공개 후기에만 들어온다(review_reports_before_insert). privateNow는 신고 뒤 작성자가 나만 보기로 바꾼 경우다.

export type ReportReason =
  "spam" | "abuse" | "privacy" | "false" | "other" | "ad_false";

export type AdminAuthor = {
  id: string;
  nickname: string;
  provider: "kakao" | "naver" | "google";
  joined: string;
  reportsReceived: number;
  hiddenCount: number;
  status: "active" | "suspended";
  suspendedUntil?: string | null;
};

export type ReportedItem = {
  id: string;
  targetType: "review" | "deal";
  placeId: string;
  placeName: string | null;
  /** 후기 글 또는 할인 내용. null이면 글 없는 후기 */
  body: string | null;
  rating?: "up" | "down";
  privateNow?: boolean;
  /** 사유별 신고 수(1인 1회라 합이 신고자 수) */
  reasons: Partial<Record<ReportReason, number>>;
  notes: readonly string[];
  /** 신고 3건 자동 숨김(hidden_reason = reports) */
  autoHidden: boolean;
  writtenAt: string;
  firstReportedAt: string;
  /** 정렬용 분(작을수록 오래됨) */
  order: number;
  authorId: string;
};

export type ClosureItem = {
  id: string;
  placeId: string;
  placeName: string | null;
  gone: number;
  moved: number;
  today: number;
  lastReportedAt: string;
  order: number;
};

export type LogAction =
  | "hide"
  | "restore"
  | "closedConfirm"
  | "closedDismiss"
  | "suspend"
  | "unsuspend"
  | "autoHide";

export type LogEntry = {
  id: string;
  at: string;
  action: LogAction;
  target: string;
  reason: string | null;
  by: string | null;
  undone?: boolean;
  /** 되돌릴 때 목록에 되살릴 항목 id */
  itemId?: string;
};

export const ADMIN_NICK = "운영자";

export const AUTHORS: readonly AdminAuthor[] = [
  {
    id: "u1",
    nickname: "맛집탐험가",
    provider: "kakao",
    joined: "10월 30일",
    reportsReceived: 7,
    hiddenCount: 2,
    status: "active",
  },
  {
    id: "u2",
    nickname: "점심요정",
    provider: "naver",
    joined: "10월 31일",
    reportsReceived: 3,
    hiddenCount: 0,
    status: "active",
  },
  {
    id: "u3",
    nickname: "test_새싹",
    provider: "kakao",
    joined: "11월 1일",
    reportsReceived: 2,
    hiddenCount: 0,
    status: "active",
  },
  {
    id: "u4",
    nickname: "국밥러버",
    provider: "google",
    joined: "10월 29일",
    reportsReceived: 1,
    hiddenCount: 0,
    status: "active",
  },
  {
    id: "u5",
    nickname: "할인알림봇",
    provider: "kakao",
    joined: "11월 1일",
    reportsReceived: 9,
    hiddenCount: 3,
    status: "active",
  },
  {
    id: "u6",
    nickname: "조용한점심",
    provider: "naver",
    joined: "10월 28일",
    reportsReceived: 4,
    hiddenCount: 2,
    status: "suspended",
    suspendedUntil: "11월 8일",
  },
  {
    id: "u7",
    nickname: "매운맛",
    provider: "kakao",
    joined: "10월 30일",
    reportsReceived: 0,
    hiddenCount: 0,
    status: "active",
  },
];

export function authorOf(id: string): AdminAuthor {
  return AUTHORS.find((a) => a.id === id) ?? AUTHORS[0]!;
}

export const REPORTED: readonly ReportedItem[] = [
  {
    id: "r1",
    targetType: "review",
    placeId: "1840235701",
    placeName: "정담국밥",
    body: "여기 말고 길 건너 OO국밥 가세요. 쿠폰 드려요 오픈채팅 검색",
    rating: "down",
    reasons: { spam: 3, false: 1 },
    notes: [],
    autoHidden: true,
    writtenAt: "11월 1일 11:52",
    firstReportedAt: "11월 1일 12:10",
    order: 1,
    authorId: "u5",
  },
  {
    id: "r2",
    targetType: "review",
    placeId: "27531844",
    placeName: null,
    body: "사장님이 불친절하고 직원 이름이 김OO인데 태도가 최악입니다",
    rating: "down",
    reasons: { privacy: 2, abuse: 1 },
    notes: [],
    autoHidden: true,
    writtenAt: "10월 31일 13:05",
    firstReportedAt: "10월 31일 18:40",
    order: 2,
    authorId: "u1",
  },
  {
    id: "r3",
    targetType: "deal",
    placeId: "1027761113",
    placeName: "골목분식 두리",
    body: "전 메뉴 90% 할인, 링크 들어가서 쿠폰 받으세요",
    reasons: { ad_false: 3 },
    notes: [],
    autoHidden: true,
    writtenAt: "11월 1일 09:30",
    firstReportedAt: "11월 1일 10:02",
    order: 3,
    authorId: "u5",
  },
  {
    id: "r4",
    targetType: "review",
    placeId: "954120387",
    placeName: null,
    body: null,
    rating: "down",
    privateNow: true,
    reasons: { abuse: 2, other: 1 },
    notes: ["같은 사람이 여러 번 쓴 것 같습니다"],
    autoHidden: true,
    writtenAt: "10월 30일 12:41",
    firstReportedAt: "10월 31일 08:15",
    order: 4,
    authorId: "u1",
  },
  {
    id: "r5",
    targetType: "review",
    placeId: "1840235701",
    placeName: "정담국밥",
    body: "국물이 예전보다 싱거워졌어요. 그래도 15분 안에 나옵니다",
    rating: "up",
    reasons: { false: 2 },
    notes: [],
    autoHidden: false,
    writtenAt: "11월 1일 12:58",
    firstReportedAt: "11월 1일 13:20",
    order: 5,
    authorId: "u2",
  },
  {
    id: "r6",
    targetType: "review",
    placeId: "16610425",
    placeName: "소반 한식뷔페",
    body: "가격 대비 반찬 가짓수가 적고 사장님이 바쁘면 퉁명스러움",
    rating: "down",
    reasons: { abuse: 1 },
    notes: [],
    autoHidden: false,
    writtenAt: "11월 1일 13:30",
    firstReportedAt: "11월 1일 14:02",
    order: 6,
    authorId: "u3",
  },
  {
    id: "r7",
    targetType: "review",
    placeId: "27531844",
    placeName: null,
    body: "혼밥하기 좋고 조용합니다",
    rating: "up",
    reasons: { other: 1 },
    notes: ["사장님 가족이 쓴 글 같아요"],
    autoHidden: false,
    writtenAt: "11월 1일 14:10",
    firstReportedAt: "11월 1일 14:30",
    order: 7,
    authorId: "u4",
  },
];

export const CLOSURES: readonly ClosureItem[] = [
  {
    id: "c1",
    placeId: "8820154",
    placeName: "카레공방",
    gone: 3,
    moved: 1,
    today: 0,
    lastReportedAt: "11월 1일 12:20",
    order: 1,
  },
  {
    id: "c2",
    placeId: "1145020",
    placeName: null,
    gone: 1,
    moved: 2,
    today: 1,
    lastReportedAt: "10월 31일 19:02",
    order: 2,
  },
  {
    id: "c3",
    placeId: "2290413",
    placeName: "면옥 수라",
    gone: 1,
    moved: 0,
    today: 4,
    lastReportedAt: "11월 1일 11:40",
    order: 3,
  },
];

/** 폐업 수: 오늘만 쉬어요는 세지 않는다 */
export function closedCount(c: ClosureItem): number {
  return c.gone + c.moved;
}

export const LOG: readonly LogEntry[] = [
  {
    id: "l1",
    at: "11월 1일 12:10",
    action: "autoHide",
    target: "후기, 정담국밥",
    reason: "광고, 스팸",
    by: null,
  },
  {
    id: "l2",
    at: "11월 1일 11:02",
    action: "hide",
    target: "후기, 장소 27531844",
    reason: "욕설, 비방",
    by: ADMIN_NICK,
  },
  {
    id: "l3",
    at: "11월 1일 10:48",
    action: "restore",
    target: "후기, 소반 한식뷔페",
    reason: null,
    by: ADMIN_NICK,
  },
  {
    id: "l4",
    at: "11월 1일 09:15",
    action: "suspend",
    target: "조용한점심",
    reason: "신고 누적, 7일",
    by: ADMIN_NICK,
  },
  {
    id: "l5",
    at: "10월 31일 18:30",
    action: "closedDismiss",
    target: "장소 5512087",
    reason: null,
    by: ADMIN_NICK,
  },
];

/** 가장 많이 받은 사유. 숨김 사유 기본값 */
export function topReason(item: ReportedItem): ReportReason {
  let best: ReportReason = item.targetType === "deal" ? "ad_false" : "other";
  let max = -1;
  for (const [k, v] of Object.entries(item.reasons) as [
    ReportReason,
    number,
  ][]) {
    if (v > max) {
      best = k;
      max = v;
    }
  }
  return best;
}

export function reportTotal(item: ReportedItem): number {
  return Object.values(item.reasons).reduce((s, n) => s + (n ?? 0), 0);
}

export const REVIEW_REASONS: readonly ReportReason[] = [
  "spam",
  "abuse",
  "privacy",
  "false",
  "other",
];
export const DEAL_REASONS: readonly ReportReason[] = [
  "ad_false",
  "abuse",
  "privacy",
  "other",
];

/** 검토 큐 순서: 자동 숨김 먼저, 그다음 신고 수 많은 순, 같으면 오래된 순 */
export function sortQueue(items: readonly ReportedItem[]): ReportedItem[] {
  return [...items].sort(
    (a, b) =>
      Number(b.autoHidden) - Number(a.autoHidden) ||
      reportTotal(b) - reportTotal(a) ||
      a.order - b.order,
  );
}

export function placeUrl(placeId: string): string {
  return `https://place.map.kakao.com/${placeId}`;
}
