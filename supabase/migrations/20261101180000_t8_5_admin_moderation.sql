-- T8.5 관리자 화면 (/admin): 신고 후기, 폐업 제보, 사용자 정지 (MOD-06) + MOD-02, MOD-03 보완
-- PRD: MOD-02, MOD-03, MOD-06, AC-FB-2, 11.2절, 11.4절
-- 결정: design-decisions D-19, docs/design/g8-comparison-admin.md 5절 안건 1~15(기본안)과 "스키마 변경" 표.
--       안건 6(정지 효과)은 사용자 결정: 쓰기 차단 + 공개 후기 숨김, 로그인 허용(Supabase Auth ban은 쓰지 않는다).
--
-- 이 파일이 하는 일 (파괴적 변경 없음: 열과 테이블을 더하고, 함수와 트리거 함수를 같은 모양으로 바꾼다)
-- 1. profiles: suspended_until, suspended_reason 열 추가(사용자 열 권한 없음). 둘 다 정지 중일 때만 값.
-- 2. private.is_admin(), private.is_active_user(): 관리자 판별, 정지 여부(기간이 지났으면 크론 전이라도 이용 중으로 본다).
-- 3. 정지 사용자 쓰기 차단: 공통 before 트리거 하나(private.block_suspended_writer)를 쓰기 테이블에 붙인다.
--    정책 with check 대신 트리거를 쓴 이유: 투표, 할인, 웨이팅 쓰기는 security definer 함수(create_poll, cast_vote,
--    add_poll_candidate, register_deal, report_wait)가 RLS를 건너뛰고 넣는다. 트리거는 그 안에서도 돈다.
--    auth.uid()가 없는 실행(pg_cron, service role)은 막지 않는다.
-- 4. reviews.moderated_at, place_deals.moderated_at 추가. 자동 숨김 트리거(review_reports_after_insert)는
--    관리자 결정 뒤에 들어온 신고만 센다(안건 9: 복구한 글이 신고 1건에 다시 숨겨지지 않게).
-- 5. public.place_moderation(새): 폐업 결정(confirmed/dismissed). place_stats.closed가 이 값을 반영한다(안건 11).
--    저장하는 카카오 값은 place_id뿐이다(T0.16).
-- 6. private.moderation_actions(새): 처리 이력 1년 보관(안건 5). 되돌리기용 이전 상태(prev_state)를 함께 둔다.
-- 7. 관리자 함수 public.admin_*: 모두 첫 줄에서 관리자를 확인하고, security definer, search_path = ''.
--    비공개 후기의 글(body)은 관리자 응답에도 나오지 않는다(안건 3, AC-FB-2, CLAUDE.md 7장).
-- 8. pg_cron: 기간 지난 정지 자동 해제(10분마다), 1년 지난 처리 이력 삭제(매일 04:40 KST).
-- 9. 탈퇴(PRD 11.4): moderation_actions의 사용자 id는 on delete set null(익명), 지운 글 id는 트리거가 null로 바꾼다.
--
-- 표(g8-comparison-admin.md 5절 "스키마 변경")와 다른 점 (적용 전 승인 요청에 적는다)
-- - moderation_actions.prev_state jsonb: admin_undo가 처리 직전 상태로 정확히 되돌리려면 필요하다.
-- - moderation_actions.reverted_by는 "되돌린 관리자 id"로, 되돌린 시각 reverted_at을 함께 둔다.
-- - action 값에 user_clear 추가: 사용자 큐의 "문제없음". 그 뒤 새로 숨겨진 글만 다시 후보 기준(2건)에 센다(안건 14).
-- - 관리자 함수 이름: admin_decide_item에 같은 작성자 일괄 숨김 인자(p_include_author), admin_clear_user 추가.
--
-- 규칙: 이미 푸시된 마이그레이션은 고치지 않는다(CLAUDE.md 11장). 새 테이블은 이 파일에서 RLS를 켜고 정책을 만든다.

-- ─────────────────────────────────────────────────────────────
-- 1. profiles: 정지 기간과 사유
-- ─────────────────────────────────────────────────────────────
alter table public.profiles
  add column suspended_until  timestamptz,
  add column suspended_reason text;

alter table public.profiles
  add constraint profiles_suspended_reason_values check (
    suspended_reason is null
    or suspended_reason in ('repeated', 'spam', 'abuse', 'privacy', 'other')
  ),
  -- 정지 중일 때만 값이 있다. suspended_until null + 정지 중 = 해제할 때까지
  add constraint profiles_suspension_fields check (
    status = 'suspended' or (suspended_until is null and suspended_reason is null)
  );

comment on column public.profiles.suspended_until is
  '정지 끝 시각. null이면 해제할 때까지. 지나면 pg_cron(lunchmate_expire_suspensions)이 active로 되돌린다 (T8.5)';
comment on column public.profiles.suspended_reason is
  'repeated 신고 누적, spam 광고 도배, abuse 욕설과 비방, privacy 개인정보 노출, other 기타 (T8.5)';
-- 열 권한: T4.4의 update 권한 목록(nickname, avatar_url, 동의 시각)에 없으므로 사용자는 이 두 열을 바꿀 수 없다.
-- 본인 읽기 정책은 그대로라 본인은 정지 안내에 쓸 값을 읽는다.

-- ─────────────────────────────────────────────────────────────
-- 2. 관리자 판별, 이용 중 판별
-- ─────────────────────────────────────────────────────────────
-- 관리자 지정은 Supabase SQL 편집기에서만 한다(role은 사용자 열 권한이 없다, T4.4, PRD Q9).
create or replace function private.is_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.profiles as p
     where p.user_id = auth.uid()
       and p.role = 'admin'
  );
$$;

-- 지금 세션 사용자가 쓰기를 할 수 있는지. 정지 기간이 지났으면 크론이 돌기 전이라도 이용 중으로 본다.
-- 세션이 없으면(pg_cron, service role) true: 시스템 작업은 막지 않는다.
create or replace function private.is_active_user()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select case
    when auth.uid() is null then true
    else coalesce((
      select p.status = 'active'
             or (p.suspended_until is not null and p.suspended_until <= now())
        from public.profiles as p
       where p.user_id = auth.uid()
    ), true)
  end;
$$;

revoke all on function private.is_admin() from public, anon, authenticated;
revoke all on function private.is_active_user() from public, anon, authenticated;

