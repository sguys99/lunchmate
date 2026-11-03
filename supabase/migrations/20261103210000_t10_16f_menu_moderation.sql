-- T10.16f 메뉴 제보 운영: 메뉴 신고, 자동 숨김, 관리자 숨김과 합치기 (MENU-05, MOD-01, MOD-02, MOD-06)
-- 결정: design-decisions D-37 (관리자 A 한 건씩 큐 + 사용자 입구 C 칩, 안건 모두 기본안), docs/design/g10-comparison-admin-menu.md 2절
--
-- 이 파일이 하는 일 (파괴적 변경 없음: 테이블과 열을 더하고, 제약은 값을 넓히는 쪽으로만 다시 걸고, 함수는 같은 일을 더 하도록 바꾼다)
-- 1. private.menu_key_merges(새): 식당별 합치기 표 (옛 비교 키 → 새 비교 키). 원본 제보(menu_reports.menu_key)는 고치지 않는다.
--    집계할 때 옛 키를 새 키로 바꿔 읽으므로, 합친 뒤 옛 이름으로 들어오는 제보도 자동으로 새 메뉴에 들어간다(안건 1).
-- 2. private.menu_groups(새): 메뉴 줄(장소 + 비교 키) 단위 상태. 숨김(신고 3명 reports, 관리자 admin)과 마지막 관리자 결정 시각.
-- 3. public.menu_flags(새): 메뉴 줄 신고 (안건 2, 3, 5). 본인만 읽기, 1인 1회, 사유 false/abuse/spam/other, 글 없음.
--    하루 한도는 기존 'reports' 버킷 30건(후기 신고, 할인 신고, 식당 정보 제보와 합산, MOD-05).
--    서로 다른 3명이면(마지막 관리자 결정 뒤 신고만 센다) 그 줄을 숨기고 관리자 검토 대기로 둔다(안건 4, MOD-02와 같은 수).
-- 4. private.menu_group_stats(새): 메뉴 줄 집계 공용(합치기 반영, 사용자마다 최신 1건, 중앙값, 범위, 쓴 이름). place_menus와 관리자 함수가 같이 쓴다.
-- 5. public.place_menus: 같은 모양 그대로, 합치기를 반영하고 숨긴 줄을 뺀다.
-- 6. private.moderation_actions: target_menu_key 열 추가, action에 menu_hide, menu_clear, menu_merge, menu_separate, target_type에 menu.
-- 7. 관리자 함수: admin_menu_flagged(), admin_menu_suggestions(), admin_menu_decide(), admin_menu_merge(), admin_menu_separate().
--    admin_undo, moderation_has_later는 메뉴 처리를 알도록 바꾸고, admin_log는 target_menu_key를 함께 돌려주도록 다시 만든다.
--
-- 비교 자료 2절 안건 6과 다른 점 (승인 요청에 적는다)
-- - 처리 이력 값은 4개다. "숨김 되돌리기"는 menu_clear(문제없음, 자동 숨김 복구 겸)가 맡고, "합치기 되돌리기"는 따로 두지 않고
--   기존 되돌리기(admin_undo)가 menu_merge를 되돌린다. menu_separate는 합치기 제안 "따로 두기"(제안 목록에서 그 짝을 다시 내지 않음).
-- - admin_log는 돌려주는 열이 하나 늘어 drop 뒤 다시 만든다(데이터 변화 없음, 권한도 같게 다시 준다).
--
-- 규칙: 이미 푸시된 마이그레이션은 고치지 않는다(CLAUDE.md 11장). 새 테이블은 이 파일에서 RLS를 켜고 정책을 만든다.

-- ─────────────────────────────────────────────────────────────
-- 1. private.menu_key_merges: 식당별 합치기 표
-- ─────────────────────────────────────────────────────────────
create table private.menu_key_merges (
  place_id   text not null,
  from_key   text not null,
  to_key     text not null,
  created_by uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now(),
  primary key (place_id, from_key),
  constraint menu_key_merges_place_id_format check (place_id ~ '^[0-9]{1,20}$'),
  constraint menu_key_merges_keys_differ check (from_key <> to_key),
  constraint menu_key_merges_key_format check (
    from_key ~ '^\S{1,40}$' and to_key ~ '^\S{1,40}$' and from_key = lower(from_key) and to_key = lower(to_key)
  )
);

