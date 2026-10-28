// 분석 이벤트 타입(PRD 10.2절). 이벤트 이름과 속성 이름은 PRD 표 그대로 쓴다(CLAUDE.md 7장).
// 좌표와 개인 식별 정보는 이벤트 속성에 넣지 않는다. 타입(금지 키는 never)과 런타임 가드(sanitizeEventProperties)로 두 번 막는다.
// 이 파일은 SDK를 import하지 않는다. 전송은 track.ts가 맡는다.
import { isCoordinateKey, scrubString } from "./scrub";

type Meal = "lunch" | "dinner";
type Provider = "kakao" | "google" | "naver";

/**
 * PRD 10.2절 이벤트별 속성. 값 범위를 PRD가 정한 속성은 리터럴 유니언, 아직 정하지 않은 속성은 string이다.
 * place_id, deal_id는 카카오 장소 ID와 내부 ID라 보내도 된다. 장소명, 주소, 좌표는 보내지 않는다.
 */
export interface AnalyticsEventMap {
  onboarding_step_completed: { step: number; skipped: boolean };
  recommendation_shown: {
    meal: Meal;
    origin: "office" | "current";
    /** 추천 가중치 버전(src/lib/reco/constants.ts). 지표를 알고리즘 버전별로 나눠 보기 위함. */
    algo_version: string;
    place_ids: readonly string[];
  };
  recommendation_reshuffled: { count_in_session: number };
  /** position은 카드 순서(0부터)다. 화면 좌표가 아니다. */
  card_swiped: { position: number };
  directions_clicked: {
    place_id: string;
    source: "rec" | "map" | "poll";
    app_or_web: "app" | "web";
  };
  /** rating: 👍 up, 👎 down, 안 갔어요 not_visited(FB-01, FB-05). */
  feedback_submitted: {
    rating: "up" | "down" | "not_visited";
    has_price: boolean;
    tag_count: number;
    has_review: boolean;
  };
  poll_created: { kind: string; candidate_count: number; quick: boolean };
  poll_link_shared: { channel: "kakao" | "share" | "copy" };
  poll_invite_opened: { in_app_browser: boolean; logged_in: boolean };
  poll_voted: { is_first_vote: boolean };
  poll_closed: { reason: string; participant_count: number };
  party_searched: {
    headcount: number;
    budget: number | null;
    room: boolean;
    alcohol: boolean;
    result_count: number;
  };
  report_submitted: { type: string };
  just_pick_clicked: { meal: Meal; picked_place_id: string };
  /** level: 바로 입장 none, 조금 기다려요 short, 줄 길어요 long(PLACE-07). */
  wait_reported: { place_id: string; level: "none" | "short" | "long" };
  deal_reported: { place_id: string; type: string };
  deal_viewed: {
    place_id: string;
    source: "user" | "owner" | "sponsor";
    screen: string;
  };
  deal_checked: { deal_id: string; answer: string };
  poll_result_shared: { channel: "kakao" | "save" };
  login_started: { provider: Provider; in_app_browser: boolean };
  login_completed: { provider: Provider; in_app_browser: boolean };
  feedback_prompt_shown: { visit_source: "rec" | "poll" | "map" };
  favorite_added: { place_id: string; source: "rec" | "map" | "detail" };
  poll_candidate_added: {
    place_id: string;
    source: "rec" | "map" | "detail" | "party";
  };
}

export type AnalyticsEventName = keyof AnalyticsEventMap;

/**
 * 이벤트 속성에 절대 들어가면 안 되는 키. 좌표(CLAUDE.md 7장 현위치 규칙)와 개인 식별 정보,
 * 카카오 장소 데이터(장소명, 주소, 전화번호)와 비공개 후기 텍스트.
 */