-- ─────────────────────────────────────────────────────────────
-- 3. 정지 사용자 쓰기 차단 (안건 6)
-- ─────────────────────────────────────────────────────────────
-- 막는 것: 후기 쓰기와 고치기, 후기와 할인 신고, 식당 정보 제보, 할인 제보, 할인 확인, 웨이팅 제보,
--          투표방 만들기, 투표, 후보 넣기와 제안. 지우기(내 후기, 내 확인 응답, 웨이팅 2분 되돌리기)와 로그인, 탈퇴는 막지 않는다.
-- 남의 행동이 일으킨 갱신(신고 3건 자동 숨김이 정지된 작성자의 후기를 고침 등)은 행동한 사람의 세션으로 판정하므로 막히지 않는다.
-- polls는 insert만 막는다(정지된 참여자가 투표방을 열 때 마감 판정 close_if_due가 polls를 고치기 때문).
create or replace function private.block_suspended_writer()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not private.is_active_user() then
    raise exception 'account_suspended'
      using errcode = '42501',
            hint = '이용이 제한된 계정입니다';
  end if;
  return new;
end;
$$;

revoke all on function private.block_suspended_writer() from public, anon, authenticated;

create trigger block_suspended_writer
  before insert or update on public.reviews
  for each row execute function private.block_suspended_writer();
create trigger block_suspended_writer
  before insert on public.review_reports
  for each row execute function private.block_suspended_writer();
create trigger block_suspended_writer
  before insert on public.place_reports
  for each row execute function private.block_suspended_writer();
create trigger block_suspended_writer
  before insert on public.place_deals
  for each row execute function private.block_suspended_writer();
create trigger block_suspended_writer
  before insert or update on public.place_deal_checks
  for each row execute function private.block_suspended_writer();
create trigger block_suspended_writer
  before insert on public.wait_reports
  for each row execute function private.block_suspended_writer();
create trigger block_suspended_writer
  before insert on public.polls
  for each row execute function private.block_suspended_writer();
create trigger block_suspended_writer
  before insert on public.poll_votes
  for each row execute function private.block_suspended_writer();
create trigger block_suspended_writer
  before insert on public.poll_candidates
  for each row execute function private.block_suspended_writer();

-- ─────────────────────────────────────────────────────────────
-- 4. 관리자 결정 시각과 자동 숨김 (안건 9)
-- ─────────────────────────────────────────────────────────────
alter table public.reviews add column moderated_at timestamptz;
alter table public.place_deals add column moderated_at timestamptz;

comment on column public.reviews.moderated_at is
  '관리자가 마지막으로 결정한 시각(숨김 확정, 복구, 문제없음). 자동 숨김은 이 뒤에 들어온 신고만 센다 (T8.5, 안건 9)';
comment on column public.place_deals.moderated_at is
  '관리자가 마지막으로 결정한 시각. 자동 숨김은 이 뒤에 들어온 신고만 센다 (T8.5, 안건 9)';
-- 열 권한: reviews의 insert, update 권한 목록에 없고 place_deals는 쓰기 권한이 없으므로 사용자는 바꿀 수 없다.

-- 서로 다른 3명이면 자동 숨김 (MOD-02). 관리자 결정(moderated_at) 뒤의 신고만 센다. 1인 1회라 행 수 = 신고자 수
create or replace function private.review_reports_after_insert()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_since timestamptz;
begin
  if new.target_type = 'review' then
    select r.moderated_at into v_since from public.reviews as r where r.id = new.review_id;
    if (
      select count(*) from public.review_reports as rr
       where rr.review_id = new.review_id
         and rr.created_at > coalesce(v_since, '-infinity'::timestamptz)
    ) >= 3 then
      update public.reviews
         set hidden_at = now(), hidden_reason = 'reports'
       where id = new.review_id and hidden_at is null;
    end if;
  else
    select d.moderated_at into v_since from public.place_deals as d where d.id = new.deal_id;
    if (
      select count(*) from public.review_reports as rr
       where rr.deal_id = new.deal_id
         and rr.created_at > coalesce(v_since, '-infinity'::timestamptz)
    ) >= 3 then
      update public.place_deals
         set status = 'hidden', hidden_reason = 'reports', hidden_at = now()
       where id = new.deal_id and status = 'active';
    end if;
  end if;
  return null;
end;
$$;

-- ─────────────────────────────────────────────────────────────
-- 5. place_moderation: 폐업 결정 (MOD-03, 안건 11)
-- ─────────────────────────────────────────────────────────────
-- confirmed: 제보 수와 상관없이 추천 제외. dismissed: 결정 시각 뒤의 제보만 센다.
create table public.place_moderation (
  place_id      text primary key,
  closed_status text not null,
  decided_at    timestamptz not null default now(),
  decided_by    uuid references auth.users (id) on delete set null,

  constraint place_moderation_place_id_format check (place_id ~ '^[0-9]{1,20}$'),
  constraint place_moderation_status_values check (closed_status in ('confirmed', 'dismissed'))
);

comment on table public.place_moderation is
  '관리자 폐업 결정. 카카오 값은 place_id뿐(T0.16). 직접 접근 없음, place_stats와 admin_* 함수만 읽고 쓴다 (MOD-03, T8.5)';

alter table public.place_moderation enable row level security;

-- 사용자 역할은 어떤 행도 읽거나 쓰지 못한다(명시적 거절 정책). 읽기와 쓰기는 소유자 권한 함수만
create policy "place_moderation: 직접 접근 없음"
  on public.place_moderation as restrictive for all to anon, authenticated
  using (false)
  with check (false);

revoke all on table public.place_moderation from public, anon, authenticated;
grant all on table public.place_moderation to service_role;

-- 식당별 익명 집계 (T6.6과 같은 모양). 바뀐 곳은 closed_counts와 closed 판정뿐이다.
-- - dismissed: 결정 시각 뒤의 "문 닫았어요"만 센다. confirmed: 제보 수와 상관없이 closed = true.
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
  deal_count       int
)
language plpgsql
stable
security definer
set search_path = ''
as $$
#variable_conflict use_column
declare
  v_today date := private.kst_today();
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
         coalesce(deals.n, 0)
    from ids
    left join prices        on prices.pid = ids.pid
    left join thumbs        on thumbs.pid = ids.pid
    left join tags_top      on tags_top.pid = ids.pid
    left join decisions     on decisions.pid = ids.pid
    left join closed_counts on closed_counts.pid = ids.pid
    left join waits         on waits.pid = ids.pid
    left join deals         on deals.pid = ids.pid;
end;
$$;

comment on function public.place_stats is
  '식당별 익명 집계: 가격 중앙값과 값 목록, 👍/👎, 태그 상위 5, 폐업 제보 수(관리자 결정 반영), 30분 안 웨이팅 1건, 할인 수. 글과 작성자 없음 (T6.6, T8.5, AC-FB-2)';