comment on table private.menu_key_merges is
  '메뉴 합치기 표(MENU-05, T10.16f): 같은 식당의 옛 비교 키를 새 비교 키로 읽는다. 늘 한 단계(옛 → 최종)로 유지한다. 원본 제보는 그대로';

create index menu_key_merges_to_idx on private.menu_key_merges (place_id, to_key);

alter table private.menu_key_merges enable row level security;
create policy "menu_key_merges: 직접 접근 없음"
  on private.menu_key_merges as restrictive for all to anon, authenticated
  using (false) with check (false);
revoke all on table private.menu_key_merges from public, anon, authenticated;
grant all on table private.menu_key_merges to service_role;

-- ─────────────────────────────────────────────────────────────
-- 2. private.menu_groups: 메뉴 줄 상태
-- ─────────────────────────────────────────────────────────────
create table private.menu_groups (
  place_id      text not null,
  menu_key      text not null,
  hidden_at     timestamptz,
  hidden_reason text,
  -- 마지막 관리자 결정 시각. 자동 숨김은 이 뒤의 신고만 센다(복구한 줄이 신고 1건에 다시 숨겨지지 않게, T8.5 안건 9와 같음)
  moderated_at  timestamptz,
  primary key (place_id, menu_key),
  constraint menu_groups_place_id_format check (place_id ~ '^[0-9]{1,20}$'),
  constraint menu_groups_hidden_pair check ((hidden_at is null) = (hidden_reason is null)),
  constraint menu_groups_hidden_reason_values check (hidden_reason is null or hidden_reason in ('reports', 'admin'))
);

comment on table private.menu_groups is
  '메뉴 줄(장소 + 비교 키) 상태(T10.16f): 숨김(reports 신고 3명, admin 관리자)과 마지막 관리자 결정 시각. 행이 없으면 보이는 줄';

alter table private.menu_groups enable row level security;
create policy "menu_groups: 직접 접근 없음"
  on private.menu_groups as restrictive for all to anon, authenticated
  using (false) with check (false);
revoke all on table private.menu_groups from public, anon, authenticated;
grant all on table private.menu_groups to service_role;

-- 비교 키를 합치기 표로 바꿔 읽는다(없으면 그대로)
create or replace function private.menu_resolve_key(p_place_id text, p_key text)
returns text
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce(
    (select g.to_key from private.menu_key_merges as g where g.place_id = p_place_id and g.from_key = p_key),
    p_key
  );
$$;

revoke all on function private.menu_resolve_key(text, text) from public, anon, authenticated;

-- ─────────────────────────────────────────────────────────────
-- 3. private.menu_group_stats: 메뉴 줄 집계 공용
-- ─────────────────────────────────────────────────────────────
-- p_place_ids가 null이면 모든 식당(관리자 함수만). 보이는 제보: 숨기지 않은 행, 최근 180일, 숨긴 후기에서 온 메뉴 제외.
-- 사용자마다 (식당, 합친 키)별 최신 1건. 대표 이름은 합친 키의 원래 이름을 먼저, 그다음 많이 쓴 표기, 같으면 최근 표기.
create or replace function private.menu_group_stats(p_place_ids text[])
returns table (
  place_id      text,
  menu_key      text,
  menu_name     text,
  report_count  int,
  median_krw    int,
  lo_krw        int,
  hi_krw        int,
  last_at       timestamptz,
  variants      jsonb,
  hidden_reason text,
  moderated_at  timestamptz
)
language sql
stable
security definer
set search_path = ''
as $$
  with visible as (
    select m.user_id, m.place_id as pid, m.menu_key as raw_k,
           coalesce(g.to_key, m.menu_key) as k,
           m.menu_name as nm, m.price_krw, m.created_at
      from public.menu_reports as m
      left join public.reviews as r on r.id = m.review_id
      left join private.menu_key_merges as g on g.place_id = m.place_id and g.from_key = m.menu_key
     where (p_place_ids is null or m.place_id = any (p_place_ids))
       and m.hidden_at is null
       and m.created_at >= now() - interval '180 days'
       and (m.review_id is null or r.hidden_at is null)
  ),
  latest as (
    select distinct on (v.user_id, v.pid, v.k) v.pid, v.k, v.raw_k, v.nm, v.price_krw, v.created_at
      from visible as v
     order by v.user_id, v.pid, v.k, v.created_at desc
  ),
  stats as (
    select l.pid, l.k,
           count(*)::int as n,
           (round(percentile_cont(0.5) within group (order by l.price_krw) / 100.0) * 100)::int as median,
           min(l.price_krw)::int as lo,
           max(l.price_krw)::int as hi,
           max(l.created_at) as last_at
      from latest as l
     group by l.pid, l.k
  ),
  name_counts as (
    select l.pid, l.k, l.nm, bool_or(l.raw_k = l.k) as native, count(*)::int as c, max(l.created_at) as at
      from latest as l
     group by l.pid, l.k, l.nm
  ),
  names as (
    select distinct on (x.pid, x.k) x.pid, x.k, x.nm
      from name_counts as x
     order by x.pid, x.k, x.native desc, x.c desc, x.at desc
  ),
  variant_list as (
    select x.pid, x.k,
           jsonb_agg(jsonb_build_object('name', x.nm, 'count', x.c) order by x.c desc, x.at desc) as variants
      from name_counts as x
     group by x.pid, x.k
  )
  select s.pid, s.k, n2.nm, s.n, s.median, s.lo, s.hi, s.last_at, vl.variants, mg.hidden_reason, mg.moderated_at
    from stats as s
    join names as n2 on n2.pid = s.pid and n2.k = s.k
    join variant_list as vl on vl.pid = s.pid and vl.k = s.k
    left join private.menu_groups as mg on mg.place_id = s.pid and mg.menu_key = s.k;
