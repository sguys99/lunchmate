-- T9.18 문 닫힌 식당 제보 "오늘 쉬어요" 반영 (D-40, PRD PLACE-09, REC 7장)
--
-- 1. place_stats에 closed_today(이번 끼니 안 서로 다른 사람의 "오늘만 쉬어요" 제보 수)를 더한다.
--    끼니 경계는 KST 15시(점심 0~15시, 저녁 15~24시). 이 값은 지금까지 저장만 되고 어디에도 쓰이지 않았다.
--    앱은 1명이면 카드 배지 + 감점, 2명이면 그 끼니 추천에서 뺀다(src/lib/reco). 폐업 집계(today 제외, 3명)는 그대로다.
--    반환 열이 바뀌어 함수를 지우고 다시 만든다(데이터 변화 없음, 같은 트랜잭션). 권한은 전과 같다.
-- 2. 홈 카드 "문이 닫혀 있어요" 되돌리기: 본인의 "오늘만 쉬어요" 제보를 2분 안에만 지울 수 있다(웨이팅 되돌리기와 같은 규칙).
--    다른 제보(아예 닫았어요, 옮겼어요, 가격, 정보)는 여전히 지울 수 없다.
--
-- 파괴적 변경 없음(함수 교체, 정책과 권한 추가).

drop function public.place_stats(text[]);

create or replace function public.place_stats(p_place_ids text[])
returns table (
  place_id         text,
  price_count      int,
  price_median     int,
  price_points     int[],
  thumbs_up        int,
  thumbs_down      int,
  top_tags         jsonb,
  closed_reports   int,
  closed           boolean,
  wait_level       text,
  wait_reported_at timestamptz,
  wait_minutes_ago int,
  deal_count       int,
  closed_today     int
)
language plpgsql
stable
security definer
set search_path = ''
as $$
#variable_conflict use_column
declare
  v_today date := private.kst_today();
  -- 이번 끼니가 시작된 시각(KST 0시 또는 15시). "오늘 쉬어요"는 이 시각 뒤 제보만 센다(D-40, 점심 15시, 저녁 자정까지 유효)
  v_meal_start timestamptz := (
    v_today::timestamp
    + case when extract(hour from (now() at time zone 'Asia/Seoul')) < 15
           then interval '0 hours' else interval '15 hours' end
  ) at time zone 'Asia/Seoul';
