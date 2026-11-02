// 베타 의견에 함께 보내는 "지금 보던 화면" 경로 (T9.4, D-23). 브라우저(시트에 보이는 값)와 서버 액션(저장 전 한 번 더)이 같이 쓴다.
//
// 개인정보 원칙(CLAUDE.md 7장)
// - 쿼리와 해시는 통째로 버린다(redirect, tab 같은 값에 무엇이 실릴지 모른다).
// - 알려진 경로 틀(허용 목록)에 맞춰 바꾼다. 동적 조각은 값 대신 자리 이름만 남긴다.
//   /poll/abc123xyz0 → /poll/[code], /today/place/1840235701 → /today/[detail]
// - 허용 목록에 없는 경로는 /[other]로 보낸다. 모르는 조각에 무엇이 들어 있을지 알 수 없어서다.
// - 좌표, 초대 코드, 장소 번호, 사용자 id는 어떤 경우에도 남지 않는다(테스트로 막는다).

/** 그대로 보내도 되는 고정 경로 */
const STATIC_ROUTES = new Set([
  "/",
  "/beta",
  "/today",
  "/map",
  "/poll",
  "/poll/party",
  "/me",
  "/me/settings",
  "/me/account",
  "/me/avoid",
  "/me/budget",
  "/me/contact",
  "/me/craving",
  "/me/display",
  "/me/offices",
  "/me/offices/new",
  "/location",
  "/login",
  "/privacy",
  "/terms",
  "/offline",
  "/welcome/onboarding",
  "/welcome/terms",
  "/admin",
]);

/** 첫 조각별 동적 경로 틀. 값 조각은 자리 이름으로 바꾼다 */
function dynamicRoute(segments: readonly string[]): string | null {
  const [head, second, third] = segments;
  if (head === "poll" && second) {
    if (segments.length === 2) return "/poll/[code]";
    if (segments.length === 3 && third === "result") return "/poll/[code]/result";
    return "/poll/[code]/[other]";
  }
  if ((head === "today" || head === "map") && second) return `/${head}/[detail]`;
  if (head === "me" && second) return "/me/[other]";
  return null;
}

/** 브라우저 경로(pathname 또는 전체 주소)를 보내도 되는 경로 틀로 바꾼다 */
export function sanitizeRoute(input: string): string {
  let pathname = input;
  try {
    // 전체 주소가 와도 경로만 쓴다. 기준 주소는 해석용일 뿐 결과에 남지 않는다
    pathname = new URL(input, "https://x.invalid").pathname;
  } catch {
    return "/[other]";
  }
  const segments = pathname
    .split("/")
    .filter(Boolean)
    .map((s) => {
      try {
        return decodeURIComponent(s).toLowerCase();
      } catch {
        return "\u0000";
      }
    });
  const normalized = `/${segments.join("/")}`;
  if (STATIC_ROUTES.has(normalized)) return normalized;
  return dynamicRoute(segments) ?? "/[other]";
}