$$;

revoke all on function private.menu_group_stats(text[]) from public, anon, authenticated;

-- ─────────────────────────────────────────────────────────────
-- 4. place_menus: 같은 모양, 합치기 반영 + 숨긴 줄 제외 (MENU-03, MENU-04)
-- ─────────────────────────────────────────────────────────────
create or replace function public.place_menus(p_place_ids text[])
returns table (
  place_id     text,
  menu_key     text,
  menu_name    text,
  median_krw   int,
  report_count int,
  last_month   date,
  rank         int
)
language plpgsql
stable
security definer
set search_path = ''
as $$
#variable_conflict use_column
declare
  v_ids text[];
begin
  if p_place_ids is null or cardinality(p_place_ids) = 0 then
    return;
  end if;
  if cardinality(p_place_ids) > 60 then
    raise exception 'place_menus_too_many_ids'
      using errcode = 'check_violation',
            hint = '한 번에 60곳까지 조회할 수 있습니다';
  end if;
  select coalesce(array_agg(distinct i), '{}') into v_ids
    from unnest(p_place_ids) as i
   where i ~ '^[0-9]{1,20}$';
  if cardinality(v_ids) = 0 then
    return;
  end if;

  return query
  with ranked as (
    select s.place_id as pid, s.menu_key as k, s.menu_name as nm, s.median_krw as median, s.report_count as n,
           date_trunc('month', s.last_at at time zone 'Asia/Seoul')::date as lm,
           row_number() over (partition by s.place_id order by s.report_count desc, s.last_at desc, s.menu_key)::int as rn
      from private.menu_group_stats(v_ids) as s
     where s.hidden_reason is null
  )
  select r.pid, r.k, r.nm, r.median, r.n, r.lm, r.rn
    from ranked as r
   where r.rn <= 3
   order by r.pid, r.rn;
end;
$$;

comment on function public.place_menus(text[]) is
  '식당별 메뉴 익명 집계(T10.16, MENU-03, MENU-04): 최근 180일, 사용자마다 메뉴별 최신 1건, 합치기 반영, 숨긴 줄 제외, 메뉴별 가격 중앙값과 제보 수, 대표 이름, 최근 제보 월, 상위 3개. 작성자 없음(AC-MENU-1). 추천 점수에 쓰지 않는다';

revoke all on function public.place_menus(text[]) from public;
grant execute on function public.place_menus(text[]) to anon, authenticated, service_role;

