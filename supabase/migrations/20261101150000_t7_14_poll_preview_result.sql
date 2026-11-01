-- T7.14 결과 링크 공개 OG(POLL-09S, D-17 안건 1, 7)에 쓸 숫자를 poll_preview에 더한다.
-- 확정(status closed, winner 있음)된 방에서만 'voted_count'(표를 낸 사람 수)와 'top_votes'(1위 득표 수)를 함께 돌려준다.
-- 무기명 규칙(D-14 안건 1)은 그대로다: 누가 어디에 냈는지는 없고 집계 숫자 둘만 나간다. 진행 중 방은 득표를 숨긴다(POLL-05, D-14 안건 4).
-- 식당 이름은 DB에 없으므로 여전히 나가지 않는다(T0.16-4). 함수 본문은 20261101140000_t7_6_polls.sql과 같고 끝의 두 키만 더했다.
-- 반환형(jsonb)과 권한(anon, authenticated)은 바뀌지 않는다(create or replace는 grant를 유지한다).
create or replace function public.poll_preview(p_code text)
returns jsonb
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  v_poll   public.polls;
  v_member boolean;
begin
  if p_code is null or p_code !~ '^[2-9a-hjkmnp-z]{12}$' then
    return null;
  end if;
  select * into v_poll from public.polls where invite_code = p_code;
  if not found then
    return null;
  end if;

  perform private.close_if_due(v_poll.id);
  select * into v_poll from public.polls where id = v_poll.id;
  v_member := private.is_poll_member(v_poll.id);

  if not v_member and v_poll.closed_at is not null and v_poll.closed_at + interval '24 hours' <= now() then
    return jsonb_build_object('status', 'expired');
  end if;

  return jsonb_build_object(
    'status', v_poll.status,
    'kind', v_poll.kind,
    'title', v_poll.title,
    'multi', v_poll.multi,
    'closes_at', v_poll.closes_at,
    'closed_at', v_poll.closed_at,
    -- 참여자가 아니면 기준점을 약 150m 격자로 내리고 반경을 그만큼 넓힌다(방장 사무실 핀을 정확히 내주지 않게, G7).
    -- 이름 찾기(FD6 반경 검색)는 넓힌 반경으로 해도 같은 후보를 찾는다. 참여자는 get_poll로 정확한 값을 받는다
    'anchor_lat', case when v_member then v_poll.anchor_lat else private.coarse_lat(v_poll.anchor_lat) end,
    'anchor_lng', case when v_member then v_poll.anchor_lng else private.coarse_lng(v_poll.anchor_lng) end,
    'radius_m', case when v_member then v_poll.radius_m else v_poll.radius_m + 150 end,
    'member_count', (select count(*) from public.poll_members as m where m.poll_id = v_poll.id),
    'member_limit', 30,
    'is_member', v_member,
    'poll_id', case when v_member then v_poll.id end,
    'candidates', coalesce((
      select jsonb_agg(jsonb_build_object('position', c.position, 'place_id', c.place_id, 'place_url', c.place_url)
                       order by c.position)
        from public.poll_candidates as c
       where c.poll_id = v_poll.id and c.status = 'approved'
    ), '[]'::jsonb),
    'voted_count', case when v_poll.status = 'closed' and v_poll.winner_place_id is not null then (
      select count(distinct v.member_id) from public.poll_votes as v where v.poll_id = v_poll.id
    ) end,
    'top_votes', case when v_poll.status = 'closed' and v_poll.winner_place_id is not null then (
      select count(*)
        from public.poll_votes as v
        join public.poll_candidates as c on c.id = v.candidate_id
       where v.poll_id = v_poll.id and c.place_id = v_poll.winner_place_id
    ) end
  );
end;
$$;
