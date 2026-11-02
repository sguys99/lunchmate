-- T9.4 베타 의견 (나 탭 > 베타 의견 보내기 시트, /admin "베타 의견" 구역)
-- PRD: 해당 ID 없음(베타 운영). 결정: design-decisions D-22, D-23(안건 모두 기본안), docs/design/g9-comparison-beta.md 5절, 6절 초안.
-- 앞 마이그레이션: 20261101180000_t8_5_admin_moderation.sql (private.is_admin, private.assert_admin, private.block_suspended_writer)
--
-- 이 파일이 하는 일 (파괴적 변경 없음: 테이블을 더하고, 한도 버킷 목록을 넓히고, 함수를 같은 모양으로 바꾼다)
-- 1. 하루 한도 버킷 'beta_feedback'(하루 10건, KST) 추가. 기존 행 영향 없음(check 제약 교체, 데이터 변경 없음).
-- 2. public.beta_feedback: 본인 쓰기(insert)와 본인 읽기(select)만. 고치기, 지우기 권한은 없다(탈퇴 cascade만).
--    user_id → auth.users on delete cascade: 탈퇴하면 바로 지워진다(PRD 11.4, tasks S9). account_residue(T6.27)가
--    auth.users 외래 키를 카탈로그에서 찾으므로 이 테이블도 자동으로 센다.
--    정지 사용자는 쓰지 못한다(T8.5 공통 트리거 block_suspended_writer).
--    넣지 않는 값: 좌표, UA 원문, 쿼리, 초대 코드, 카카오 장소 값(route는 브라우저와 서버가 sanitizeRoute로 만든 경로 틀만).
--    금칙어는 적용하지 않는다(운영자만 읽는 글, 안건 13). 길이와 한도만 본다.
-- 3. public.admin_beta_feedback(p_limit, p_before): 관리자 전용 읽기. 닉네임 대신 익명 번호(author_no)만 준다.
--    관리자에게 테이블 select 정책을 열지 않는다(데이터는 이 보안 함수로만, 안건 14).
-- 4. 보관(안건 16): 베타 종료일 뒤 6개월이 지나면 삭제. 종료일은 아직 모르므로 private.beta_settings.ended_on(기본 null)에
--    T9.13(베타 종료) 때 SQL 편집기에서 적는다. null인 동안 정리 작업은 아무것도 지우지 않는다.
--      update private.beta_settings set ended_on = 'YYYY-MM-DD';   -- 베타 마지막 날(KST)
--    pg_cron lunchmate_purge_beta_feedback 04:50 KST(19:50 UTC) 매일. 실행 기록은 T6.26 lunchmate_purge_cron_history가 지운다.
--
-- 바꾸지 않는 것
-- - public.my_daily_limits(): 의견 시트는 열 때 남은 수를 미리 보이지 않고(보낼 때 한도 응답만), 이 함수 결과를 쓰는
--   할인 시트가 모르는 버킷을 받지 않게 목록을 그대로 둔다.
--
-- 규칙: 이미 푸시된 마이그레이션은 고치지 않는다(CLAUDE.md 11장). 새 테이블은 이 파일에서 RLS를 켜고 정책을 만든다.

-- ─────────────────────────────────────────────────────────────
-- 1. 한도 버킷 'beta_feedback' (하루 10건)
-- ─────────────────────────────────────────────────────────────
alter table private.daily_usage drop constraint daily_usage_bucket_values;
alter table private.daily_usage
  add constraint daily_usage_bucket_values
  check (bucket in ('reviews', 'reports', 'deals', 'polls', 'beta_feedback'));

-- 값을 바꾸면 src/copy/beta.ts BETA_FEEDBACK_DAILY(한도 문구)도 함께 고친다(src/lib/moderation/limits.test.ts가 비교한다)
create or replace function private.daily_quota_max(p_bucket text)
returns int
language sql
immutable
set search_path = ''
as $$
  select case p_bucket
    when 'reviews'       then 20   -- MOD-05 후기 하루 20
    when 'reports'       then 30   -- MOD-05 신고 하루 30 (후기 신고, 할인 신고, 식당 정보 제보 합산)
    when 'deals'         then 10   -- DEAL-04 할인 제보 하루 10
    when 'polls'         then 10   -- MOD-05 투표방 생성 하루 10 (T7.11)
    when 'beta_feedback' then 10   -- T9.4 베타 의견 하루 10 (D-23 안건 12)
  end;
$$;

revoke all on function private.daily_quota_max(text) from public, anon, authenticated;

