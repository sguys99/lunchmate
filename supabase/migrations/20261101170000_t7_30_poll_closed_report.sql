-- T7.30 poll_closed 한 번만 보고 (PRD 10.2, North Star, 2026-11-01 사용자 결정 "처음 본 참여자가 한 번만 보내기").
-- 크론(lunchmate_close_polls)이 마감한 방은 방장이 화면을 열지 않으면 poll_closed가 빠졌다.
-- 마감되거나 취소된 방을 처음 본 참여자(방장이든 누구든)의 화면이 claim을 부르고, true를 받은 화면만 이벤트를 보낸다.
-- 아무도 다시 열지 않은 방은 여전히 빠지지만, 투표 탭(my_polls)을 열어도 claim하므로 드물다.
-- 기존 행 영향 없음(nullable 열 추가). 열은 참여자 select 정책 그대로 읽힐 뿐 개인 정보가 없다.

alter table public.polls add column closed_reported_at timestamptz;

comment on column public.polls.closed_reported_at is
  'poll_closed 분석 이벤트를 보낸 시각. claim_poll_closed_report가 한 번만 채운다 (T7.30)';

-- 반환: claimed가 true인 호출자만 poll_closed를 보낸다. reason과 participant_count는 이벤트 속성 그대로(PRD 10.2).
-- reason 규칙은 투표방 화면과 같다: 취소면 closed_reason(cancel, host_left), 동점 해결이면 tie_<host|roulette|auto>,
-- 그 밖에는 closed_reason(deadline, host).
create or replace function public.claim_poll_closed_report(p_poll_id uuid)
returns jsonb
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  v_poll public.polls;
begin
  if auth.uid() is null or not private.is_poll_member(p_poll_id) then
    return jsonb_build_object('claimed', false);
  end if;

  update public.polls
     set closed_reported_at = now()
   where id = p_poll_id
     and status in ('closed', 'canceled')
     and closed_reported_at is null
  returning * into v_poll;

  if not found then
    return jsonb_build_object('claimed', false);
  end if;

  return jsonb_build_object(
    'claimed', true,
    'reason', case
      when v_poll.status = 'canceled' then coalesce(v_poll.closed_reason, 'cancel')
      when v_poll.tie_resolved_by is not null then 'tie_' || v_poll.tie_resolved_by
      else coalesce(v_poll.closed_reason, 'deadline')
    end,
    'participant_count', (select count(*) from public.poll_members as m where m.poll_id = p_poll_id)
  );
end;
$$;

comment on function public.claim_poll_closed_report is
  '마감, 취소된 방의 poll_closed 보고권을 처음 부른 참여자에게 한 번만 준다 (T7.30)';

revoke all on function public.claim_poll_closed_report(uuid) from public, anon;
grant execute on function public.claim_poll_closed_report(uuid) to authenticated, service_role;
