// 투표 만들기, 고치기 쓰기 오류 (T7.11). 순수 함수, 브라우저와 서버 공용.
// 이름(message)은 20261101140000_t7_6_polls.sql 함수가 raise하는 값이다. 원문은 화면에 보내지 않는다(문구는 src/copy/poll-create.ts).
import type { PgErrorLike } from "@/lib/supabase/db-errors";

export type PollWriteError =
  /** 입력 형식이 틀림(zod, DB check) */
  | "invalid"
  | "unauthenticated"
  /** 제목 금칙어 (MOD-04, 걸린 낱말은 알리지 않음) */
  | "banned"
  /** 오늘 10개를 다 만듦 (MOD-05) */
  | "limit"
  /** 마감 범위 밖(1분~24시간, 회식 7일) */
  | "deadline"
  /** 방이 없거나 내가 방장이 아님 */
  | "not_found"
  /** 이미 마감, 동점 대기, 취소된 방 */
  | "closed"
  /** 이미 링크를 보냈거나 다른 참여자가 있어 만들기 취소를 할 수 없음 */
  | "shared"
  /** 후보 5곳이 참 */
  | "full"
  /** 후보는 2곳 아래로 줄일 수 없음 */
  | "min"
  /** 이미 넣은 후보 */
  | "exists"
  /** 표가 있어 방식을 바꿀 수 없음 */
  | "multi_votes"
  /** 기준점으로 쓸 회사 핀이 없음(온보딩 전) */
  | "no_office"
  /** 관리자가 정지한 계정 (MOD-06, T8.5) */
  | "suspended"
  /** 그 밖(네트워크 등). 다시 보내기 */
  | "save";

export type PollWriteResult<T extends object = object> =
  ({ ok: true } & T) | { ok: false; error: PollWriteError };

export function pollFail(error: PollWriteError): {
  ok: false;
  error: PollWriteError;
} {
  return { ok: false, error };
}

const RULES: readonly [RegExp, PollWriteError][] = [
  [/\baccount_suspended\b/, "suspended"],
  // T10.3b 금칙어 DB 안전망(제목). zod가 먼저 거르지만 DB만 거절해도 같은 "banned" 문구
  [/\bbanned_content\b/, "banned"],
  [/\bpolls_daily_limit_exceeded\b/, "limit"],
  [/\bpoll_closes_at_range\b/, "deadline"],
  [/\bpoll_already_shared\b/, "shared"],
  [/\bpoll_candidates_full\b/, "full"],
  [/\bpoll_candidates_min\b/, "min"],
  [/\bpoll_candidate_exists\b/, "exists"],
  [/\bpoll_multi_has_votes\b/, "multi_votes"],
  [/\bpoll_(not_found|not_host|not_member|candidate_not_found)\b/, "not_found"],
  [/\bpoll_(closed|state_\w+|expired)\b/, "closed"],
  [
    /\bpoll_candidates_(count|duplicate|urls_length)\b|\bpoll_candidate_invalid\b/,
    "invalid",
  ],
  [/\bnot_authenticated\b/, "unauthenticated"],
];

/** Supabase(PostgREST) 오류 → 실패 코드. 오류가 없으면 null */
export function mapPollError(error: PgErrorLike): PollWriteError | null {
  if (!error) return null;
  const msg = error.message ?? "";
  for (const [re, code] of RULES) if (re.test(msg)) return code;
  if (
    error.code === "23514" ||
    error.code === "22P02" ||
    error.code === "23502"
  )
    return "invalid";
  return "save";
}
