// "지금 보던 화면" 기억 (T9.4). 의견 시트는 나 탭(/me)에서 열리므로, 나 탭에 오기 직전에 보던 앱 화면을 기억한다.
// - 하단 탭 막대(BottomTabBar)가 경로가 바뀔 때마다 rememberRoute(pathname)를 부른다. 나 탭 첫 화면(/me) 자체는 적지 않는다.
// - 이 탭의 메모리(모듈 변수)에만 둔다. localStorage, 서버, 분석 도구로 보내지 않는다. 새로 고침하면 사라진다.
// - 경로(pathname)만 받는다. 쿼리와 해시는 애초에 받지 않고, 보낼 때 sanitizeRoute가 경로 틀로 한 번 더 바꾼다.
const ME_ROOT = "/me";

let last: string | null = null;

export function rememberRoute(pathname: string | null | undefined): void {
  if (!pathname || pathname === ME_ROOT || pathname === `${ME_ROOT}/`) return;
  last = pathname;
}

/** 나 탭 전에 보던 경로. 없으면(나 탭으로 바로 들어옴) 나 탭 */
export function lastRoute(): string {
  return last ?? ME_ROOT;
}

/** 테스트 전용 */
export function resetLastRoute(): void {
  last = null;
}
