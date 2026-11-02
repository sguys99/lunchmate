// 화면에서 처리한(삼킨) 오류를 Sentry로 보낸다 (T9.10). 공유 같은 지연 청크에서만 import한다.
// report-error.ts는 오류 경계를 거쳐 모든 라우트 첫 로드에 실리므로 홈 번들 예산 때문에 따로 둔다.
import { reportError } from "./report-error";

/** 처리한 오류의 이름과 메시지만 남긴다. 주소(초대 코드가 든 링크 포함)는 지우고 길이를 줄인다 */
export function sanitizeHandledError(context: string, error: unknown): Error {
  const name =
    error instanceof Error
      ? error.name
      : typeof error === "string"
        ? "StringError"
        : "UnknownError";
  const raw =
    error instanceof Error
      ? error.message
      : typeof error === "string"
        ? error
        : "";
  const message = raw
    .replace(/[a-z][a-z0-9+.-]*:\/\/\S+/gi, "<url>")
    .replace(/\/poll\/[^\s/?#]+/g, "/poll/<code>")
    .slice(0, 200);
  const out = new Error(`[${context}] ${message}`);
  out.name = name;
  return out;
}

/**
 * 화면에서 처리한(삼킨) 오류를 Sentry로 보낸다(T9.10). 원래 오류 객체 대신 이름과 메시지만 담은 새 오류를 보내
 * 링크, 템플릿 값, 좌표가 따라가지 않게 한다. 기다리지 않아도 되고 실패해도 화면에 영향이 없다.
 */
export function reportHandledError(context: string, error: unknown): void {
  void reportError(sanitizeHandledError(context, error));
}
