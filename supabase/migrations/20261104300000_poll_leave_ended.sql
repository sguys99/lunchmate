-- 투표 기록 삭제: 끝난 투표방을 내 목록에서 지우기 (POLL-10, D-43, 2026-11-04 사용자 결정)
-- 앞 마이그레이션: 20261101140000_t7_6_polls.sql(polls, poll_members, poll_candidates, 탈퇴 트리거, my_polls)
--
-- 결정 (D-43)
-- - 지우는 범위는 "내 목록에서만". 투표방과 다른 사람의 결과는 그대로 둔다. 방장이어도 방 전체를 지우지 않는다.
-- - 끝난 방(closed, canceled)만. 진행 중(open)과 동점 대기(tie)는 투표가 꼬이지 않게 막는다(poll_state_open, poll_state_tie).
-- - 처리는 탈퇴 때 끝난 방을 다루는 방식과 같다(PRD 11.4): 내 참여자 행은 익명(user_id null)으로 남기고,
--   내가 방장이면 host_id, 내가 넣은 후보면 added_by를 null로 바꾼다. 표(poll_votes)는 참여자 행에 묶여 있어 그대로
--   남으므로 다른 사람이 보는 결과 숫자는 바뀌지 않는다.
-- - 끝난 방은 다시 참여할 수 없다(join_poll이 poll_closed, poll_expired로 막는다). 지운 방은 목록(my_polls)에 다시 나오지 않는다.
--
-- 트리거 영향 (20261101140000 7절)
-- - poll_members_after_anonymize: 방이 open일 때만 행을 지운다. 여기서는 끝난 방만 바꾸므로 익명 행으로 남는다.
-- - polls_after_host_left: open, tie일 때만 취소한다. 끝난 방은 상태가 바뀌지 않는다.
--
-- 새 테이블 없음(RLS 정책 추가 없음). 함수는 로그인 사용자만 부른다.
-- 확인: src/lib/supabase/rls/t7-poll.rls.test.ts "D-43 투표 기록 삭제"
-- 되돌리기: drop function public.leave_ended_poll(uuid); 이미 익명으로 바꾼 행은 백업(pnpm db:backup)으로만 되살린다.

create or replace function public.leave_ended_poll(p_poll_id uuid)
returns void
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  v_uid  uuid := auth.uid();
  v_poll public.polls;
begin
  if v_uid is null then
    raise exception 'not_authenticated' using errcode = '42501';
  end if;
  -- 마감이 지난 방은 먼저 판정한다(my_polls, lock_poll_for_host와 같은 순서)
  perform private.close_if_due(p_poll_id);
  select * into v_poll from public.polls where id = p_poll_id for update;
  if not found
     or not exists (select 1 from public.poll_members where poll_id = p_poll_id and user_id = v_uid) then
    raise exception 'poll_not_found' using errcode = 'no_data_found';
  end if;
  if v_poll.status not in ('closed', 'canceled') then
    raise exception 'poll_state_%', v_poll.status using errcode = 'check_violation';
  end if;

  update public.poll_candidates set added_by = null where poll_id = p_poll_id and added_by = v_uid;
  if v_poll.host_id = v_uid then
    update public.polls set host_id = null where id = p_poll_id;
  end if;
  update public.poll_members set user_id = null where poll_id = p_poll_id and user_id = v_uid;
end;
$$;

comment on function public.leave_ended_poll(uuid) is
  '끝난 투표방을 내 목록에서 지운다. 내 참여, 방장, 후보 추가 기록을 익명으로 바꾸고 방과 결과는 남긴다 (POLL-10, D-43)';

revoke all on function public.leave_ended_poll(uuid) from public, anon;
grant execute on function public.leave_ended_poll(uuid) to authenticated, service_role;
