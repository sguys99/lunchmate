// 쓰기 서버 액션의 공통 결과 모양 (T6.8~T6.24). 브라우저, 서버 공용 타입.
import type { WriteErrorCode, WriteFailure } from "./db-errors";

export type { LimitBucket, WriteErrorCode, WriteFailure } from "./db-errors";

export type WriteResult<T extends object = object> =
  | ({ ok: true } & T)
  | WriteFailure;

export function fail(
  error: Exclude<WriteErrorCode, "limit" | "cooldown">,
): WriteFailure {
  return { ok: false, error };
}