-- ─────────────────────────────────────────────────────────────
-- 5. public.menu_flags: 메뉴 줄 신고 (MOD-01, MENU-05)
-- ─────────────────────────────────────────────────────────────
create table public.menu_flags (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null default auth.uid() references auth.users (id) on delete cascade,
  place_id   text not null,
  -- 신고할 때의 합친 키(트리거가 바꿔 적는다)
  menu_key   text not null,
  reason     text not null,
  created_at timestamptz not null default now(),

  constraint menu_flags_place_id_format check (place_id ~ '^[0-9]{1,20}$'),
  constraint menu_flags_key_format check (menu_key ~ '^\S{1,40}$' and menu_key = lower(menu_key)),
  constraint menu_flags_reason_values check (reason in ('false', 'abuse', 'spam', 'other')),
  -- 같은 줄 1인 1회. 취소 없음
  constraint menu_flags_one_per_group unique (user_id, place_id, menu_key)
);

comment on table public.menu_flags is
  '메뉴 줄 신고(T10.16f, MOD-01, MENU-05). 신고자 본인만 읽는다. 서로 다른 3명이면 그 줄 자동 숨김(MOD-02)';

create index menu_flags_group_idx on public.menu_flags (place_id, menu_key, created_at);

create trigger block_suspended_writer
  before insert on public.menu_flags
  for each row execute function private.block_suspended_writer();

-- 대상 확인: 지금 메뉴판에 보이는 줄만(합친 키로 바꿔 적는다). 그 줄 제보가 모두 내 것이면 신고할 수 없다.
-- 없는 줄과 숨긴 줄은 같은 오류(report_target_unavailable). 하루 30건(reports 버킷).
create or replace function private.menu_flags_before_insert()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_others int;
  v_total  int;
begin
  new.menu_key := private.menu_resolve_key(new.place_id, new.menu_key);
  new.created_at := now();

  if exists (
    select 1 from private.menu_groups as mg
     where mg.place_id = new.place_id and mg.menu_key = new.menu_key and mg.hidden_at is not null
  ) then
    raise exception 'report_target_unavailable'
      using errcode = 'check_violation', hint = '신고할 수 없는 대상입니다';
  end if;

  select count(*)::int, count(*) filter (where m.user_id <> new.user_id)::int
    into v_total, v_others
    from public.menu_reports as m
    left join public.reviews as r on r.id = m.review_id
   where m.place_id = new.place_id
     and private.menu_resolve_key(m.place_id, m.menu_key) = new.menu_key
     and m.hidden_at is null
     and m.created_at >= now() - interval '180 days'
     and (m.review_id is null or r.hidden_at is null);

  if v_total = 0 then
    raise exception 'report_target_unavailable'
      using errcode = 'check_violation', hint = '신고할 수 없는 대상입니다';
  end if;
  if v_others = 0 then
    raise exception 'report_own_target'
      using errcode = 'check_violation', hint = '내가 쓴 글은 신고할 수 없습니다';
  end if;

  perform private.consume_daily_quota(new.user_id, 'reports');
  return new;
end;
$$;

revoke all on function private.menu_flags_before_insert() from public, anon, authenticated;

create trigger menu_flags_before_insert
  before insert on public.menu_flags
  for each row execute function private.menu_flags_before_insert();

-- 서로 다른 3명이면 자동 숨김. 1인 1회라 행 수 = 신고자 수. 마지막 관리자 결정 뒤 신고만 센다
create or replace function private.menu_flags_after_insert()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_since timestamptz;
begin
  select mg.moderated_at into v_since
    from private.menu_groups as mg
   where mg.place_id = new.place_id and mg.menu_key = new.menu_key;

  if (
    select count(*) from public.menu_flags as f
     where f.place_id = new.place_id and f.menu_key = new.menu_key
       and (v_since is null or f.created_at > v_since)
  ) >= 3 then
    insert into private.menu_groups (place_id, menu_key, hidden_at, hidden_reason)
    values (new.place_id, new.menu_key, now(), 'reports')
    on conflict (place_id, menu_key) do update
      set hidden_at = now(), hidden_reason = 'reports'
      where private.menu_groups.hidden_at is null;
  end if;
  return null;
end;
$$;

revoke all on function private.menu_flags_after_insert() from public, anon, authenticated;

create trigger menu_flags_after_insert
  after insert on public.menu_flags
  for each row execute function private.menu_flags_after_insert();

alter table public.menu_flags enable row level security;

create policy "menu_flags: 본인 읽기"
  on public.menu_flags for select to authenticated
  using ((select auth.uid()) = user_id);

create policy "menu_flags: 본인 추가"
  on public.menu_flags for insert to authenticated
  with check ((select auth.uid()) = user_id);
