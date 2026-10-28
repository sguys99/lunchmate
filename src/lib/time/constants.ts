/**
 * 시간 규칙 상수. 근거가 되는 PRD 요구사항 ID를 함께 적는다.
 * 모든 시각 판정은 Asia/Seoul 벽시계 기준이다(CLAUDE.md 7장, PRD 시간대 규칙).
 */

export const KST_TIME_ZONE = "Asia/Seoul";

export const MINUTE_MS = 60 * 1000;
export const HOUR_MS = 60 * MINUTE_MS;
export const DAY_MS = 24 * HOUR_MS;

/** REC-01: 00:00~14:59 점심, 15:00~23:59 저녁 (KST). */
export const DINNER_START_HOUR = 15;

/**
 * PLACE-08 "점심 피크 시간대". PRD 3.3절 사용 시간대(점심 피크 11:00~13:30)를 그대로 쓴다.
 * 시작 포함, 끝 미포함: 11:00:00 <= t < 13:30:00 (KST).
 * PRD 3.3절은 "평일"이라고 적었지만 PLACE-08은 시간대만 말하므로 요일은 보지 않는다.
 */
export const LUNCH_PEAK_START_MINUTES = 11 * 60;
export const LUNCH_PEAK_END_MINUTES = 13 * 60 + 30;

/** POLL-11: 마감 후 24시간이 지나면 초대 링크 만료. 기준 시각은 마감 시각(closedAt). */
export const POLL_LINK_TTL_MS = 24 * HOUR_MS;

/** PLACE-07: 웨이팅 제보 30분간 유효. 같은 사용자는 식당당 30분에 1회. */
export const WAIT_REPORT_TTL_MS = 30 * MINUTE_MS;
export const WAIT_REPORT_COOLDOWN_MS = 30 * MINUTE_MS;

/** FB-04: 48시간 지난 방문은 묻지 않음. (주말·공휴일 제외 계산은 PRD 12장 [제안], 미적용) */
export const FEEDBACK_WINDOW_MS = 48 * HOUR_MS;

/** SET-05: "요즘 이게 땡겨요" 7일간 가중치 상향. */
export const CRAVING_TTL_MS = 7 * DAY_MS;

/** DEAL-01: 할인 제보 종료일 기본 7일, 최대 30일 (KST 날짜 단위). */
export const DEAL_DEFAULT_DAYS = 7;
export const DEAL_MAX_DAYS = 30;