begin
  if p_place_ids is null or cardinality(p_place_ids) = 0 then
    return;
  end if;
  if cardinality(p_place_ids) > 60 then
    raise exception 'place_stats_too_many_ids'
      using errcode = 'check_violation',
            hint = '한 번에 60곳까지 조회할 수 있습니다';
  end if;

  return query
  with ids as (
    select distinct i as pid
      from unnest(p_place_ids) as i
     where i ~ '^[0-9]{1,20}$'
  ),
  visible as (
    select r.user_id, r.place_id as pid, r.rating, r.price_krw, r.tags, r.created_at
      from public.reviews as r
     where r.place_id in (select pid from ids)
       and r.hidden_at is null
  ),
  latest_rating as (
    select distinct on (v.user_id, v.pid) v.pid, v.rating
      from visible as v
     order by v.user_id, v.pid, v.created_at desc
  ),
  latest_price as (
    select distinct on (v.user_id, v.pid) v.pid, v.price_krw
      from visible as v
     where v.price_krw is not null
     order by v.user_id, v.pid, v.created_at desc
  ),
  latest_tags as (
    select distinct on (v.user_id, v.pid) v.pid, v.tags
      from visible as v
     where cardinality(v.tags) > 0
     order by v.user_id, v.pid, v.created_at desc
  ),
  thumbs as (
    select lr.pid,
           count(*) filter (where lr.rating = 'up')::int   as up,
           count(*) filter (where lr.rating = 'down')::int as down
      from latest_rating as lr
     group by lr.pid
  ),
  prices as (
    select lp.pid,
           count(*)::int as n,
           (round(percentile_cont(0.5) within group (order by lp.price_krw) / 100.0) * 100)::int as median,
           array_agg(lp.price_krw order by lp.price_krw) as points
      from latest_price as lp
     group by lp.pid
  ),
  tag_counts as (
    select lt.pid, t.tag, count(*)::int as n
      from latest_tags as lt
      cross join lateral unnest(lt.tags) as t(tag)
     group by lt.pid, t.tag
  ),
  tag_ranked as (
    select tc.pid, tc.tag, tc.n,
           row_number() over (partition by tc.pid order by tc.n desc, tc.tag) as rn
      from tag_counts as tc
  ),
  tags_top as (
    select tr.pid,
           jsonb_agg(jsonb_build_object('tag', tr.tag, 'count', tr.n) order by tr.rn) as tags
      from tag_ranked as tr
     where tr.rn <= 5
     group by tr.pid
  ),
  decisions as (
    select pm.place_id as pid, pm.closed_status, pm.decided_at
      from public.place_moderation as pm
     where pm.place_id in (select pid from ids)
  ),
  closed_counts as (
    select pr.place_id as pid, count(distinct pr.user_id)::int as n
      from public.place_reports as pr
      left join decisions as dc on dc.pid = pr.place_id
     where pr.place_id in (select pid from ids)
       and pr.kind = 'closed'
       and coalesce(pr.detail ->> 'closed', '') <> 'today'
       and (dc.closed_status is distinct from 'dismissed' or pr.created_at > dc.decided_at)
     group by pr.place_id
  ),
  waits as (
    select distinct on (w.place_id) w.place_id as pid, w.level, w.created_at
      from public.wait_reports as w
     where w.place_id in (select pid from ids)
       and w.created_at > now() - interval '30 minutes'
     order by w.place_id, w.created_at desc
  ),
  today_closed as (
    select pr.place_id as pid, count(distinct pr.user_id)::int as n
      from public.place_reports as pr
     where pr.place_id in (select pid from ids)
       and pr.kind = 'closed'
       and pr.detail ->> 'closed' = 'today'
       and pr.created_at >= v_meal_start
     group by pr.place_id
  ),
  deals as (
    select d.place_id as pid, count(*)::int as n
      from public.place_deals as d
     where d.place_id in (select pid from ids)
       and d.status = 'active'
       and d.starts_on <= v_today
       and d.ends_on >= v_today
     group by d.place_id
  )
  select ids.pid,
         coalesce(prices.n, 0),
         prices.median,
         coalesce(prices.points, '{}'::int[]),
         coalesce(thumbs.up, 0),
         coalesce(thumbs.down, 0),
         coalesce(tags_top.tags, '[]'::jsonb),
         coalesce(closed_counts.n, 0),
         coalesce(closed_counts.n, 0) >= 3 or coalesce(decisions.closed_status = 'confirmed', false),
         waits.level,
         waits.created_at,
         case when waits.created_at is null then null
              else greatest(0, floor(extract(epoch from (now() - waits.created_at)) / 60))::int end,
         coalesce(deals.n, 0),
         coalesce(today_closed.n, 0)
    from ids
    left join prices        on prices.pid = ids.pid
    left join thumbs        on thumbs.pid = ids.pid
    left join tags_top      on tags_top.pid = ids.pid
    left join decisions     on decisions.pid = ids.pid
    left join closed_counts on closed_counts.pid = ids.pid
    left join waits         on waits.pid = ids.pid
    left join deals         on deals.pid = ids.pid
    left join today_closed  on today_closed.pid = ids.pid;
end;
$$;

comment on function public.place_stats is
  '식당별 익명 집계: 가격 중앙값과 값 목록, 👍/👎, 태그 상위 5, 폐업 제보 수(관리자 결정 반영), 30분 안 웨이팅 1건, 할인 수, 이번 끼니 "오늘 쉬어요" 제보 수. 글과 작성자 없음 (T6.6, T8.5, T9.18, AC-FB-2)';

revoke all on function public.place_stats(text[]) from public;
grant execute on function public.place_stats(text[]) to anon, authenticated, service_role;

-- 되돌리기: 2분 안의 내 "오늘만 쉬어요" 제보만 (D-40)
create policy "place_reports: 본인 오늘 쉬어요 2분 안 삭제"
  on public.place_reports for delete to authenticated
  using (
    (select auth.uid()) = user_id
    and kind = 'closed'
    and detail ->> 'closed' = 'today'
    and created_at > now() - interval '2 minutes'
  );

grant delete on table public.place_reports to authenticated;