export const FORBIDDEN_PROPERTY_KEYS = [
  // 좌표
  "lat",
  "lng",
  "lon",
  "long",
  "latitude",
  "longitude",
  "x",
  "y",
  "coords",
  "coordinates",
  "geo",
  "geolocation",
  "location",
  "latlng",
  "lnglat",
  "center",
  // 개인 식별 정보
  "email",
  "phone",
  "phone_number",
  "tel",
  "nickname",
  "name",
  "user_name",
  "username",
  "display_name",
  "avatar_url",
  "ip",
  "ip_address",
  // 장소 정보(카카오 데이터 저장, 전송 금지)와 주소
  "address",
  "address_name",
  "road_address",
  "road_address_name",
  "place_name",
  "place_url",
  "category_name",
  // 사용자가 쓴 글
  "review",
  "review_text",
  "memo",
  "text",
] as const;

export type ForbiddenPropertyKey = (typeof FORBIDDEN_PROPERTY_KEYS)[number];

/** 금지 키를 never로 둔 타입. 속성 객체를 변수로 넘겨 초과 속성 검사가 빠지는 경우도 막는다. */
type NoForbiddenKeys = { readonly [K in ForbiddenPropertyKey]?: never };

/** 이벤트 속성 값으로 허용하는 타입. 객체를 허용하지 않아 좌표 객체가 끼어들 틈을 없앤다. */
export type AnalyticsPropertyValue =
  string | number | boolean | null | readonly string[];

export type AnalyticsProperties<N extends AnalyticsEventName> =
  AnalyticsEventMap[N] & NoForbiddenKeys;

/** track()에 넘기는 판별 유니언. name으로 속성 타입이 정해진다. */
export type AnalyticsEvent = {
  [N in AnalyticsEventName]: {
    name: N;
    properties: AnalyticsProperties<N>;
  };
}[AnalyticsEventName];

// 컴파일 타임 보증: PRD 이벤트 정의 자체에 금지 키가 섞이거나 객체 값이 들어오면 타입 오류가 난다.
type AllPropertyKeys = {
  [N in AnalyticsEventName]: keyof AnalyticsEventMap[N];
}[AnalyticsEventName];
type AllPropertyValues = {
  [N in AnalyticsEventName]: AnalyticsEventMap[N][keyof AnalyticsEventMap[N]];
}[AnalyticsEventName];
type Assert<T extends true> = T;
export type _NoForbiddenKeyInMap = Assert<
  Extract<AllPropertyKeys, ForbiddenPropertyKey> extends never ? true : false
>;
export type _OnlyFlatValuesInMap = Assert<
  AllPropertyValues extends AnalyticsPropertyValue ? true : false
>;

const FORBIDDEN_SET: ReadonlySet<string> = new Set(FORBIDDEN_PROPERTY_KEYS);

function isForbiddenKey(key: string): boolean {
  return FORBIDDEN_SET.has(key.toLowerCase()) || isCoordinateKey(key);
}

function isAllowedValue(value: unknown): value is AnalyticsPropertyValue {
  if (value === null) return true;
  const t = typeof value;
  if (t === "string" || t === "boolean") return true;
  if (t === "number") return Number.isFinite(value);
  return Array.isArray(value) && value.every((v) => typeof v === "string");
}

export interface SanitizeResult {
  properties: Record<string, AnalyticsPropertyValue>;
  /** 제거한 키. 개발 모드 경고에 쓴다. */
  dropped: string[];
}

/**
 * 런타임 가드. 타입을 우회해 들어온 금지 키, 객체 값, 숫자가 아닌 수(NaN, Infinity)를 제거하고
 * 문자열 안의 좌표 패턴을 가린다. 입력은 바꾸지 않는다.
 */
export function sanitizeEventProperties(
  properties: Readonly<Record<string, unknown>>,
): SanitizeResult {
  const out: Record<string, AnalyticsPropertyValue> = {};
  const dropped: string[] = [];
  for (const [key, value] of Object.entries(properties)) {
    if (value === undefined) continue;
    if (isForbiddenKey(key) || !isAllowedValue(value)) {
      dropped.push(key);
      continue;
    }
    if (typeof value === "string") out[key] = scrubString(value);
    else if (Array.isArray(value)) out[key] = value.map(scrubString);
    else out[key] = value;
  }
  return { properties: out, dropped };
}
