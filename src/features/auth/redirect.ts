// 로그인 후 돌아갈 경로(next) 검사 (T4.9, PRD AUTH-03). 오픈 리다이렉트 방지가 목적이다(CLAUDE.md 13장).
// 의존성 없는 순수 함수라 proxy, Route Handler, 클라이언트가 함께 쓴다.
//
// 규칙
// - 문자열이고 "/"로 시작하는 같은 사이트 안 경로만 받는다. "//host", "/\host", "https:", "javascript:" 같은 것은 모두 거부.
// - 제어 문자(탭, 줄바꿈 등)와 역슬래시는 어디에 있든 거부한다. 브라우저 URL 파서가 탭과 줄바꿈을 지우고
//   역슬래시를 슬래시로 바꿔 "/\t/evil.com"이 "//evil.com"이 되는 우회를 막는다.
// - 마지막으로 가짜 기준 주소에 대고 URL을 풀어 출처(origin)가 그대로인지 확인한다(이중 안전장치).
// - 로그인 흐름 자체(/login, /auth/*, 약관 자리 /welcome/*)로 돌아가면 고리가 생기므로 기본 경로로 바꾼다.
// - 거부하면 예외 대신 기본 경로(/today)를 돌려준다. 결과는 pathname + search(해시는 서버로 오지 않으므로 뺀다).

export const DEFAULT_NEXT = "/today";
export const NEXT_MAX_LENGTH = 512;

const PROBE_ORIGIN = "https://next.invalid";
const CONTROL_OR_BACKSLASH = /[\u0000-\u001f\u007f\\]/;
const LOOP_ROOTS = ["/login", "/auth", "/welcome"] as const;

/** 내부 경로면 정규화한 값, 아니면 null */
export function parseInternalPath(raw: unknown): string | null {
  if (typeof raw !== "string") return null;
  if (raw.length === 0 || raw.length > NEXT_MAX_LENGTH) return null;
  if (!raw.startsWith("/") || raw.startsWith("//")) return null;
  if (CONTROL_OR_BACKSLASH.test(raw)) return null;

  let url: URL;
  try {
    url = new URL(raw, PROBE_ORIGIN);
  } catch {
    return null;
  }
  if (url.origin !== PROBE_ORIGIN) return null;
  // 점 구간 정규화로 경로가 "//"로 바뀌는 경우("/.//evil.com", "/%2e%2e//evil.com")를 거부한다.
  // 정규화 결과를 상대 Location으로 쓰면 프로토콜 상대 주소가 되기 때문이다.
  if (url.pathname.startsWith("//")) return null;
  return `${url.pathname}${url.search}`;
}

function isLoop(path: string): boolean {
  const pathname = path.split("?")[0]!;
  return LOOP_ROOTS.some(
    (root) => pathname === root || pathname.startsWith(`${root}/`),
  );
}

/** next 값을 안전한 내부 경로로. 잘못되었거나 로그인 흐름을 가리키면 기본 경로 */
export function sanitizeNext(
  raw: unknown,
  fallback: string = DEFAULT_NEXT,
): string {
  const path = parseInternalPath(raw);
  if (!path || isLoop(path)) return fallback;
  return path;
}
