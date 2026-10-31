// Postgres 오류를 화면이 다룰 수 있는 결과로 (T6.17, T6.18). 순수 함수, 브라우저와 서버 공용(타입만 화면이 쓴다).
// 이름(message)은 마이그레이션 트리거와 함수가 raise하는 값이다.
// - 20261101120000(T6.5): <bucket>_daily_limit_exceeded, reviews_visit_not_found, reviews_visit_too_old,
//   report_target_unavailable, report_own_target, deal_not_open, not_authenticated, place_stats_too_many_ids
// - 20261031120000(T5.14): visits_daily_limit_exceeded, visits_status_back_to_candidate
// 원문 message와 hint는 화면에 그대로 보내지 않는다. 문구는 src/copy/moderation.ts writeErrorCopy.

/** 일일 한도 칸 (MOD-05, DEAL-04, T5.14 방문 20) */
export type LimitBucket = "reviews" | "reports" | "deals" | "visits";

export type WriteErrorCode =
  /** 입력 형식이 틀림(zod, DB check) */
  | "invalid"
  | "unauthenticated"
  /** 금칙어, 연락처, 링크 (MOD-04) */
  | "banned"
  /** 오늘 한도를 다 씀. bucket이 함께 온다 */
  | "limit"
  /** 같은 것이 이미 있음(같은 방문 후기, 같은 대상 신고, 같은 식당 같은 제보 하루 1회) */
  | "duplicate"
  /** 방문일 14일이 지나 후기를 쓸 수 없음 */
  | "too_old"
  /** 대상이 없거나 내 것이 아님(내 방문, 내 후기, 내 제보) */
  | "not_found"
  /** 내가 쓴 글은 신고할 수 없음 */
  | "own_target"
  /** 이미 내려가 신고하거나 확인할 수 없음(숨긴 후기, 끝난 할인) */
  | "unavailable"
  /** 웨이팅 30분 1회 (PLACE-07). retryAt이 함께 온다 */
  | "cooldown"
  /** 되돌리기 시간(웨이팅 2분)이 지남 */
  | "undo_expired"
  /** 그 밖의 저장 실패(네트워크 등). 다시 보내기 */
  | "save";

export type WriteFailure =
  | {
      ok: false;
      error: Exclude<WriteErrorCode, "limit" | "cooldown">;
    }
  | { ok: false; error: "limit"; bucket: LimitBucket }
  | { ok: false; error: "cooldown"; retryAt: string };

export type PgErrorLike = {
  code?: string | null;
  message?: string | null;
  details?: string | null;
  hint?: string | null;
} | null;

const LIMIT_RE = /\b(reviews|reports|deals|visits)_daily_limit_exceeded\b/;

/** Supabase(PostgREST) 오류 → 실패 결과. 오류가 없으면 null */
export function mapPgError(error: PgErrorLike): WriteFailure | null {
  if (!error) return null;
  const msg = error.message ?? "";
  const limit = LIMIT_RE.exec(msg);
  if (limit?.[1]) {
    return { ok: false, error: "limit", bucket: limit[1] as LimitBucket };
  }
  if (msg.includes("reviews_visit_too_old"))
    return { ok: false, error: "too_old" };
  if (msg.includes("reviews_visit_not_found"))
    return { ok: false, error: "not_found" };
  if (msg.includes("report_own_target"))
    return { ok: false, error: "own_target" };
  if (
    msg.includes("report_target_unavailable") ||
    msg.includes("deal_not_open")
  )
    return { ok: false, error: "unavailable" };
  if (msg.includes("not_authenticated"))
    return { ok: false, error: "unauthenticated" };
  // 23505 유일 키 위반: 같은 방문 후기, 같은 대상 신고, 같은 날 같은 제보
  if (error.code === "23505") return { ok: false, error: "duplicate" };
  // 23514 check 위반(위 이름 외) 또는 22P02 형식 오류: 입력이 규칙을 어김
  if (error.code === "23514" || error.code === "22P02" || error.code === "23502")
    return { ok: false, error: "invalid" };
  return { ok: false, error: "save" };
}
