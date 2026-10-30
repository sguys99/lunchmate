// 회원 탈퇴 처리 흐름 (T4.12, PRD AUTH-05, 11.4절, AC-AUTH-3). 서버 라우트(app/auth/delete-account)와
// RLS 통합 테스트(src/lib/supabase/rls/t4-delete-account.rls.test.ts)가 같은 함수를 부른다.
// 이 파일은 server-only를 import하지 않는다(테스트에서 부르기 위해). service role 클라이언트를 만드는 곳은
// src/lib/supabase/admin.ts(server-only)뿐이고, 이 함수는 만들어진 클라이언트를 받기만 한다.
//
// 순서
// 1. 세션 사용자를 Auth 서버로 다시 검증한다(getUser). 쿠키나 폼 값의 user id는 믿지 않는다.
// 2. Auth Admin API로 그 사용자를 완전히 지운다(soft delete 아님: 같은 소셜 계정으로 다시 오면 새 id가 된다).
// 3. auth.users 삭제가 on delete cascade로 아래 범위의 행을 모두 지운다.
//
// 삭제 범위 (PRD 11.4). 새 테이블을 만들 때마다 여기와 마이그레이션의 on delete cascade를 함께 확인한다
// (tasks S9: T4.12 → T6.27 → T7.29).
export const ACCOUNT_DELETION_SCOPE = [
  // T4.4 (지금 있는 테이블, auth.users on delete cascade)
  "profiles",
  "offices",
  "preferences",
  "avoid_rules",
  // T6.27에서 확장: visits, favorites, never_again, feedback, wait_reports, closure_reports, deal_reports와 확인 응답,
  //   review_reports(신고 기록), reviews(공개와 비공개 모두 삭제, 식당 집계에서도 빠짐)
  // T7.29에서 확장: poll_votes(진행 중 투표의 내 표 삭제), 확정된 투표는 익명 참여자로 남김(참여자 user_id를 null로),
  //   방장인 진행 중 투표방은 취소 처리
] as const;

export type DeleteAccountDeps = {
  /** Auth 서버가 검증한 지금 세션의 사용자 id. 없으면 null */
  verifiedUserId: () => Promise<string | null>;
  /** service role 클라이언트의 Auth Admin 삭제 */
  deleteUser: (userId: string) => Promise<{ error: unknown }>;
};

export type DeleteAccountResult =
  | { ok: true; userId: string }
  | { ok: false; reason: "unauthenticated" | "failed" };

export async function deleteAccount(
  deps: DeleteAccountDeps,
): Promise<DeleteAccountResult> {
  const userId = await deps.verifiedUserId().catch(() => null);
  if (!userId) return { ok: false, reason: "unauthenticated" };
  const { error } = await deps
    .deleteUser(userId)
    .catch((e: unknown) => ({ error: e }));
  if (error) return { ok: false, reason: "failed" };
  return { ok: true, userId };
}

/** supabase-js 클라이언트의 auth.admin.deleteUser를 deps 모양으로 감싼다(라우트와 테스트가 같이 쓴다) */
export function adminDeleter(admin: {
  auth: {
    admin: {
      deleteUser: (
        id: string,
        shouldSoftDelete?: boolean,
      ) => Promise<{ error: unknown }>;
    };
  };
}): DeleteAccountDeps["deleteUser"] {
  // 두 번째 인자 false: 완전 삭제(soft delete면 같은 계정 재가입이 막히거나 이전 id가 남는다)
  return async (id) => {
    const { error } = await admin.auth.admin.deleteUser(id, false);
    return { error };
  };
}
