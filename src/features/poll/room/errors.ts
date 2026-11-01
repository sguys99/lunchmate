// 투표방 쓰기 오류 → 화면 코드 (T7.15~T7.22). 이름(message)은 20261101140000_t7_6_polls.sql의 raise 값이다.
// 원문 message와 hint는 화면에 보내지 않는다. 문구는 src/copy/poll.ts. 순수 함수, 브라우저와 서버 공용.
import type { PgErrorLike } from "@/lib/supabase/db-errors";

export type PollErrorCode =
  | "unauthenticated"
  | "not_found"
  | "not_member"
  | "not_host"
  /** 진행 중이 아니라 할 수 없음(마감, 동점 대기, 취소). 화면은 다시 불러온다 */
  | "closed"
  | "expired"
  | "full"
  /** 후보 5곳이 다 참 */
  | "candidates_full"
  /** 이미 후보에 있음 */
  | "exists"
  /** 한 사람 제안 대기 3곳 */
  | "suggestions_full"
  /** 승인 후보를 2곳 아래로 줄일 수 없음 */
  | "candidates_min"
  /** 동점 후보가 아님 */
  | "not_tied"
  /** 기피 확인 하루 10번 */
  | "avoid_limit"
  | "invalid"
  | "save";

export type PollFailure = { ok: false; error: PollErrorCode };
export type PollResult<T extends object = object> =
  ({ ok: true } & T) | PollFailure;

const TABLE: readonly [string, PollErrorCode][] = [
  ["not_authenticated", "unauthenticated"],
  ["poll_not_found", "not_found"],
  ["poll_candidate_not_found", "not_found"],
  ["poll_suggestion_not_found", "not_found"],
  ["poll_not_member", "not_member"],
  ["poll_not_host", "not_host"],
  ["poll_expired", "expired"],
  ["poll_closed", "closed"],
  ["poll_state_", "closed"],
  ["poll_full", "full"],
  ["poll_candidates_full", "candidates_full"],
  ["poll_candidate_exists", "exists"],
  ["poll_suggestions_full", "suggestions_full"],
  ["poll_candidates_min", "candidates_min"],
  ["poll_not_tied_candidate", "not_tied"],
  ["poll_avoid_daily_limit_exceeded", "avoid_limit"],
  ["poll_single_choice", "invalid"],
  ["poll_candidate_invalid", "invalid"],
  ["poll_avoid_places_invalid", "invalid"],
];

export function mapPollError(error: PgErrorLike): PollFailure | null {
  if (!error) return null;
  const msg = error.message ?? "";
  for (const [name, code] of TABLE) {
    if (msg.includes(name)) return { ok: false, error: code };
  }
  if (error.code === "23505") return { ok: false, error: "exists" };
  if (error.code === "23514" || error.code === "22P02")
    return { ok: false, error: "invalid" };
  return { ok: false, error: "save" };
}
