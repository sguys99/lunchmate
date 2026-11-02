-- T10.3 후속: 끝난 투표방 보관 기간 90일 (D-28, 2026-11-02 사용자 결정)
-- PRD: 11.4절(탈퇴, 보관), APP-05(개인정보 처리방침의 보유 기간), POLL-11(링크 만료)
-- 앞 마이그레이션: 20261101140000_t7_6_polls.sql(polls, poll_candidates, poll_members, poll_votes, private.poll_avoid_usage),
--                  20261101130000_t6_26_cron_cleanup_t6_27_account_residue.sql(pg_cron, 정리 작업 관례, account_residue)
--
-- 이 파일이 하는 일
-- 1. private.purge_old_polls(): 마감(closed) 또는 취소(canceled)된 지 90일이 지난 투표방을 지운다.
--    딸린 행은 기존 외래 키가 cascade로 함께 지운다(새 외래 키 없음).
--      poll_candidates.poll_id, poll_members.poll_id, poll_votes.poll_id(+ member_id, candidate_id),
--      private.poll_avoid_usage.poll_id  → 모두 on delete cascade (20261101140000)
--    기준 시각은 closed_at(마감, 동점 확정, 취소 모두 이 열에 찍힌다. 제약 polls_closed_at_state).
--    진행 중(open)과 동점 대기(tie)는 지우지 않는다(1분 마감 작업이 closed로 바꾼 뒤부터 90일을 센다).
--    한 번에 5000곳까지 지운다. 남으면 다음 날 이어서 지운다(화면은 영향 없음, 아래 "화면 영향").
-- 2. pg_cron lunchmate_purge_old_polls: 매일 04:45 KST(19:45 UTC). 기존 작업 시각(19:10, 19:15, 19:20, 19:25, 19:30,
--    19:40, 19:50)과 겹치지 않게 둔다. 실행 기록은 T6.26 lunchmate_purge_cron_history가 14일 뒤 지운다(lunchmate_ 접두).
-- 3. public.purge_old_polls_now(): service_role 전용 점검 함수(account_residue와 같은 관례). 크론과 같은 본문을 불러
--    RLS 테스트(src/lib/supabase/rls/t10-poll-retention.rls.test.ts)가 삭제 범위를 직접 확인한다.
--    사용자 세션과 비로그인은 부를 수 없다.
--
-- 남는 것 (투표방과 외래 키가 없다)
-- - public.visits: 확정 때 private.finalize_poll이 참여자 각자에게 만든 방문 기록(source 'poll', place_id, place_url).
--   polls를 가리키는 열이 없어 투표방이 지워져도 각자의 기록으로 남는다. 탈퇴하거나 본인이 지울 때까지(처리방침 3절).
-- - realtime.messages: 'poll:<id>' 집계 메시지는 Supabase가 3일 뒤 지운다(20261101140000 머리말).
-- - 분석 이벤트(PostHog): 방 id를 속성으로 보내지 않는다(PRD 10.2).
--
-- 화면 영향
-- - 투표 탭(my_polls)의 지난 투표 목록에서 90일 넘은 방이 빠진다. 목록은 원래 최근 50개까지다.
-- - 지워진 방의 링크(/poll/<code>)는 "투표를 찾을 수 없습니다"(src/copy/poll.ts notices.notFound)로 보인다.
--   참여자가 아닌 사람에게는 마감 24시간 뒤부터 이미 "마감된 투표"(만료)였다.
--
-- 규칙: 이미 푸시된 파일은 고치지 않는다(CLAUDE.md 11장). 테이블을 새로 만들지 않으므로 RLS 정책 추가 없음.
-- 되돌리기: select cron.unschedule('lunchmate_purge_old_polls'); 이미 지운 행은 백업(pnpm db:backup)으로만 되살린다.

-- ─────────────────────────────────────────────────────────────
-- 1. 정리 함수 (private, security definer, search_path 고정)
-- ─────────────────────────────────────────────────────────────
create or replace function private.purge_old_polls()
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_count integer;
begin
  delete from public.polls
   where id in (
     select p.id
       from public.polls as p
      where p.status in ('closed', 'canceled')
        and p.closed_at < now() - interval '90 days'
      order by p.closed_at
      limit 5000
   );
  get diagnostics v_count = row_count;
  return v_count;
end;
$$;

comment on function private.purge_old_polls() is
  '마감, 취소 뒤 90일 지난 투표방 삭제(후보, 참여자, 표는 cascade, visits는 남음). pg_cron lunchmate_purge_old_polls (T10.3, D-28)';

revoke all on function private.purge_old_polls() from public, anon, authenticated;

-- 마감 시각으로 지울 방을 찾는 색인(끝난 방만)
create index if not exists polls_closed_at_idx on public.polls (closed_at) where status in ('closed', 'canceled');

-- ─────────────────────────────────────────────────────────────
-- 2. 점검 함수 (service_role 전용, RLS 테스트용)
-- ─────────────────────────────────────────────────────────────
create or replace function public.purge_old_polls_now()
returns integer
language sql
volatile
security definer
set search_path = ''
as $$
  select private.purge_old_polls();
$$;

comment on function public.purge_old_polls_now() is
  '점검 전용: 크론(lunchmate_purge_old_polls)과 같은 삭제를 지금 한 번 실행하고 지운 방 수를 돌려준다. service_role 전용 (T10.3)';

revoke all on function public.purge_old_polls_now() from public, anon, authenticated;
grant execute on function public.purge_old_polls_now() to service_role;

-- ─────────────────────────────────────────────────────────────
-- 3. 작업 예약 (다시 적용해도 같은 상태: 같은 이름은 지우고 다시 만든다)
-- ─────────────────────────────────────────────────────────────
select cron.unschedule(j.jobid)
  from cron.job as j
 where j.jobname = 'lunchmate_purge_old_polls';

select cron.schedule('lunchmate_purge_old_polls', '45 19 * * *',
  'select private.purge_old_polls()');