-- ─────────────────────────────────────────────────────────────
-- 2. beta_feedback
-- ─────────────────────────────────────────────────────────────
create table public.beta_feedback (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null default auth.uid()
               references auth.users (id) on delete cascade,
  -- 종류는 선택 입력(고르지 않으면 null)
  category     text,
  body         text not null,
  -- "지금 보던 화면": 경로 틀만(/poll/[code], /today/[detail], /[other]). 사용자가 끄면 null
  route        text,
  app_version  text not null,
  algo_version text not null,
  device       text not null,
  in_app       boolean not null default false,
  standalone   boolean not null default false,
  created_at   timestamptz not null default now(),

  constraint beta_feedback_category_values check (
    category is null or category in ('bug', 'inconvenient', 'good', 'idea')
  ),
  -- 1~500자. 공백만인 글은 받지 않는다(서버 zod와 같은 규칙)
  constraint beta_feedback_body_length check (
    char_length(body) between 1 and 500 and btrim(body) <> ''
  ),
  -- 경로 틀 문자만: 소문자, 숫자, /, _, -, [ ]. 숫자 좌표나 초대 코드 원문이 들어올 자리가 없게 짧게 묶는다
  constraint beta_feedback_route_shape check (
    route is null or (char_length(route) <= 64 and route ~ '^/[a-z0-9/_\[\]-]*$')
  ),
  constraint beta_feedback_app_version_shape check (
    char_length(app_version) between 1 and 32 and app_version ~ '^[0-9A-Za-z.+-]+$'
  ),
  constraint beta_feedback_algo_version_shape check (
    char_length(algo_version) between 1 and 32 and algo_version ~ '^[0-9A-Za-z.+-]+$'
  ),
  constraint beta_feedback_device_values check (device in ('ios', 'android', 'desktop'))
);

comment on table public.beta_feedback is
  '베타 의견(T9.4, D-23). 본인 쓰기와 본인 읽기만, 관리자는 admin_beta_feedback()으로 읽는다. 좌표, UA 원문, 쿼리, 카카오 장소 값은 넣지 않는다(route는 경로 틀만). 하루 10건. 베타 종료 6개월 뒤 정리(private.beta_settings), 탈퇴 시 cascade 삭제';
comment on column public.beta_feedback.route is
  '지금 보던 화면의 경로 틀(sanitizeRoute 결과). 쿼리, 해시, 동적 값 없음. 사용자가 끄면 null';
comment on column public.beta_feedback.device is
  'ios, android, desktop. UA 원문은 저장하지 않는다';

create index beta_feedback_created_at_idx on public.beta_feedback (created_at desc);
create index beta_feedback_user_idx on public.beta_feedback (user_id, created_at desc);

alter table public.beta_feedback enable row level security;
revoke all on table public.beta_feedback from public, anon, authenticated;
-- 본인 읽기(지금 화면은 쓰지 않음, 나중에 "내가 보낸 의견" 목록용, 안건 15). 쓰기는 열 단위 권한: id, created_at은 서버 기본값만
grant select on table public.beta_feedback to authenticated;
grant insert (user_id, category, body, route, app_version, algo_version, device, in_app, standalone)
  on table public.beta_feedback to authenticated;
grant all on table public.beta_feedback to service_role;

-- 본인 행만 넣는다(user_id는 세션 사용자로 고정)
create policy beta_feedback_insert_own on public.beta_feedback
  for insert to authenticated
  with check (user_id = (select auth.uid()));

-- 본인 행만 읽는다. 관리자도 이 정책으로는 남의 행을 읽지 못한다(admin_beta_feedback 함수로만)
create policy beta_feedback_select_own on public.beta_feedback
  for select to authenticated
  using (user_id = (select auth.uid()));

-- update, delete 정책과 권한 없음 = 사용자는 고치거나 지울 수 없다(탈퇴 cascade와 보관 기간 정리만)

-- 하루 한도. 넘으면 'beta_feedback_daily_limit_exceeded'(check_violation). 실패한 시도는 트랜잭션과 함께 되돌아간다
create or replace function private.beta_feedback_before_insert()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  perform private.consume_daily_quota(new.user_id, 'beta_feedback');
  return new;
end;
$$;

revoke all on function private.beta_feedback_before_insert() from public, anon, authenticated;

create trigger beta_feedback_quota
  before insert on public.beta_feedback
  for each row execute function private.beta_feedback_before_insert();

