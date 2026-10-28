// 좌표 스크러버. Sentry(beforeSend, beforeSendSpan, beforeBreadcrumb)와 PostHog(before_send)가 함께 쓴다.
// 현위치와 좌표는 서버, PostHog, Sentry로 보내지 않는다(CLAUDE.md 7장, T0.18).
// 순수 함수이며 외부 의존성이 없다. 입력 객체는 바꾸지 않고 정리된 복사본을 돌려준다.

export const FILTERED = "[Filtered]";

// 값 전체를 가릴 키 이름(대소문자 무시). 좌표가 객체 속성으로 들어오는 경우.
const COORD_KEY_RE =
  /^(lat|lng|lon|long|latitude|longitude|x|y|coords?|coordinates?|geo|geolocation|latlng|lnglat|center|bounds|bbox)$/i;
// 접미형 좌표 키. 스네이크(office_lat, center-lng)와 카멜(officeLat, centerLng). "flat" 같은 단어는 걸리지 않는다.
const COORD_SUFFIX_SNAKE_RE = /[_-](lat|lng|lon|latitude|longitude)$/i;
const COORD_SUFFIX_CAMEL_RE = /[a-z0-9](Lat|Lng|Lon|Latitude|Longitude)$/;
// 이름만으로는 좌표인지 알 수 없는 키. 정수(카드 순서 card_swiped.position 등)는 남기고 나머지는 가린다.
const AMBIGUOUS_KEY_RE = /^(position|pos)$/i;

/** 좌표 값을 담는 키 이름인지. PostHog 이벤트 속성 가드(events.ts)도 이 판정을 쓴다. */
export function isCoordinateKey(key: string): boolean {
  return (
    COORD_KEY_RE.test(key) ||
    COORD_SUFFIX_SNAKE_RE.test(key) ||
    COORD_SUFFIX_CAMEL_RE.test(key)
  );
}

const PARAM_NAMES =
  "lat|lng|lon|long|latitude|longitude|x|y|coords?|coordinates?|latlng|lnglat|center|ll";

// URL 쿼리, 해시, 폼 문자열 안의 좌표 파라미터. 예: ?lat=37.5&lng=127.0, Sentry http.query의 "lat=37.5"
// 퍼센트 인코딩된 중첩 URL(?next=%2Fmap%3Flat%3D37.5)도 가린다.
const COORD_PARAM_RE = new RegExp(
  `((?:^|[?&#;]|%3F|%26)(?:${PARAM_NAMES})(?:=|%3D))(?:(?!%26)[^&#\\s"'])*`,
  "gi",
);

// JSON 문자열 안의 좌표 키. 예: 요청 body '{"lat":37.5665,"lng":"126.97"}'
const COORD_JSON_RE = new RegExp(
  `("(?:${PARAM_NAMES}|latitude|longitude|position)"\\s*:\\s*)(?:"[^"]*"|\\[[^\\]]*\\]|-?[\\d.eE+-]+)`,
  "gi",
);

// 위경도 숫자 쌍. 소수점 3자리 이상(약 100m 정밀도) 두 수를 쉼표, 공백, 슬래시, 인코딩된 쉼표(%2C)로 이은 형태.
// 예: "37.5665, 126.9780", "37.56650,126.97800", "37.5665%2C126.9780"
// 앞뒤 경계를 둬서 타임스탬프 "1730000000.123" 같은 긴 숫자의 꼬리는 잡지 않는다.
// 구형 iOS Safari(16.4 미만)가 lookbehind를 해석하지 못하므로 앞 경계는 캡처 그룹으로 처리한다.
const COORD_PAIR_RE =
  /(^|[^\d.])-?\d{1,3}\.\d{3,}\s*(?:,|%2C|\/|;|\s)\s*-?\d{1,3}\.\d{3,}(?![\d.])/gi;

// 한국 범위의 단독 위도(33~38)와 경도(124~131) 숫자. 소수점 5자리 이상만(우연히 걸릴 일이 거의 없는 정밀도).
// 예: 키 이름이 없는 로그 "moved 37.566535", 문자열 값 "126.9779692"
const KR_SINGLE_COORD_RE =
  /(^|[^\d.])-?(?:3[3-8]|12[4-9]|13[01])\.\d{5,}(?![\d.])/g;

const MAX_DEPTH = 12;

/** 문자열 안의 좌표 패턴을 가린다. */
export function scrubString(value: string): string {
  if (value.length === 0) return value;
  return value
    .replace(COORD_PARAM_RE, `$1${FILTERED}`)
    .replace(COORD_JSON_RE, `$1"${FILTERED}"`)
    .replace(COORD_PAIR_RE, `$1${FILTERED}`)
    .replace(KR_SINGLE_COORD_RE, `$1${FILTERED}`);
}

/** 객체, 배열, 문자열을 재귀적으로 훑어 좌표를 가린다. 순환 참조와 깊은 중첩은 안전하게 끊는다. */
export function scrubCoordinates<T>(input: T): T {
  return walk(input, 0, new WeakSet<object>()) as T;
}

function scrubByKey(key: string, value: unknown): boolean {
  if (isCoordinateKey(key)) return true;
  if (AMBIGUOUS_KEY_RE.test(key)) return !Number.isInteger(value);
  return false;
}

function walk(value: unknown, depth: number, seen: WeakSet<object>): unknown {
  if (typeof value === "string") return scrubString(value);
  if (value === null || typeof value !== "object") return value;
  if (depth >= MAX_DEPTH) return FILTERED;
  if (seen.has(value)) return "[Circular]";
  // Date, Error 등 일반 객체가 아닌 것은 그대로 둔다(Sentry가 이벤트로 만들 때 이미 직렬화됨).
  if (Array.isArray(value)) {
    // Sentry request.query_string의 [키, 값] 쌍 형태. 예: [["lat", "37.5"], ["q", "국밥"]]
    if (
      value.length === 2 &&
      typeof value[0] === "string" &&
      scrubByKey(value[0], value[1])
    ) {
      return [value[0], FILTERED];
    }
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
    out[key] = scrubByKey(key, v) ? FILTERED : walk(v, depth + 1, seen);
  }
  seen.delete(value);
  return out;
}