-- update, delete 없음: 신고는 취소하지 않는다. 탈퇴 시 cascade로 지워진다

revoke all on table public.menu_flags from public, anon, authenticated;
grant select on table public.menu_flags to authenticated;
grant insert (user_id, place_id, menu_key, reason) on table public.menu_flags to authenticated;
grant all on table public.menu_flags to service_role;

-- ─────────────────────────────────────────────────────────────
-- 6. 처리 이력: 메뉴 처리 값 넓히기
-- ─────────────────────────────────────────────────────────────
alter table private.moderation_actions
  add column target_menu_key text;

alter table private.moderation_actions
  drop constraint moderation_actions_action_values,
  add constraint moderation_actions_action_values check (action in (
    'review_hide', 'review_restore', 'deal_hide', 'deal_restore',
    'closed_confirm', 'closed_dismiss',
    'user_suspend', 'user_unsuspend', 'user_clear',
    'menu_hide', 'menu_clear', 'menu_merge', 'menu_separate'
  )),
  drop constraint moderation_actions_target_type_values,
  add constraint moderation_actions_target_type_values check (target_type in ('review', 'deal', 'place', 'user', 'menu')),
  add constraint moderation_actions_menu_target check (
    (target_type = 'menu') = (target_menu_key is not null)
    and (target_type <> 'menu' or target_place_id is not null)
  );

comment on column private.moderation_actions.target_menu_key is
  '메뉴 처리 대상 비교 키(target_type = menu). 합치기는 옛 키, 새 키는 prev_state.to_key (T10.16f)';

-- 같은 대상의 나중 처리: 메뉴는 (장소, 키)가 같거나, 합치기의 새 키가 이 처리의 키인 경우
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
         or (m.target_type = 'menu' and later.target_place_id = m.target_place_id
             and (later.target_menu_key in (m.target_menu_key, m.prev_state ->> 'to_key')
                  or later.prev_state ->> 'to_key' in (m.target_menu_key, m.prev_state ->> 'to_key')))
       )
     where m.id = p_action_id
  );
$$;

revoke all on function private.moderation_has_later(uuid) from public, anon, authenticated;

-- admin_log: target_menu_key를 함께 (돌려주는 열이 바뀌어 다시 만든다)
drop function public.admin_log(int);

create function public.admin_log(p_limit int default 100)
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
  undoable        boolean,
  target_menu_key text
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
           and not private.moderation_has_later(m.id),
         m.target_menu_key
    from private.moderation_actions as m
    left join public.profiles as tp on tp.user_id = m.target_user_id
    left join public.profiles as ap on ap.user_id = m.admin_id
   order by m.created_at desc
   limit least(greatest(coalesce(p_limit, 100), 1), 500);
end;
$$;

comment on function public.admin_log is
  '관리자 전용 처리 이력(1년 보관). 되돌릴 수 있는지(undoable)와 메뉴 처리 키 함께 (MOD-06, T8.5, T10.16f)';

revoke all on function public.admin_log(int) from public, anon;
grant execute on function public.admin_log(int) to authenticated, service_role;