-- 정지 사용자 쓰기 차단(T8.5 안건 6과 같은 공통 트리거). 거절되면 위 한도 사용도 함께 되돌아간다
create trigger block_suspended_writer
  before insert on public.beta_feedback
  for each row execute function private.block_suspended_writer();

-- ─────────────────────────────────────────────────────────────
-- 3. 관리자 읽기: admin_beta_feedback (안건 14)
-- ─────────────────────────────────────────────────────────────
-- 최신순, 기본 50건(1~200). p_before를 주면 그 시각보다 앞의 것(다음 쪽).
-- author_no: 같은 사람 묶음 확인용 익명 번호. 첫 의견을 보낸 순서(1부터). 닉네임, 사용자 id는 주지 않는다.
--   탈퇴로 행이 지워지면 뒤 번호가 당겨질 수 있다(묶음 확인용이라 영구 번호는 아니다). 실제 사용자는 관리자가 SQL로만 확인한다.
create or replace function public.admin_beta_feedback(
  p_limit  int default 50,
  p_before timestamptz default null
)
returns table (
  id           uuid,
  author_no    int,
  category     text,
  body         text,
  route        text,
  app_version  text,
  algo_version text,
  device       text,
  in_app       boolean,
  standalone   boolean,
  created_at   timestamptz
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
  with authors as (
    select a.user_id,
           (row_number() over (order by a.first_at, a.user_id))::int as no
      from (
        select f.user_id, min(f.created_at) as first_at
          from public.beta_feedback as f
         group by f.user_id
      ) as a
  )
  select f.id, au.no, f.category, f.body, f.route, f.app_version, f.algo_version,
         f.device, f.in_app, f.standalone, f.created_at
    from public.beta_feedback as f
    join authors as au on au.user_id = f.user_id
   where p_before is null or f.created_at < p_before
   order by f.created_at desc, f.id desc
   limit least(greatest(coalesce(p_limit, 50), 1), 200);
end;
$$;

comment on function public.admin_beta_feedback(int, timestamptz) is
  '관리자 전용 베타 의견 목록(T9.4). 최신순, 작성자는 익명 번호만(닉네임, id 없음). 관리자가 아니면 admin_only(42501)';

revoke all on function public.admin_beta_feedback(int, timestamptz) from public, anon;
grant execute on function public.admin_beta_feedback(int, timestamptz) to authenticated, service_role;

-- ─────────────────────────────────────────────────────────────
-- 4. 보관 기간: 베타 종료 6개월 뒤 삭제 (안건 16)
-- ─────────────────────────────────────────────────────────────
-- 설정 한 줄 테이블. 사용자 역할은 읽지도 쓰지도 못한다(정책 없음 + 권한 회수). 관리자는 SQL 편집기에서만 고친다.
create table private.beta_settings (
  id       boolean primary key default true,
  -- 베타 마지막 날(KST). null이면 아직 진행 중이라 정리하지 않는다
  ended_on date,
  constraint beta_settings_single_row check (id)
);

comment on table private.beta_settings is
  '베타 운영 설정 한 줄(T9.4). ended_on은 T9.13 베타 종료 때 SQL 편집기에서 적는다. 그 뒤 6개월이 지나면 beta_feedback을 지운다';

alter table private.beta_settings enable row level security;
revoke all on table private.beta_settings from public, anon, authenticated;
grant all on table private.beta_settings to service_role;

insert into private.beta_settings (id, ended_on) values (true, null)
  on conflict (id) do nothing;

-- 지우는 것: 종료일 끝(KST 다음 날 0시) + 6개월이 지났을 때, 종료 전에 쓴 글 전부와 종료 뒤에 쓴 글 중 6개월 지난 것.
-- 종료일이 없으면 0건.
create or replace function private.purge_beta_feedback()
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_end   timestamptz;
  v_count integer := 0;
begin
  select ((s.ended_on + 1)::timestamp at time zone 'Asia/Seoul')
    into v_end
    from private.beta_settings as s
   where s.id;

  if v_end is null or now() < v_end + interval '6 months' then
    return 0;
  end if;

  delete from public.beta_feedback as f
   where f.created_at < greatest(v_end, now() - interval '6 months');
  get diagnostics v_count = row_count;
  return v_count;
end;
$$;

revoke all on function private.purge_beta_feedback() from public, anon, authenticated;

select cron.unschedule(j.jobid)
  from cron.job as j
 where j.jobname = 'lunchmate_purge_beta_feedback';

select cron.schedule('lunchmate_purge_beta_feedback', '50 19 * * *',
  'select private.purge_beta_feedback()');
