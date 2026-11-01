-- T7.11 투표 만들기 "기준 바꾸기" (D-15 안건 10, DESIGN.md 5장 "투표 만들기").
-- 먼저 만들고 고치기(C)라 기준점도 만든 뒤에 바꾼다. update_poll에는 기준점 인자가 없어 함수를 하나 더한다.
-- 기준점은 방장 사무실 핀 또는 방장이 지도에서 찍은 점이다. 현위치 좌표는 화면이 보내지 않는다(T0.16-1, CLAUDE.md 7장).
-- 보내기 전(shared_at null)에만 바꾼다. 링크를 받은 친구 화면의 이름 찾기 기준이 도중에 바뀌지 않게 한다.
-- 테이블 변경 없음(polls_anchor_*_range, polls_radius_range 체크가 그대로 지킨다).

create or replace function public.update_poll_anchor(
  p_poll_id    uuid,
  p_anchor_lat double precision,
  p_anchor_lng double precision,
  p_radius_m   integer
)
returns void
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  v_poll public.polls := private.lock_poll_for_host(p_poll_id, array['open']);
begin
  if v_poll.shared_at is not null then
    raise exception 'poll_already_shared' using errcode = 'check_violation';
  end if;
  update public.polls
     set anchor_lat = p_anchor_lat,
         anchor_lng = p_anchor_lng,
         radius_m = p_radius_m
   where id = p_poll_id;
end;
$$;

comment on function public.update_poll_anchor is
  '방장이 보내기 전 후보 이름 기준점과 반경을 바꾼다. 사무실 핀 또는 지도에서 찍은 점(현위치 금지) (T7.11, D-15)';

revoke all on function public.update_poll_anchor(uuid, double precision, double precision, integer) from public, anon;
grant execute on function public.update_poll_anchor(uuid, double precision, double precision, integer) to authenticated, service_role;