-- ─────────────────────────────────────────────────────────────
-- 6. private.moderation_actions: 처리 이력 (안건 5, 1년 보관)
-- ─────────────────────────────────────────────────────────────
create table private.moderation_actions (
  id              uuid primary key default gen_random_uuid(),
  -- 처리한 관리자. null = 시스템(정지 기간 만료 자동 해제) 또는 탈퇴한 관리자
  admin_id        uuid references auth.users (id) on delete set null,
  action          text not null,
  target_type     text not null,
  -- 후기 또는 할인 id. 글이 지워지면 트리거(moderation_forget_target)가 null로 바꾼다
  target_id       uuid,
  target_place_id text,
  -- 대상 사용자(후기, 할인 작성자 또는 정지 대상). 탈퇴하면 null(익명)
  target_user_id  uuid references auth.users (id) on delete set null,
  reason          text,
  duration        text,
  -- 처리 직전 상태. admin_undo가 이 값으로 되돌린다
  prev_state      jsonb,
  reverted_at     timestamptz,
  reverted_by     uuid references auth.users (id) on delete set null,
  created_at      timestamptz not null default now(),

  constraint moderation_actions_action_values check (action in (
    'review_hide', 'review_restore', 'deal_hide', 'deal_restore',
    'closed_confirm', 'closed_dismiss',
    'user_suspend', 'user_unsuspend', 'user_clear'
  )),
  constraint moderation_actions_target_type_values check (target_type in ('review', 'deal', 'place', 'user')),
  constraint moderation_actions_place_id_format check (target_place_id is null or target_place_id ~ '^[0-9]{1,20}$'),
  constraint moderation_actions_reason_format check (reason is null or reason ~ '^[a-z_]{1,20}$'),
  constraint moderation_actions_duration_values check (duration is null or duration in ('d7', 'd30', 'indefinite')),
  constraint moderation_actions_reverted_pair check (reverted_at is not null or reverted_by is null)
);

comment on table private.moderation_actions is
  '관리자 처리 이력(MOD-06). 1년 보관(pg_cron). 읽기와 쓰기는 admin_* 함수만. 탈퇴 시 사용자 id는 null, 글 id는 트리거가 null (T8.5, 안건 5)';

create index moderation_actions_created_idx on private.moderation_actions (created_at desc);
create index moderation_actions_target_idx on private.moderation_actions (target_id) where target_id is not null;
create index moderation_actions_target_user_idx on private.moderation_actions (target_user_id, created_at desc)
  where target_user_id is not null;
create index moderation_actions_target_place_idx on private.moderation_actions (target_place_id, created_at desc)
  where target_place_id is not null;
-- 외래 키 삭제(set null) 때 순차 탐색을 피한다
create index moderation_actions_admin_idx on private.moderation_actions (admin_id) where admin_id is not null;
create index moderation_actions_reverted_by_idx on private.moderation_actions (reverted_by) where reverted_by is not null;

alter table private.moderation_actions enable row level security;

create policy "moderation_actions: 직접 접근 없음"
  on private.moderation_actions as restrictive for all to anon, authenticated
  using (false)
  with check (false);

revoke all on table private.moderation_actions from public, anon, authenticated;
grant all on table private.moderation_actions to service_role;

-- 글이 지워지면(작성자 삭제, 탈퇴 cascade) 이력의 글 id를 지운다. 처리 종류와 시각, 장소 번호만 남는다
create or replace function private.moderation_forget_target()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  update private.moderation_actions
     set target_id = null
   where target_id = old.id;
  return null;
end;
$$;

revoke all on function private.moderation_forget_target() from public, anon, authenticated;

create trigger moderation_forget_target
  after delete on public.reviews
  for each row execute function private.moderation_forget_target();
create trigger moderation_forget_target
  after delete on public.place_deals
  for each row execute function private.moderation_forget_target();

-- ─────────────────────────────────────────────────────────────
-- 7. 관리자 함수 (admin_*)
-- ─────────────────────────────────────────────────────────────
-- 공통: 첫 줄에서 private.is_admin()을 확인하고 아니면 admin_only(42501)로 거절한다.
-- 비공개 후기(is_public = false)의 body는 어떤 관리자 응답에도 넣지 않는다(안건 3, AC-FB-2).

create or replace function private.assert_admin()
returns uuid
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  if auth.uid() is null or not private.is_admin() then
    raise exception 'admin_only' using errcode = '42501';
  end if;
  return auth.uid();
end;
$$;

revoke all on function private.assert_admin() from public, anon, authenticated;

-- 사용자 처리 지표: 받은 신고, 숨겨진 글, 마지막 사용자 결정(정지, 해제, 문제없음) 뒤 숨겨진 글
create or replace function private.user_moderation_stats(p_user_id uuid)
returns table (reports_received int, hidden_count int, hidden_since_review int)
language sql
stable
security definer
set search_path = ''
as $$
  with last_review as (
    select max(m.created_at) as at
      from private.moderation_actions as m
     where m.target_user_id = p_user_id
       and m.action in ('user_suspend', 'user_unsuspend', 'user_clear')
       and m.admin_id is not null
       and m.reverted_at is null
  ),
  hidden as (
    select r.hidden_at from public.reviews as r
     where r.user_id = p_user_id and r.hidden_at is not null
    union all
    select d.hidden_at from public.place_deals as d
     where d.user_id = p_user_id and d.status = 'hidden' and d.hidden_reason in ('reports', 'admin')
  )
  select
    ((select count(*) from public.review_reports as rr
       join public.reviews as r on r.id = rr.review_id
      where r.user_id = p_user_id)
     + (select count(*) from public.review_reports as rr
       join public.place_deals as d on d.id = rr.deal_id
      where d.user_id = p_user_id))::int,
    (select count(*) from hidden)::int,
    (select count(*) from hidden as h, last_review as lr
      where h.hidden_at > coalesce(lr.at, '-infinity'::timestamptz))::int;
$$;

revoke all on function private.user_moderation_stats(uuid) from public, anon, authenticated;

