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
// (tasks S9: T4.12 → T5.14 → T6.27 → T7.29).
export const ACCOUNT_DELETION_SCOPE = [
  // T4.4 (지금 있는 테이블, auth.users on delete cascade)
  "profiles",
  "offices",
  "preferences",
  "avoid_rules",
  // T5.14 (auth.users on delete cascade, supabase/migrations/20261031120000_t5_14_visits_favorites_blocklist.sql)
  "visits",
  "favorites",
  "blocklist",
  // T6.27 (auth.users on delete cascade, supabase/migrations/20261101120000_t6_5_reviews_reports_deals_waits.sql)
  //   집계(place_stats 등)는 그때그때 계산하므로 지운 후기, 제보는 바로 집계에서 빠진다.
  //   탈퇴자의 할인, 후기에 달린 남의 확인 응답과 신고는 deal_id, review_id cascade로 함께 지워진다.
  //   탈퇴자의 신고가 지워져 남의 글 신고 수가 3 아래로 내려가도 이미 적용된 숨김은 유지한다(관리자만 복원,
  //   20261101130000 마이그레이션 머리말). 확인은 account_residue(service_role 전용) + t6-delete-account RLS 테스트.
  "reviews", // 공개, 비공개 모두
  "review_reports", // 내가 한 후기, 할인 신고
  "place_reports", // 폐업, 가격, 정보 제보
  "place_deals", // 내가 올린 할인 제보
  "place_deal_checks", // 아직 해요, 끝났어요 응답
  "wait_reports",
  "private.daily_usage", // 일일 한도 카운터
  // T7.29 (supabase/migrations/20261101140000_t7_6_polls.sql). poll_votes에는 user_id가 없어 참여자 행으로 묶인다.
  //   polls.host_id, poll_candidates.added_by, poll_members.user_id는 on delete set null(남의 투표방 결과를 지키려고).
  //   트리거: 진행 중(open, tie) 방의 내 참여자 행은 지워지고(내 표도 cascade로 삭제), 끝난 방은 익명 참여자로 남는다.
  //   내가 방장인 진행 중 방은 취소(closed_reason host_left, PRD 12장). 확인은 account_residue + t7-poll RLS "T7.29, T7.22 탈퇴".
  "poll_members", // 진행 중 방은 삭제, 끝난 방은 user_id null(익명 참여자)
  "poll_votes", // 진행 중 방의 내 표(참여자 행 cascade)
  "polls", // 내가 연 방은 host_id null, 진행 중이면 host_left로 취소
  "poll_candidates", // 내가 넣은 후보는 added_by null(후보는 방에 남음)
  "private.poll_avoid_usage", // 기피 경고 호출 카운터
  // T9.4 (supabase/migrations/20261102120000_t9_4_beta_feedback.sql). auth.users on delete cascade.
  //   account_residue가 외래 키를 카탈로그에서 찾으므로 별도 점검 코드 없이 0행을 확인한다(t9-beta-feedback RLS 테스트).
  "beta_feedback", // 베타 의견(본인 쓰기, 관리자 읽기)
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
