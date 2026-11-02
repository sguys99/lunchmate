// 나 탭 설정의 "관리자 화면" 줄 (T9.10). 서버 컴포넌트가 본인 profiles.role(RLS 본인 읽기)을 읽어 이 함수로 정한다.
// 클라이언트는 role을 받지 않는다. 줄이 보여도 /admin 레이아웃의 role 확인과 admin_* 보안 함수가 다시 막는다.

/** role이 admin이고 관리자 화면 플래그(flags.adminConsole)가 켜져 있을 때만 */
export function showsAdminEntry(
  profile: { role: "user" | "admin" } | null,
  adminConsoleOn: boolean,
): boolean {
  return adminConsoleOn && profile?.role === "admin";
}
