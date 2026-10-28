// 좌표 스크러버. Sentry(beforeSend, beforeBreadcrumb)와 PostHog(before_send)가 함께 쓴다.
// 현위치와 좌표는 서버, PostHog, Sentry로 보내지 않는다(CLAUDE.md 7장, T0.18).
// 순수 함수이며 외부 의존성이 없다. 입력 객체는 바꾸지 않고 정리된 복사본을 돌려준다.

export const FILTERED = "[Filtered]";

// 값 전체를 가릴 키 이름(대소문자 무시). 좌표가 객체 속성으로 들어오는 경우.
const COORD_KEY_RE =
  /^(lat|lng|lon|long|latitude|longitude|x|y|coords?|coordinates?|geo|geolocation|position)$/i;

// URL 쿼리, 해시, 폼 문자열 안의 좌표 파라미터. 예: ?lat=37.5&lng=127.0
const COORD_PARAM_RE =
  /([?&#;](?:lat|lng|lon|long|latitude|longitude|x|y|coords?)=)[^&#\s"']*/gi;

// 위경도 숫자 쌍. 소수점 4자리 이상 두 수를 쉼표, 공백, 슬래시, 인코딩된 쉼표(%2C)로 이은 형태.
// 예: "37.5665, 126.9780", "37.56650,126.97800", "37.5665%2C126.9780"
const COORD_PAIR_RE =
  /-?\d{1,3}\.\d{4,}\s*(?:,|%2C|\/|;|\s)\s*-?\d{1,3}\.\d{4,}/gi;

const MAX_DEPTH = 12;

/** 문자열 안의 좌표 패턴을 가린다. */
export function scrubString(value: string): string {
  if (value.length === 0) return value;
  return value
    .replace(COORD_PARAM_RE, `$1${FILTERED}`)
    .replace(COORD_PAIR_RE, FILTERED);
}

/** 객체, 배열, 문자열을 재귀적으로 훑어 좌표를 가린다. 순환 참조와 깊은 중첩은 안전하게 끊는다. */
export function scrubCoordinates<T>(input: T): T {
  return walk(input, 0, new WeakSet<object>()) as T;
}

function walk(value: unknown, depth: number, seen: WeakSet<object>): unknown {
  if (typeof value === "string") return scrubString(value);
  if (value === null || typeof value !== "object") return value;
  if (depth >= MAX_DEPTH) return FILTERED;
  if (seen.has(value)) return "[Circular]";
  // Date, Error 등 일반 객체가 아닌 것은 그대로 둔다(Sentry가 이벤트로 만들 때 이미 직렬화됨).
  if (Array.isArray(value)) {
    seen.add(value);
    const out = value.map((v) => walk(v, depth + 1, seen));
    seen.delete(value);
    return out;
  }
  const proto = Object.getPrototypeOf(value);
  if (proto !== Object.prototype && proto !== null) return value;

  seen.add(value);
  const out: Record<string, unknown> = {};
  for (const [key, v] of Object.entries(value)) {
    out[key] = COORD_KEY_RE.test(key) ? FILTERED : walk(v, depth + 1, seen);
  }
  seen.delete(value);
  return out;
}
