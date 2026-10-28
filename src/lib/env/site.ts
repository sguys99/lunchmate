// NEXT_PUBLIC_SITE_URL에서 파생되는 값. 도메인을 코드에 하드코딩하지 말고 여기서 만든다.
import { clientEnv } from "./client";

const DEV_FALLBACK = "http://localhost:3000";

/** 사이트 기준 URL(끝 슬래시 없음). 미설정이면 개발용 localhost. 프로덕션 미설정은 clientEnv()가 오류를 낸다. */
export function siteUrl(): string {
  const url = clientEnv().NEXT_PUBLIC_SITE_URL ?? DEV_FALLBACK;
  return url.replace(/\/+$/, "");
}

/** 내부 경로("/poll/abc")를 절대 URL로 만든다. 외부 URL, 프로토콜 상대 경로는 거부한다. */
export function absoluteUrl(path = "/"): string {
  if (/^[a-z][a-z0-9+.-]*:/i.test(path) || path.startsWith("//")) {
    throw new Error("absoluteUrl에는 내부 경로(/로 시작)만 넘길 수 있습니다.");
  }
  return `${siteUrl()}${path.startsWith("/") ? path : `/${path}`}`;
}