-- 신고된 후기와 할인 검토 큐 (MOD-02, 안건 3, 10)
-- - 관리자 결정(moderated_at) 뒤의 신고가 있는 글만. 관리자가 숨김을 확정한 글(hidden_reason admin)은 빠진다.
-- - 할인은 지금 보이는 것과 신고 3건으로 숨겨진 것만(교체, 끝났어요, 종료된 것은 이미 보이지 않는다).
-- - body: 후기는 지금 공개인 글만, 비공개로 바뀐 글은 null + private_now. 할인 내용은 공개 정보라 그대로.
-- - 순서: 자동 숨김 먼저, 신고 많은 순, 첫 신고 오래된 순(시안 공통 규칙). 200건까지.
create or replace function public.admin_reported_items()
returns table (
  target_type            text,
  target_id              uuid,
  place_id               text,
  body                   text,
  rating                 text,
  private_now            boolean,
  auto_hidden            boolean,
  reasons                jsonb,
  notes                  text[],
  report_count           int,
  first_reported_at      timestamptz,
  written_at             timestamptz,
  author_id              uuid,
  author_nickname        text,
  author_provider        text,
  author_joined_at       timestamptz,
  author_status          text,
  author_suspended_until timestamptz,
  author_reports_received int,
  author_hidden_count    int
)
language plpgsql
stable
security definer
set search_path = ''
as $$
#variable_conflict use_column
begin
  perform private.assert_admin();

  return query
  with pending as (
    select 'review'::text as ttype, r.id as tid, r.place_id as pid,
           case when r.is_public then r.body end as tbody,
           r.rating as trating, not r.is_public as tprivate,
           coalesce(r.hidden_reason = 'reports', false) as tauto,
           r.created_at as twritten, r.user_id as tauthor, r.moderated_at as tsince
      from public.reviews as r
     where r.hidden_reason is distinct from 'admin'
       and exists (
         select 1 from public.review_reports as rr
          where rr.review_id = r.id
            and rr.created_at > coalesce(r.moderated_at, '-infinity'::timestamptz)
       )
    union all
    select 'deal'::text, d.id, d.place_id, d.content, null::text, false,
           d.status = 'hidden',
           d.created_at, d.user_id, d.moderated_at
      from public.place_deals as d
     where ((d.status = 'active' and d.ends_on >= private.kst_today())
            or (d.status = 'hidden' and d.hidden_reason = 'reports'))
       and exists (
         select 1 from public.review_reports as rr
          where rr.deal_id = d.id
            and rr.created_at > coalesce(d.moderated_at, '-infinity'::timestamptz)
       )
  ),
  tallies as (
    select p.tid,
           count(*)::int as n,
           min(rr.created_at) as first_at,
           array_remove(array_agg(rr.note order by rr.created_at), null) as tnotes
      from pending as p
      join public.review_reports as rr
        on (p.ttype = 'review' and rr.review_id = p.tid) or (p.ttype = 'deal' and rr.deal_id = p.tid)
     where rr.created_at > coalesce(p.tsince, '-infinity'::timestamptz)
     group by p.tid
  ),
  reason_counts as (
    select x.tid, jsonb_object_agg(x.reason, x.n) as tr
      from (
        select p.tid, rr.reason, count(*)::int as n
          from pending as p
          join public.review_reports as rr
            on (p.ttype = 'review' and rr.review_id = p.tid) or (p.ttype = 'deal' and rr.deal_id = p.tid)
         where rr.created_at > coalesce(p.tsince, '-infinity'::timestamptz)
         group by p.tid, rr.reason
      ) as x
     group by x.tid
  )
  select p.ttype, p.tid, p.pid, p.tbody, p.trating, p.tprivate, p.tauto,
         rc.tr, t.tnotes, t.n, t.first_at, p.twritten,
         p.tauthor, pf.nickname, pf.provider, pf.created_at, pf.status, pf.suspended_until,
         st.reports_received, st.hidden_count
    from pending as p
    join tallies as t on t.tid = p.tid
    join reason_counts as rc on rc.tid = p.tid
    join public.profiles as pf on pf.user_id = p.tauthor
    cross join lateral private.user_moderation_stats(p.tauthor) as st
   order by p.tauto desc, t.n desc, t.first_at asc
   limit 200;
end;
$$;

comment on function public.admin_reported_items is
  '관리자 전용 신고 검토 큐. 비공개 후기 글은 null + private_now (MOD-02, MOD-06, AC-FB-2, T8.5)';

-- 폐업 제보 검토 큐 (MOD-03, 안건 11)
-- - 결정이 없거나 dismissed면 그 뒤의 "문 닫았어요"만. confirmed는 빠진다.
-- - gone, moved, today, unspecified: 종류별 서로 다른 사람 수. closed_count: today를 뺀 사람 수(3 이상이면 지금 추천 제외 중).
-- - "오늘만 쉬어요"만 있는 장소는 결정할 것이 없어 빠진다. place_url은 가장 최근 제보의 값(카카오 저장 허용 값).
create or replace function public.admin_closures()
returns table (
  place_id         text,
  place_url        text,
  gone             int,
  moved            int,
  today            int,
  unspecified      int,
  closed_count     int,
  first_reported_at timestamptz,
  last_reported_at timestamptz,
  dismissed_at     timestamptz
)
language plpgsql
stable
security definer
set search_path = ''
as $$
#variable_conflict use_column
begin
  perform private.assert_admin();

  return query
  with open_reports as (
    select pr.place_id as pid, pr.user_id, pr.detail ->> 'closed' as kind, pr.place_url as url,
           pr.created_at, pm.decided_at as dismissed
      from public.place_reports as pr
      left join public.place_moderation as pm on pm.place_id = pr.place_id
     where pr.kind = 'closed'
       and (pm.place_id is null or (pm.closed_status = 'dismissed' and pr.created_at > pm.decided_at))
  ),
  grouped as (
    select o.pid,
           (array_agg(o.url order by o.created_at desc) filter (where o.url is not null))[1] as url,
           count(distinct o.user_id) filter (where o.kind = 'gone')::int as gone,
           count(distinct o.user_id) filter (where o.kind = 'moved')::int as moved,
           count(distinct o.user_id) filter (where o.kind = 'today')::int as today,
           count(distinct o.user_id) filter (where o.kind is null)::int as unspecified,
           count(distinct o.user_id) filter (where coalesce(o.kind, '') <> 'today')::int as closed_n,
           min(o.created_at) as first_at,
           max(o.created_at) as last_at,
           max(o.dismissed) as dismissed
      from open_reports as o
     group by o.pid
  )
  select g.pid, g.url, g.gone, g.moved, g.today, g.unspecified, g.closed_n,
         g.first_at, g.last_at, g.dismissed
    from grouped as g
   where g.closed_n >= 1
   order by (g.closed_n >= 3) desc, g.closed_n desc, g.first_at asc
   limit 200;
end;
$$;