-- ─────────────────────────────────────────────────────────────
-- 7. 관리자 함수: 메뉴 큐, 처리, 되돌리기
-- ─────────────────────────────────────────────────────────────
-- 검토할 신고된 메뉴 줄: 마지막 관리자 결정 뒤 신고가 1건 이상이고, 관리자가 숨기지 않았고, 다른 키로 합쳐지지 않은 줄.
-- 자동 숨김 먼저, 그다음 신고 많은 순, 오래된 신고 먼저. 같은 식당의 다른 메뉴(합치기 대상 고르기)를 others로 함께.
-- 제보자 정보(닉네임, id)는 넣지 않는다(숫자만).
create or replace function public.admin_menu_flagged()
returns table (
  place_id      text,
  menu_key      text,
  menu_name     text,
  report_count  int,
  median_krw    int,
  lo_krw        int,
  hi_krw        int,
  last_at       timestamptz,
  variants      jsonb,
  auto_hidden   boolean,
  flags         jsonb,
  flag_count    int,
  first_flag_at timestamptz,
  others        jsonb
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
  with open_flags as (
    select f.place_id as pid, f.menu_key as k, f.reason, f.created_at
      from public.menu_flags as f
      left join private.menu_groups as mg on mg.place_id = f.place_id and mg.menu_key = f.menu_key
     where (mg.moderated_at is null or f.created_at > mg.moderated_at)
       and coalesce(mg.hidden_reason, '') <> 'admin'
       and not exists (
         select 1 from private.menu_key_merges as g where g.place_id = f.place_id and g.from_key = f.menu_key
       )
  ),
  by_reason as (
    select o.pid, o.k, o.reason, count(*)::int as n from open_flags as o group by o.pid, o.k, o.reason
  ),
  agg as (
    select b.pid, b.k, jsonb_object_agg(b.reason, b.n) as flags, sum(b.n)::int as total,
           (select min(o.created_at) from open_flags as o where o.pid = b.pid and o.k = b.k) as first_at
      from by_reason as b
     group by b.pid, b.k
  ),
  places as (
    select distinct a.pid from agg as a
  ),
  stats as (
    select * from private.menu_group_stats((select array_agg(p.pid) from places as p))
  )
  select a.pid, a.k, s.menu_name, s.report_count, s.median_krw, s.lo_krw, s.hi_krw, s.last_at,
         coalesce(s.variants, '[]'::jsonb),
         coalesce(s.hidden_reason = 'reports', false),
         a.flags, a.total, a.first_at,
         coalesce((
           select jsonb_agg(jsonb_build_object('key', o.menu_key, 'name', o.menu_name, 'count', o.report_count)
                            order by o.report_count desc, o.menu_key)
             from stats as o
            where o.place_id = a.pid and o.menu_key <> a.k and o.hidden_reason is null
         ), '[]'::jsonb)
    from agg as a
    left join stats as s on s.place_id = a.pid and s.menu_key = a.k
   order by coalesce(s.hidden_reason = 'reports', false) desc, a.total desc, a.first_at
   limit 200;
end;
$$;

comment on function public.admin_menu_flagged() is
  '관리자 전용: 검토할 신고된 메뉴 줄과 같은 식당 다른 메뉴(합치기 대상). 제보자 정보 없음 (T10.16f, MENU-05)';

-- 합치기 제안: 같은 식당, 보이는 두 줄, 한쪽 키가 다른 쪽에 들어 있거나(contains, 짧은 쪽 → 긴 쪽) 같은 길이에 한 글자만 다름
-- (typo, 제보 적은 쪽 → 많은 쪽), 가격 중앙값 차이가 큰 쪽의 30% 이내. 따로 두기(menu_separate)한 짝은 다시 내지 않는다.
create or replace function public.admin_menu_suggestions()
returns table (
  place_id   text,
  from_key   text,
  from_name  text,
  from_count int,
  from_median int,
  to_key     text,
  to_name    text,
  to_count   int,
  to_median  int,
  to_last_at timestamptz,
  why        text
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
  with s as (
    select * from private.menu_group_stats(null::text[]) as x where x.hidden_reason is null
  ),
  pairs as (
    select a.place_id as pid, a.menu_key as fk, a.menu_name as fn, a.report_count as fc, a.median_krw as fm,
           b.menu_key as tk, b.menu_name as tn, b.report_count as tc, b.median_krw as tm, b.last_at as tl,
           case
             when char_length(a.menu_key) < char_length(b.menu_key) and strpos(b.menu_key, a.menu_key) > 0 then 'contains'
             when char_length(a.menu_key) = char_length(b.menu_key)
                  and (a.report_count < b.report_count or (a.report_count = b.report_count and a.menu_key > b.menu_key))
                  and (
                    select count(*) from generate_series(1, char_length(a.menu_key)) as i
                     where substr(a.menu_key, i, 1) <> substr(b.menu_key, i, 1)
                  ) = 1 then 'typo'
           end as why
      from s as a
      join s as b on b.place_id = a.place_id and b.menu_key <> a.menu_key
  )
  select p.pid, p.fk, p.fn, p.fc, p.fm, p.tk, p.tn, p.tc, p.tm, p.tl, p.why
    from pairs as p
   where p.why is not null
     and abs(p.fm - p.tm) <= greatest(p.fm, p.tm) * 0.3
     and not exists (
       select 1 from private.moderation_actions as m
        where m.action = 'menu_separate' and m.reverted_at is null
          and m.target_place_id = p.pid
          and ((m.target_menu_key = p.fk and m.prev_state ->> 'to_key' = p.tk)
            or (m.target_menu_key = p.tk and m.prev_state ->> 'to_key' = p.fk))
     )
   order by p.tc desc, p.pid, p.fk
   limit 100;
end;
$$;

comment on function public.admin_menu_suggestions() is
  '관리자 전용: 같은 식당 비슷한 메뉴 합치기 제안(포함, 한 글자 차이, 가격 30% 이내). 자동으로 합치지 않는다 (T10.16f, MENU-05)';

-- 메뉴 줄 숨김(hide) 또는 문제없음(clear, 자동 숨김이면 되살림). 돌려주는 action_id로 되돌린다
create or replace function public.admin_menu_decide(p_place_id text, p_menu_key text, p_result text)
returns uuid
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  v_admin  uuid := private.assert_admin();
  v_row    private.menu_groups;
  v_prev   jsonb;
  v_action uuid;
begin
  if p_place_id is null or p_place_id !~ '^[0-9]{1,20}$' or p_menu_key is null or p_menu_key !~ '^\S{1,40}$'
     or p_result not in ('hide', 'clear') then
    raise exception 'admin_invalid_input' using errcode = 'check_violation';
  end if;
  if exists (select 1 from private.menu_key_merges as g where g.place_id = p_place_id and g.from_key = p_menu_key)
     or not exists (select 1 from public.menu_reports as m where m.place_id = p_place_id
                     and private.menu_resolve_key(m.place_id, m.menu_key) = p_menu_key) then
    raise exception 'moderation_target_unavailable' using errcode = 'check_violation';
  end if;

  select * into v_row from private.menu_groups
   where place_id = p_place_id and menu_key = p_menu_key
     for update;
  if found and v_row.hidden_reason = 'admin' and p_result = 'hide' then
    raise exception 'moderation_target_unavailable' using errcode = 'check_violation';
  end if;
  v_prev := case when found then jsonb_build_object(
    'hidden_at', v_row.hidden_at, 'hidden_reason', v_row.hidden_reason, 'moderated_at', v_row.moderated_at
  ) end;

  insert into private.menu_groups (place_id, menu_key, hidden_at, hidden_reason, moderated_at)
  values (
    p_place_id, p_menu_key,
    case when p_result = 'hide' then now() end,
    case when p_result = 'hide' then 'admin' end,
    now()
  )
  on conflict (place_id, menu_key) do update
    set hidden_at = case when p_result = 'hide' then coalesce(private.menu_groups.hidden_at, now()) end,
        hidden_reason = excluded.hidden_reason,
        moderated_at = now();

  insert into private.moderation_actions (admin_id, action, target_type, target_place_id, target_menu_key, prev_state)
  values (v_admin, case p_result when 'hide' then 'menu_hide' else 'menu_clear' end, 'menu', p_place_id, p_menu_key, v_prev)
  returning id into v_action;
  return v_action;
end;
$$;

comment on function public.admin_menu_decide(text, text, text) is
  '관리자 전용: 메뉴 줄 숨김(hide) 또는 문제없음(clear). 처리 이력에 menu_hide, menu_clear (T10.16f, MENU-05)';

-- 합치기: p_from 줄을 p_to 줄로. 이미 p_from으로 합쳐 둔 키도 p_to로 옮겨 늘 한 단계로 둔다. p_from 줄의 신고는 큐에서 빠진다
create or replace function public.admin_menu_merge(p_place_id text, p_from text, p_to text)
returns uuid
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  v_admin     uuid := private.assert_admin();
  v_to        text;
  v_repointed jsonb;
  v_action    uuid;
begin
  if p_place_id is null or p_place_id !~ '^[0-9]{1,20}$'
     or p_from is null or p_from !~ '^\S{1,40}$' or p_to is null or p_to !~ '^\S{1,40}$' then
    raise exception 'admin_invalid_input' using errcode = 'check_violation';
  end if;
  v_to := private.menu_resolve_key(p_place_id, p_to);
  if p_from = v_to
     or exists (select 1 from private.menu_key_merges as g where g.place_id = p_place_id and g.from_key = p_from)
     or not exists (select 1 from public.menu_reports as m where m.place_id = p_place_id
                     and private.menu_resolve_key(m.place_id, m.menu_key) = p_from)
     or not exists (select 1 from public.menu_reports as m where m.place_id = p_place_id
                     and private.menu_resolve_key(m.place_id, m.menu_key) = v_to) then
    raise exception 'moderation_target_unavailable' using errcode = 'check_violation';
  end if;

  select coalesce(jsonb_agg(g.from_key), '[]'::jsonb) into v_repointed
    from private.menu_key_merges as g
   where g.place_id = p_place_id and g.to_key = p_from;
  update private.menu_key_merges
     set to_key = v_to
   where place_id = p_place_id and to_key = p_from;
  insert into private.menu_key_merges (place_id, from_key, to_key, created_by)
  values (p_place_id, p_from, v_to, v_admin);

  insert into private.moderation_actions (admin_id, action, target_type, target_place_id, target_menu_key, prev_state)
  values (v_admin, 'menu_merge', 'menu', p_place_id, p_from,
          jsonb_build_object('to_key', v_to, 'repointed', v_repointed))
  returning id into v_action;
  return v_action;
end;
$$;

comment on function public.admin_menu_merge(text, text, text) is
  '관리자 전용: 같은 식당 메뉴 합치기(옛 키 → 새 키). 원본 제보는 그대로. 처리 이력 menu_merge, 되돌리기 가능 (T10.16f, MENU-05)';

-- 합치기 제안 따로 두기: 상태는 바꾸지 않고 이력만(제안 목록에서 그 짝을 다시 내지 않는다)
create or replace function public.admin_menu_separate(p_place_id text, p_from text, p_to text)
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
  if p_place_id is null or p_place_id !~ '^[0-9]{1,20}$'
     or p_from is null or p_from !~ '^\S{1,40}$' or p_to is null or p_to !~ '^\S{1,40}$' or p_from = p_to then
    raise exception 'admin_invalid_input' using errcode = 'check_violation';
  end if;
  insert into private.moderation_actions (admin_id, action, target_type, target_place_id, target_menu_key, prev_state)
  values (v_admin, 'menu_separate', 'menu', p_place_id, p_from, jsonb_build_object('to_key', p_to))
  returning id into v_action;
  return v_action;
end;
$$;

comment on function public.admin_menu_separate(text, text, text) is
  '관리자 전용: 합치기 제안 따로 두기(이력 menu_separate만) (T10.16f, MENU-05)';

-- admin_undo: 메뉴 처리 되돌리기를 더한다(나머지는 T8.5와 같다)
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
    elsif m.action in ('menu_hide', 'menu_clear') then
      if v_prev is null then
        delete from private.menu_groups
         where place_id = m.target_place_id and menu_key = m.target_menu_key;
      else
        update private.menu_groups
           set hidden_at = (v_prev ->> 'hidden_at')::timestamptz,
               hidden_reason = v_prev ->> 'hidden_reason',
               moderated_at = (v_prev ->> 'moderated_at')::timestamptz
         where place_id = m.target_place_id and menu_key = m.target_menu_key;
      end if;
    elsif m.action = 'menu_merge' then
      delete from private.menu_key_merges
       where place_id = m.target_place_id and from_key = m.target_menu_key;
      update private.menu_key_merges
         set to_key = m.target_menu_key
       where place_id = m.target_place_id
         and from_key in (select jsonb_array_elements_text(coalesce(v_prev -> 'repointed', '[]'::jsonb)));
    end if;
    -- user_clear, menu_separate는 상태를 바꾸지 않았으므로 표시만 한다

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
  '관리자 전용: 처리 되돌리기(처리 직전 상태로). 하나라도 안 되면 전부 취소 (MOD-06, 안건 8, T8.5, 메뉴 처리 T10.16f)';

revoke all on function public.admin_menu_flagged() from public, anon;
grant execute on function public.admin_menu_flagged() to authenticated, service_role;
revoke all on function public.admin_menu_suggestions() from public, anon;
grant execute on function public.admin_menu_suggestions() to authenticated, service_role;
revoke all on function public.admin_menu_decide(text, text, text) from public, anon;
grant execute on function public.admin_menu_decide(text, text, text) to authenticated, service_role;
revoke all on function public.admin_menu_merge(text, text, text) from public, anon;
grant execute on function public.admin_menu_merge(text, text, text) to authenticated, service_role;
revoke all on function public.admin_menu_separate(text, text, text) from public, anon;
grant execute on function public.admin_menu_separate(text, text, text) to authenticated, service_role;