comment on function public.admin_closures is
  '관리자 전용 폐업 제보 큐. 오늘만 쉬어요는 폐업 수에 세지 않는다 (MOD-03, MOD-06, T8.5)';

-- 사용자 (안건 6, 7, 14)
-- - p_query 없음: candidate(이용 중, 일반 사용자, 마지막 사용자 결정 뒤 숨겨진 글 2건 이상) + suspended(정지 중 전부)
-- - p_query 있음(1~20자): 닉네임에 포함되는 사용자 20명(kind match)
-- - recent_items: 신고받았거나 숨겨진 최근 글 5개. 비공개 후기는 body null + private_now
create or replace function public.admin_users(p_query text default null)
returns table (
  kind                text,
  user_id             uuid,
  nickname            text,
  provider            text,
  joined_at           timestamptz,
  role                text,
  status              text,
  suspended_until     timestamptz,
  suspended_reason    text,
  reports_received    int,
  hidden_count        int,
  hidden_since_review int,
  recent_items        jsonb
)
language plpgsql
stable
security definer
set search_path = ''
as $$
#variable_conflict use_column
declare
  v_query text := nullif(btrim(coalesce(p_query, '')), '');
  v_like  text;
begin
  perform private.assert_admin();

  if v_query is not null and char_length(v_query) > 20 then
    raise exception 'admin_query_too_long' using errcode = 'check_violation';
  end if;
  v_like := case when v_query is null then null
                 else '%' || replace(replace(replace(v_query, '\', '\\'), '%', '\%'), '_', '\_') || '%' end;

  return query
  with picked as (
    select case
             when v_like is not null then 'match'
             when p.status = 'suspended' then 'suspended'
             else 'candidate'
           end as k,
           p.*
      from public.profiles as p
     where (v_like is not null and p.nickname ilike v_like)
        or (v_like is null and p.status = 'suspended')
        or (v_like is null and p.status = 'active' and p.role = 'user'
            and (select s.hidden_since_review from private.user_moderation_stats(p.user_id) as s) >= 2)
  )
  select pk.k, pk.user_id, pk.nickname, pk.provider, pk.created_at, pk.role, pk.status,
         pk.suspended_until, pk.suspended_reason,
         st.reports_received, st.hidden_count, st.hidden_since_review,
         coalesce((
           select jsonb_agg(to_jsonb(it) order by it.written_at desc)
             from (
               select x.* from (
                 select 'review'::text as target_type, r.id as target_id, r.place_id,
                        case when r.is_public then r.body end as body,
                        not r.is_public as private_now,
                        r.hidden_at is not null as hidden,
                        (select count(*)::int from public.review_reports as rr where rr.review_id = r.id) as report_count,
                        r.created_at as written_at
                   from public.reviews as r
                  where r.user_id = pk.user_id
                    and (r.hidden_at is not null
                         or exists (select 1 from public.review_reports as rr where rr.review_id = r.id))
                 union all
                 select 'deal'::text, d.id, d.place_id, d.content, false,
                        d.status = 'hidden' and d.hidden_reason in ('reports', 'admin'),
                        (select count(*)::int from public.review_reports as rr where rr.deal_id = d.id),
                        d.created_at
                   from public.place_deals as d
                  where d.user_id = pk.user_id
                    and ((d.status = 'hidden' and d.hidden_reason in ('reports', 'admin'))
                         or exists (select 1 from public.review_reports as rr where rr.deal_id = d.id))
               ) as x
               order by x.written_at desc
               limit 5
             ) as it
         ), '[]'::jsonb)
    from picked as pk
    cross join lateral private.user_moderation_stats(pk.user_id) as st
   order by case pk.k when 'candidate' then 0 when 'match' then 1 else 2 end,
            st.hidden_since_review desc,
            pk.suspended_until asc nulls last,
            pk.created_at asc
   limit 100;
end;
$$;

comment on function public.admin_users is
  '관리자 전용 사용자 목록: 정지 검토 후보, 정지 중, 닉네임 찾기. 비공개 후기 글은 null (MOD-06, T8.5)';

-- 처리 이력 (안건 5). 최신순, 기본 100건(최대 500). undoable: 관리자 처리이고, 되돌리지 않았고, 같은 대상에 그 뒤의 처리가 없고, 글이 남아 있음
create or replace function public.admin_log(p_limit int default 100)
returns table (
  id              uuid,
  created_at      timestamptz,
  action          text,
  target_type     text,
  target_id       uuid,
  target_place_id text,
  target_user_id  uuid,
  target_nickname text,
  reason          text,
  duration        text,
  by_system       boolean,
  admin_nickname  text,
  reverted_at     timestamptz,
  undoable        boolean
)
language plpgsql
stable
security definer
set search_path = ''
as $$
#variable_conflict use_column
begin
  perform private.assert_admin();

  return query
  select m.id, m.created_at, m.action, m.target_type, m.target_id, m.target_place_id, m.target_user_id,
         tp.nickname,
         m.reason, m.duration,
         coalesce(m.admin_id is null and m.reason = 'expired', false),
         ap.nickname,
         m.reverted_at,
         m.reverted_at is null
           and m.admin_id is not null
           and (m.target_type not in ('review', 'deal') or m.target_id is not null)
           and not private.moderation_has_later(m.id)
    from private.moderation_actions as m
    left join public.profiles as tp on tp.user_id = m.target_user_id
    left join public.profiles as ap on ap.user_id = m.admin_id
   order by m.created_at desc
   limit least(greatest(coalesce(p_limit, 100), 1), 500);
end;
$$;

comment on function public.admin_log is
  '관리자 전용 처리 이력(1년 보관). 되돌릴 수 있는지(undoable) 함께 (MOD-06, T8.5)';

-- 같은 대상에 이 처리 뒤의 (되돌리지 않은) 처리가 있는지. 있으면 이 처리는 되돌릴 수 없다(나중 결정을 덮지 않게)
create or replace function private.moderation_has_later(p_action_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
      from private.moderation_actions as m
      join private.moderation_actions as later
        on later.target_type = m.target_type
       and later.created_at > m.created_at
       and later.reverted_at is null
       and later.id <> m.id
       and (
         (m.target_type in ('review', 'deal') and later.target_id = m.target_id)
         or (m.target_type = 'place' and later.target_place_id = m.target_place_id)
         or (m.target_type = 'user' and later.target_user_id = m.target_user_id)
       )
     where m.id = p_action_id
  );
$$;

revoke all on function private.moderation_has_later(uuid) from public, anon, authenticated;

-- 후기, 할인 한 건 처리(내부용). 잠금 → 이전 상태 기록 → 반영 → 이력. 처리할 수 없는 상태면 moderation_target_unavailable
create or replace function private.moderate_target(
  p_admin  uuid,
  p_type   text,
  p_id     uuid,
  p_result text,
  p_reason text
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_review public.reviews;
  v_deal   public.place_deals;
  v_prev   jsonb;
  v_action uuid;
begin
  if p_type = 'review' then
    select * into v_review from public.reviews where id = p_id for update;
    if not found or (v_review.hidden_reason = 'admin' and p_result = 'hide') then
      raise exception 'moderation_target_unavailable' using errcode = 'check_violation';
    end if;
    v_prev := jsonb_build_object(
      'hidden_at', v_review.hidden_at,
      'hidden_reason', v_review.hidden_reason,
      'moderated_at', v_review.moderated_at
    );
    if p_result = 'hide' then
      update public.reviews
         set hidden_at = coalesce(hidden_at, now()), hidden_reason = 'admin', moderated_at = now()
       where id = p_id;
    else
      update public.reviews
         set hidden_at = null, hidden_reason = null, moderated_at = now()
       where id = p_id;
    end if;
    insert into private.moderation_actions (
      admin_id, action, target_type, target_id, target_place_id, target_user_id, reason, prev_state
    ) values (
      p_admin, case p_result when 'hide' then 'review_hide' else 'review_restore' end, 'review',
      p_id, v_review.place_id, v_review.user_id, case when p_result = 'hide' then p_reason end, v_prev
    )
    returning id into v_action;
  else
    select * into v_deal from public.place_deals where id = p_id for update;
    if not found
       or not (v_deal.status = 'active' or (v_deal.status = 'hidden' and v_deal.hidden_reason in ('reports', 'admin')))
       or (v_deal.hidden_reason = 'admin' and p_result = 'hide') then
      raise exception 'moderation_target_unavailable' using errcode = 'check_violation';
    end if;
    v_prev := jsonb_build_object(
      'status', v_deal.status,
      'hidden_reason', v_deal.hidden_reason,
      'hidden_at', v_deal.hidden_at,
      'moderated_at', v_deal.moderated_at
    );
    if p_result = 'hide' then
      update public.place_deals
         set status = 'hidden', hidden_reason = 'admin',
             hidden_at = case when status = 'hidden' then hidden_at else now() end,
             moderated_at = now()
       where id = p_id;
    elsif v_deal.status = 'hidden' then
      -- 숨긴 사이 같은 식당, 같은 유형의 새 제보가 올라왔으면 되살릴 자리가 없다(유일 키)
      if exists (
        select 1 from public.place_deals as o
         where o.place_id = v_deal.place_id and o.source = v_deal.source and o.type = v_deal.type
           and o.status = 'active' and o.id <> p_id
      ) then
        raise exception 'moderation_conflict' using errcode = 'check_violation';
      end if;
      update public.place_deals
         set status = case when ends_on < private.kst_today() then 'expired' else 'active' end,
             hidden_reason = null, hidden_at = null, moderated_at = now()
       where id = p_id;
    else
      update public.place_deals set moderated_at = now() where id = p_id;
    end if;
    insert into private.moderation_actions (
      admin_id, action, target_type, target_id, target_place_id, target_user_id, reason, prev_state
    ) values (
      p_admin, case p_result when 'hide' then 'deal_hide' else 'deal_restore' end, 'deal',
      p_id, v_deal.place_id, v_deal.user_id, case when p_result = 'hide' then p_reason end, v_prev
    )
    returning id into v_action;
  end if;
  return v_action;
end;
$$;

revoke all on function private.moderate_target(uuid, text, uuid, text, text) from public, anon, authenticated;

-- 후기, 할인 숨김 확정 또는 복구(문제없음) (MOD-06, 안건 8, 9)
-- p_include_author = true(숨김만): 같은 작성자의 다른 검토 대기 글(후기, 할인)도 같은 사유로 함께 숨긴다(D-19 조합 2).
-- 처리한 대상마다 이력 한 줄. 돌려주는 action_id로 되돌린다.
create or replace function public.admin_decide_item(
  p_target_type    text,
  p_target_id      uuid,
  p_result         text,
  p_reason         text default null,
  p_include_author boolean default false
)
returns table (action_id uuid, target_type text, target_id uuid)
language plpgsql
volatile
security definer
set search_path = ''
as $$
#variable_conflict use_column
declare
  v_admin  uuid := private.assert_admin();
  v_author uuid;
  r        record;
begin
  if p_target_type not in ('review', 'deal') or p_result not in ('hide', 'restore') then
    raise exception 'admin_invalid_input' using errcode = 'check_violation';
  end if;
  if p_result = 'hide' and (p_reason is null or p_reason not in ('spam', 'abuse', 'privacy', 'false', 'other', 'ad_false')) then
    raise exception 'admin_invalid_input' using errcode = 'check_violation';
  end if;
  if p_include_author and p_result <> 'hide' then
    raise exception 'admin_invalid_input' using errcode = 'check_violation';
  end if;

  if p_target_type = 'review' then
    select user_id into v_author from public.reviews where id = p_target_id;
  else
    select user_id into v_author from public.place_deals where id = p_target_id;
  end if;

  action_id := private.moderate_target(v_admin, p_target_type, p_target_id, p_result, p_reason);
  target_type := p_target_type;
  target_id := p_target_id;
  return next;

  if p_include_author and v_author is not null then
    for r in
      select 'review'::text as t, rv.id
        from public.reviews as rv
       where rv.user_id = v_author
         and rv.id <> p_target_id
         and rv.hidden_reason is distinct from 'admin'
         and exists (
           select 1 from public.review_reports as rr
            where rr.review_id = rv.id
              and rr.created_at > coalesce(rv.moderated_at, '-infinity'::timestamptz)
         )
      union all
      select 'deal'::text, d.id
        from public.place_deals as d
       where d.user_id = v_author
         and d.id <> p_target_id
         and ((d.status = 'active' and d.ends_on >= private.kst_today())
              or (d.status = 'hidden' and d.hidden_reason = 'reports'))
         and exists (
           select 1 from public.review_reports as rr
            where rr.deal_id = d.id
              and rr.created_at > coalesce(d.moderated_at, '-infinity'::timestamptz)
         )
    loop
      action_id := private.moderate_target(v_admin, r.t, r.id, 'hide', p_reason);
      target_type := r.t;
      target_id := r.id;
      return next;
    end loop;
  end if;
end;
$$;

comment on function public.admin_decide_item is
  '관리자 전용: 후기, 할인 숨김 확정(hide) 또는 복구(restore). p_include_author면 같은 작성자의 다른 검토 대기 글도 숨김 (MOD-06, T8.5)';

-- 폐업 확인(confirm) 또는 영업 중으로 두기(dismiss) (MOD-03, 안건 11)
create or replace function public.admin_decide_closure(p_place_id text, p_result text)
returns uuid
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  v_admin  uuid := private.assert_admin();
  v_prev   public.place_moderation;
  v_action uuid;
begin
  if p_place_id is null or p_place_id !~ '^[0-9]{1,20}$' or p_result not in ('confirm', 'dismiss') then
    raise exception 'admin_invalid_input' using errcode = 'check_violation';
  end if;

  select * into v_prev from public.place_moderation where place_id = p_place_id for update;

  insert into public.place_moderation (place_id, closed_status, decided_at, decided_by)
  values (p_place_id, case p_result when 'confirm' then 'confirmed' else 'dismissed' end, now(), v_admin)
  on conflict (place_id) do update
    set closed_status = excluded.closed_status,
        decided_at = excluded.decided_at,
        decided_by = excluded.decided_by;

  insert into private.moderation_actions (admin_id, action, target_type, target_place_id, prev_state)
  values (
    v_admin,
    case p_result when 'confirm' then 'closed_confirm' else 'closed_dismiss' end,
    'place',
    p_place_id,
    case when v_prev.place_id is null then null
         else jsonb_build_object(
           'closed_status', v_prev.closed_status,
           'decided_at', v_prev.decided_at,
           'decided_by', v_prev.decided_by
         ) end
  )
  returning id into v_action;
  return v_action;
end;
$$;

comment on function public.admin_decide_closure is
  '관리자 전용: 폐업 확인(confirm, 계속 추천 제외) 또는 영업 중으로 두기(dismiss, 지금까지의 제보 무효) (MOD-03, T8.5)';

-- 정지(suspended) 또는 해제(active) (안건 6, 7). 자기 자신과 다른 관리자는 정지할 수 없다
create or replace function public.admin_set_suspension(
  p_user_id  uuid,
  p_status   text,
  p_duration text default 'd7',
  p_reason   text default 'repeated'
)
returns uuid
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  v_admin  uuid := private.assert_admin();
  v_prev   public.profiles;
  v_action uuid;
begin
  if p_status not in ('suspended', 'active') then
    raise exception 'admin_invalid_input' using errcode = 'check_violation';
  end if;
  if p_status = 'suspended' and (
       p_duration is null or p_duration not in ('d7', 'd30', 'indefinite')
       or p_reason is null or p_reason not in ('repeated', 'spam', 'abuse', 'privacy', 'other')
     ) then
    raise exception 'admin_invalid_input' using errcode = 'check_violation';
  end if;

  select * into v_prev from public.profiles where user_id = p_user_id for update;
  if not found then
    raise exception 'moderation_target_unavailable' using errcode = 'check_violation';
  end if;
  if p_user_id = v_admin or v_prev.role = 'admin' then
    raise exception 'moderation_admin_target' using errcode = 'check_violation';
  end if;
  if p_status = 'active' and v_prev.status = 'active' then
    raise exception 'moderation_target_unavailable' using errcode = 'check_violation';
  end if;

  if p_status = 'suspended' then
    update public.profiles
       set status = 'suspended',
           suspended_until = case p_duration
             when 'd7' then now() + interval '7 days'
             when 'd30' then now() + interval '30 days'
             else null end,
           suspended_reason = p_reason
     where user_id = p_user_id;
  else
    update public.profiles
       set status = 'active', suspended_until = null, suspended_reason = null
     where user_id = p_user_id;
  end if;

  insert into private.moderation_actions (
    admin_id, action, target_type, target_user_id, reason, duration, prev_state
  ) values (
    v_admin,
    case p_status when 'suspended' then 'user_suspend' else 'user_unsuspend' end,
    'user',
    p_user_id,
    case when p_status = 'suspended' then p_reason end,
    case when p_status = 'suspended' then p_duration end,
    jsonb_build_object(
      'status', v_prev.status,
      'suspended_until', v_prev.suspended_until,
      'suspended_reason', v_prev.suspended_reason
    )
  )
  returning id into v_action;
  return v_action;
end;
$$;

comment on function public.admin_set_suspension is
  '관리자 전용: 정지(기간 d7, d30, indefinite + 사유) 또는 해제. 쓰기 차단 + 공개 후기 숨김, 로그인은 허용 (MOD-06, 안건 6, T8.5)';

-- 정지 검토 후보 "문제없음": 이 뒤에 새로 숨겨진 글만 후보 기준(2건)에 센다 (안건 14)
create or replace function public.admin_clear_user(p_user_id uuid)
returns uuid
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  v_admin  uuid := private.assert_admin();
  v_action uuid;
begin
  if not exists (select 1 from public.profiles where user_id = p_user_id) then
    raise exception 'moderation_target_unavailable' using errcode = 'check_violation';
  end if;
  insert into private.moderation_actions (admin_id, action, target_type, target_user_id)
  values (v_admin, 'user_clear', 'user', p_user_id)
  returning id into v_action;
  return v_action;
end;
$$;

comment on function public.admin_clear_user is
  '관리자 전용: 정지 검토 후보를 문제없음으로 넘김 (안건 14, T8.5)';

-- 되돌리기 (안건 8). 최신 처리부터 처리 직전 상태(prev_state)로 되돌리고 reverted_at을 적는다.
-- 시스템 처리, 이미 되돌린 처리, 같은 대상에 그 뒤의 처리가 있는 처리, 지워진 글은 moderation_undo_unavailable.
-- 하나라도 실패하면 전부 되돌리지 않는다(한 트랜잭션). 되돌린 수를 돌려준다.
create or replace function public.admin_undo(p_action_ids uuid[])
returns int
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  v_admin uuid := private.assert_admin();
  m       private.moderation_actions;
  v_n     int := 0;
  v_prev  jsonb;
begin
  if p_action_ids is null or cardinality(p_action_ids) = 0 or cardinality(p_action_ids) > 50 then
    raise exception 'admin_invalid_input' using errcode = 'check_violation';
  end if;

  for m in
    select * from private.moderation_actions
     where id = any (p_action_ids)
     order by created_at desc
       for update
  loop
    if m.reverted_at is not null or m.admin_id is null
       or (m.target_type in ('review', 'deal') and m.target_id is null)
       or private.moderation_has_later(m.id) then
      raise exception 'moderation_undo_unavailable' using errcode = 'check_violation';
    end if;
    v_prev := m.prev_state;

    if m.action in ('review_hide', 'review_restore') then
      update public.reviews
         set hidden_at = (v_prev ->> 'hidden_at')::timestamptz,
             hidden_reason = v_prev ->> 'hidden_reason',
             moderated_at = (v_prev ->> 'moderated_at')::timestamptz
       where id = m.target_id;
    elsif m.action in ('deal_hide', 'deal_restore') then
      if v_prev ->> 'status' = 'active' and exists (
        select 1 from public.place_deals as o, public.place_deals as d
         where d.id = m.target_id
           and o.place_id = d.place_id and o.source = d.source and o.type = d.type
           and o.status = 'active' and o.id <> d.id
      ) then
        raise exception 'moderation_conflict' using errcode = 'check_violation';
      end if;
      update public.place_deals
         set status = v_prev ->> 'status',
             hidden_reason = v_prev ->> 'hidden_reason',
             hidden_at = (v_prev ->> 'hidden_at')::timestamptz,
             moderated_at = (v_prev ->> 'moderated_at')::timestamptz
       where id = m.target_id;
    elsif m.action in ('closed_confirm', 'closed_dismiss') then
      if v_prev is null then
        delete from public.place_moderation where place_id = m.target_place_id;
      else
        update public.place_moderation
           set closed_status = v_prev ->> 'closed_status',
               decided_at = (v_prev ->> 'decided_at')::timestamptz,
               decided_by = (v_prev ->> 'decided_by')::uuid
         where place_id = m.target_place_id;
      end if;
    elsif m.action in ('user_suspend', 'user_unsuspend') then
      if m.target_user_id is null then
        raise exception 'moderation_undo_unavailable' using errcode = 'check_violation';
      end if;
      update public.profiles
         set status = v_prev ->> 'status',
             suspended_until = (v_prev ->> 'suspended_until')::timestamptz,
             suspended_reason = v_prev ->> 'suspended_reason'
       where user_id = m.target_user_id;
    end if;
    -- user_clear는 상태를 바꾸지 않았으므로 표시만 한다(후보 기준이 다시 이전 결정부터 센다)

    update private.moderation_actions
       set reverted_at = now(), reverted_by = v_admin
     where id = m.id;
    v_n := v_n + 1;
  end loop;

  if v_n <> (select count(distinct x) from unnest(p_action_ids) as x) then
    raise exception 'moderation_undo_unavailable' using errcode = 'check_violation';
  end if;
  return v_n;
end;
$$;

comment on function public.admin_undo is
  '관리자 전용: 처리 되돌리기(처리 직전 상태로). 하나라도 안 되면 전부 취소 (MOD-06, 안건 8, T8.5)';

-- 함수 권한: 관리자 함수는 로그인 사용자만 부를 수 있고(안에서 관리자 확인), 비로그인은 부를 수 없다
revoke all on function public.admin_reported_items() from public, anon;
grant execute on function public.admin_reported_items() to authenticated, service_role;
revoke all on function public.admin_closures() from public, anon;
grant execute on function public.admin_closures() to authenticated, service_role;
revoke all on function public.admin_users(text) from public, anon;
grant execute on function public.admin_users(text) to authenticated, service_role;
revoke all on function public.admin_log(int) from public, anon;
grant execute on function public.admin_log(int) to authenticated, service_role;
revoke all on function public.admin_decide_item(text, uuid, text, text, boolean) from public, anon;
grant execute on function public.admin_decide_item(text, uuid, text, text, boolean) to authenticated, service_role;
revoke all on function public.admin_decide_closure(text, text) from public, anon;
grant execute on function public.admin_decide_closure(text, text) to authenticated, service_role;
revoke all on function public.admin_set_suspension(uuid, text, text, text) from public, anon;
grant execute on function public.admin_set_suspension(uuid, text, text, text) to authenticated, service_role;
revoke all on function public.admin_clear_user(uuid) from public, anon;
grant execute on function public.admin_clear_user(uuid) to authenticated, service_role;
revoke all on function public.admin_undo(uuid[]) from public, anon;
grant execute on function public.admin_undo(uuid[]) to authenticated, service_role;

-- ─────────────────────────────────────────────────────────────
-- 8. pg_cron: 정지 만료 자동 해제, 1년 지난 처리 이력 삭제
-- ─────────────────────────────────────────────────────────────
-- pg_cron은 T6.26 마이그레이션이 켰다. 시각은 GMT(UTC)로 해석한다(KST = UTC + 9).
--   lunchmate_expire_suspensions        10분마다              기간 지난 정지를 active로 + 이력(시스템, reason expired)
--   lunchmate_purge_moderation_actions  04:40 KST (19:40 UTC) 1년 지난 처리 이력 삭제
-- 크론이 돌기 전에도 private.is_active_user()가 기간을 직접 봐서 쓰기 차단은 제때 풀린다.
create or replace function private.expire_suspensions()
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_count integer;
begin
  with due as (
    select p.user_id, p.suspended_until, p.suspended_reason
      from public.profiles as p
     where p.status = 'suspended'
       and p.suspended_until is not null
       and p.suspended_until <= now()
  ),
  lifted as (
    update public.profiles as p
       set status = 'active', suspended_until = null, suspended_reason = null
      from due
     where p.user_id = due.user_id
    returning p.user_id, due.suspended_until, due.suspended_reason
  )
  insert into private.moderation_actions (admin_id, action, target_type, target_user_id, reason, prev_state)
  select null, 'user_unsuspend', 'user', l.user_id, 'expired',
         jsonb_build_object('status', 'suspended', 'suspended_until', l.suspended_until,
                            'suspended_reason', l.suspended_reason)
    from lifted as l;
  get diagnostics v_count = row_count;
  return v_count;
end;
$$;

create or replace function private.purge_old_moderation_actions()
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_count integer;
begin
  delete from private.moderation_actions
   where created_at < now() - interval '1 year';
  get diagnostics v_count = row_count;
  return v_count;
end;
$$;

revoke all on function private.expire_suspensions() from public, anon, authenticated;
revoke all on function private.purge_old_moderation_actions() from public, anon, authenticated;

select cron.unschedule(j.jobid)
  from cron.job as j
 where j.jobname in ('lunchmate_expire_suspensions', 'lunchmate_purge_moderation_actions');

select cron.schedule('lunchmate_expire_suspensions', '*/10 * * * *',
  'select private.expire_suspensions()');
select cron.schedule('lunchmate_purge_moderation_actions', '40 19 * * *',
  'select private.purge_old_moderation_actions()');
