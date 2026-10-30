-- T4.4 계정 기본 테이블: profiles, offices, preferences, avoid_rules + public_profiles 뷰
-- PRD: AUTH-01, AUTH-01N, AUTH-02, AUTH-05, AUTH-06, ONB-01~03, SET-01~03, SET-05, 10.1절, 11.3절, 11.4절
-- 조사: research-notes T0.14(네이버 닉네임은 콜백에서 채움), T0.16(카카오 장소 값 저장 금지),
--       T0.18(사무실 좌표는 사용자가 직접 놓은 핀만), T0.20(provider 식별자 고정)
-- 결정: D-08(마케팅 동의 컬럼 없음)
--
-- 규칙
-- 1. 모든 테이블은 이 파일 안에서 RLS를 켜고 정책을 만든다(CLAUDE.md 7장).
-- 2. 새 테이블은 Data API에 자동 노출되지 않는다고 보고 anon, authenticated 권한을 직접 준다.
--    먼저 모든 권한을 회수한 뒤 필요한 열만 다시 준다(사용자가 role, status를 바꾸지 못하게 열 단위 권한).
-- 3. 모든 행은 auth.users 삭제 시 함께 지워진다(on delete cascade, AUTH-05, AC-AUTH-3).
-- 4. 카카오 장소 값, 지오코딩 주소, 현위치 좌표 컬럼은 없다.
-- 5. 시각은 timestamptz(UTC 저장). 끼니 판정 같은 KST 해석은 앱의 src/lib/time에서 한다.

-- ─────────────────────────────────────────────────────────────
-- 0. 비공개 스키마: Data API에 노출하지 않는 함수 모음
-- ─────────────────────────────────────────────────────────────
create schema if not exists private;
revoke all on schema private from public, anon;
-- public_profiles 뷰가 private.public_profile_rows()를 호출하므로 authenticated에만 사용 권한을 준다.
grant usage on schema private to authenticated, service_role;
-- Postgres 기본값(함수 생성 시 PUBLIC에 EXECUTE)을 끈다. 필요한 함수만 아래에서 명시적으로 준다.
alter default privileges in schema private revoke execute on functions from public;

-- 공통: updated_at 갱신
create or replace function private.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

-- ─────────────────────────────────────────────────────────────
-- 1. profiles: 본인만 읽고, 닉네임, 아바타, 동의 시각만 고친다
-- ─────────────────────────────────────────────────────────────
create table public.profiles (
  user_id            uuid primary key references auth.users (id) on delete cascade,
  nickname           text,
  avatar_url         text,
  -- 로그인 제공자. 바꾸면 기존 사용자가 새 계정이 되므로 값 목록을 고정한다(T0.20).
  -- 목록 밖의 값(테스트용 email 계정 등)은 null로 둔다.
  provider           text,
  role               text not null default 'user',
  status             text not null default 'active',
  terms_agreed_at    timestamptz,          -- 약관 동의 (AUTH-02)
  birth_confirmed_at timestamptz,          -- 만 14세 이상 확인 (AUTH-06)
  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now(),

  constraint profiles_nickname_len check (
    nickname is null or (char_length(nickname) between 1 and 20 and nickname = btrim(nickname))
  ),
  -- 아바타는 로그인 제공자 CDN의 https 주소만. 다른 사람 화면에 그대로 뜨므로
  -- 임의 주소(추적 픽셀)를 막는다. 허용 호스트: 카카오, 네이버, 구글 프로필 이미지 CDN
  constraint profiles_avatar_url_host check (
    avatar_url is null or (
      char_length(avatar_url) <= 1024
      and avatar_url ~ '^https://([a-z0-9-]+\.)*(kakaocdn\.net|pstatic\.net|googleusercontent\.com)/'
    )
  ),
  constraint profiles_provider_values check (
    provider is null or provider in ('custom:kakao', 'custom:naver', 'google')
  ),
  constraint profiles_role_values check (role in ('user', 'admin')),
  constraint profiles_status_values check (status in ('active', 'suspended'))
);

comment on table public.profiles is
  '사용자 프로필. 본인만 읽기. 다른 사용자의 닉네임, 아바타는 public_profiles 뷰로만 (PRD 10.1)';
comment on column public.profiles.provider is
  'custom:kakao / custom:naver / google. 처음 고른 값을 유지한다 (T0.20)';
comment on column public.profiles.terms_agreed_at is
  '약관 동의 시각. 서버 시각으로 한 번만 기록되고 되돌릴 수 없다(철회는 탈퇴)';
comment on column public.profiles.birth_confirmed_at is
  '만 14세 이상 확인 시각. 서버 시각으로 한 번만 기록되고 되돌릴 수 없다';

-- 동의 시각은 클라이언트가 보낸 값 대신 서버 시각으로 한 번만 기록한다.
create or replace function private.profiles_before_update()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.terms_agreed_at is distinct from old.terms_agreed_at then
    new.terms_agreed_at := coalesce(
      old.terms_agreed_at,
      case when new.terms_agreed_at is not null then now() end
    );
  end if;
  if new.birth_confirmed_at is distinct from old.birth_confirmed_at then
    new.birth_confirmed_at := coalesce(
      old.birth_confirmed_at,
      case when new.birth_confirmed_at is not null then now() end
    );
  end if;
  new.updated_at := now();
  return new;
end;
$$;

create trigger profiles_before_update
  before update on public.profiles
  for each row execute function private.profiles_before_update();

alter table public.profiles enable row level security;

create policy "profiles: 본인 읽기"
  on public.profiles for select to authenticated
  using ((select auth.uid()) = user_id);

create policy "profiles: 본인 수정"
  on public.profiles for update to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);
-- insert 정책 없음: 행은 auth.users 트리거(handle_new_user)만 만든다.
-- delete 정책 없음: 탈퇴는 서버 함수가 auth 사용자를 지우고 cascade로 정리한다(T4.12).

revoke all on table public.profiles from public, anon, authenticated;
grant select on table public.profiles to authenticated;
-- role, status, provider, user_id, created_at은 사용자가 바꿀 수 없다(열 단위 권한)
grant update (nickname, avatar_url, terms_agreed_at, birth_confirmed_at)
  on table public.profiles to authenticated;
grant all on table public.profiles to service_role;

-- ─────────────────────────────────────────────────────────────
-- 2. public_profiles: 다른 사용자에게 보이는 닉네임, 아바타 (로그인 사용자만)
-- ─────────────────────────────────────────────────────────────
-- profiles는 본인만 읽기라서 security_invoker 뷰를 바로 얹으면 남의 행이 안 보인다.
-- 그렇다고 소유자 권한 뷰(security_invoker 없음)를 쓰면 Supabase 린터가 security_definer_view로
-- 막는다. 그래서 Data API에 노출되지 않는 private 스키마에 SECURITY DEFINER 함수를 두고
-- 세 열만 돌려주게 한 뒤, public 뷰는 security_invoker로 그 함수를 감싼다.
-- 뷰 권한은 authenticated에만 준다. 비로그인 투표 미리보기(POLL-05)는 참여 인원 수만 보여 주므로
-- 닉네임이 필요 없다. 정지(suspended) 사용자는 뷰에 나오지 않는다(화면은 이름 없음으로 표시).
create or replace function private.public_profile_rows()
returns table (user_id uuid, nickname text, avatar_url text)
language sql
stable
security definer
set search_path = ''
as $$
  select p.user_id, p.nickname, p.avatar_url
  from public.profiles as p
  where p.status = 'active';
$$;

revoke all on function private.public_profile_rows() from public, anon;
grant execute on function private.public_profile_rows() to authenticated, service_role;

create view public.public_profiles
  with (security_invoker = true)
as
  select r.user_id, r.nickname, r.avatar_url
  from private.public_profile_rows() as r;

comment on view public.public_profiles is
  '공개 후기 작성자, 투표방 참여자 표시용. user_id, 닉네임, 아바타만. 로그인 사용자만 읽기 (PRD 10.1)';

revoke all on table public.public_profiles from public, anon, authenticated;
grant select on table public.public_profiles to authenticated, service_role;

-- ─────────────────────────────────────────────────────────────
-- 3. offices: 사용자가 지도에 직접 놓은 핀 좌표와 이름만 (ONB-01, SET-01, T0.16, T0.18)
-- ─────────────────────────────────────────────────────────────
create table public.offices (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null default auth.uid() references auth.users (id) on delete cascade,
  name       text not null,
  -- 핀 좌표(WGS84). 검색, 지오코딩, 현위치 좌표는 저장하지 않는다. 주소 문자열 컬럼 없음.
  lat        double precision not null,
  lng        double precision not null,
  is_default boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint offices_name_len check (char_length(name) between 1 and 20 and name = btrim(name)),
  -- 대한민국 범위(제주 남단 ~ 휴전선 북쪽 여유, 서해 ~ 독도). 잘못된 좌표 입력 방지용
  constraint offices_lat_range check (lat between 33.0 and 38.7),
  constraint offices_lng_range check (lng between 124.5 and 132.0)
);

comment on table public.offices is
  '사무실 핀. 사용자가 지도에 직접 놓은 좌표와 이름만. 1인 최대 5곳, 기본 1곳 (SET-01, T0.16, T0.18)';

create index offices_user_id_idx on public.offices (user_id);
-- 기본 사무실은 사용자마다 최대 1곳
create unique index offices_one_default_per_user on public.offices (user_id) where is_default;

-- 삽입: 1인 5곳 제한 + 첫 사무실은 자동으로 기본
create or replace function private.offices_before_insert()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
  existing int;
begin
  -- 같은 사용자의 동시 삽입이 둘 다 4곳을 보고 6곳이 되는 경쟁을 막는다
  perform pg_advisory_xact_lock(hashtextextended('offices:' || new.user_id::text, 0));

  select count(*) into existing from public.offices where user_id = new.user_id;
  if existing >= 5 then
    raise exception 'offices_limit_exceeded'
      using errcode = 'check_violation',
            hint = '사무실은 최대 5곳까지 저장할 수 있습니다';
  end if;

  if existing = 0 then
    new.is_default := true;
  end if;
  return new;
end;
$$;

create trigger offices_before_insert
  before insert on public.offices
  for each row execute function private.offices_before_insert();

-- 기본 지정: 새 행을 기본으로 넣거나 바꾸면 같은 사용자의 다른 기본을 해제한다(한 번의 요청으로 전환)
create or replace function private.offices_switch_default()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.is_default and (tg_op = 'INSERT' or not old.is_default) then
    update public.offices
       set is_default = false
     where user_id = new.user_id
       and is_default
       and id <> new.id;
  end if;
  return new;
end;
$$;

create trigger offices_switch_default
  before insert or update of is_default on public.offices
  for each row execute function private.offices_switch_default();

create trigger offices_set_updated_at
  before update on public.offices
  for each row execute function private.set_updated_at();

alter table public.offices enable row level security;

create policy "offices: 본인 읽기"
  on public.offices for select to authenticated
  using ((select auth.uid()) = user_id);

create policy "offices: 본인 추가"
  on public.offices for insert to authenticated
  with check ((select auth.uid()) = user_id);

create policy "offices: 본인 수정"
  on public.offices for update to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

create policy "offices: 본인 삭제"
  on public.offices for delete to authenticated
  using ((select auth.uid()) = user_id);

revoke all on table public.offices from public, anon, authenticated;
grant select, delete on table public.offices to authenticated;
grant insert (user_id, name, lat, lng, is_default) on table public.offices to authenticated;
grant update (name, lat, lng, is_default) on table public.offices to authenticated;
grant all on table public.offices to service_role;

-- ─────────────────────────────────────────────────────────────
-- 4. preferences: 예산, 도보 분, "요즘 이게 땡겨요" (ONB-02, SET-02, SET-05)
-- ─────────────────────────────────────────────────────────────
-- 1인 1행. handle_new_user가 기본값으로 만들고, 사용자는 수정만 한다.
-- 테마, 모션 줄이기, 진동은 기기마다 다른 설정이라 DB가 아니라 브라우저(Zustand)에 둔다.
create table public.preferences (
  user_id            uuid primary key references auth.users (id) on delete cascade,
  lunch_budget       integer not null default 10000,
  dinner_budget      integer not null default 20000,
  walk_minutes       smallint not null default 10,
  -- 요즘 땡기는 카테고리(src/features/place/categories.ts의 slug). 7일 뒤 자동 만료
  craving_categories text[] not null default '{}',
  craving_until      timestamptz,
  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now(),

  constraint preferences_lunch_budget check (
    lunch_budget between 5000 and 30000 and lunch_budget % 1000 = 0
  ),
  constraint preferences_dinner_budget check (
    dinner_budget between 10000 and 60000 and dinner_budget % 1000 = 0
  ),
  constraint preferences_walk_minutes check (walk_minutes in (5, 10, 15, 20)),
  constraint preferences_craving_slugs check (
    cardinality(craving_categories) <= 3
    and craving_categories <@ array[
      'hansik', 'jungsik', 'ilsik', 'yangsik', 'bunsik', 'gukbap',
      'gogi', 'asian', 'fastfood', 'salad', 'cafe', 'pub'
    ]::text[]
  ),
  constraint preferences_craving_until check (
    (cardinality(craving_categories) = 0) = (craving_until is null)
  )
);

comment on table public.preferences is
  '추천 설정. 점심, 저녁 예산(원), 허용 도보 분, 요즘 땡기는 카테고리(7일). 본인만 (SET-02, SET-05)';
comment on column public.preferences.craving_until is
  '서버가 정한다: 카테고리를 바꾼 시각 + 7일. 지나면 추천에서 무시한다(행은 남김)';

-- 땡기는 카테고리: 중복 제거, 바꿀 때마다 만료 시각을 서버 시각 + 7일로 다시 잡는다
create or replace function private.preferences_before_write()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if tg_op = 'INSERT' or new.craving_categories is distinct from old.craving_categories then
    new.craving_categories := array(
      select distinct c from unnest(new.craving_categories) as c order by c
    );
    new.craving_until := case
      when cardinality(new.craving_categories) = 0 then null
      else now() + interval '7 days'
    end;
  end if;
  if tg_op = 'UPDATE' then
    new.updated_at := now();
  end if;
  return new;
end;
$$;

create trigger preferences_before_write
  before insert or update on public.preferences
  for each row execute function private.preferences_before_write();

alter table public.preferences enable row level security;

create policy "preferences: 본인 읽기"
  on public.preferences for select to authenticated
  using ((select auth.uid()) = user_id);

create policy "preferences: 본인 수정"
  on public.preferences for update to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

revoke all on table public.preferences from public, anon, authenticated;
grant select on table public.preferences to authenticated;
-- craving_until은 트리거만 쓴다
grant update (lunch_budget, dinner_budget, walk_minutes, craving_categories)
  on table public.preferences to authenticated;
grant all on table public.preferences to service_role;

-- ─────────────────────────────────────────────────────────────
-- 5. avoid_rules: 못 먹는 음식 (ONB-03, SET-03). 본인만, 남의 규칙은 어떤 경로로도 못 읽는다
-- ─────────────────────────────────────────────────────────────
-- kind: food(음식 종류 칩), allergy(알레르기 칩), custom(직접 입력, 식당 이름이나 업종에 들어가면 제외)
-- 투표 기피 경고(POLL-13)는 이후 보안 함수가 플래그만 돌려준다(T7.x). 이 테이블은 그대로 본인 전용.
create table public.avoid_rules (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null default auth.uid() references auth.users (id) on delete cascade,
  kind       text not null,
  value      text not null,
  created_at timestamptz not null default now(),

  constraint avoid_rules_kind_values check (kind in ('food', 'allergy', 'custom')),
  constraint avoid_rules_value_len check (char_length(value) between 1 and 20 and value = btrim(value)),
  constraint avoid_rules_unique unique (user_id, kind, value)
);

comment on table public.avoid_rules is
  '기피 음식 칩, 알레르기 칩, 직접 입력. 본인만 읽기, 쓰기. 다른 사용자에게 노출 금지 (ONB-03, CLAUDE.md 7장)';

-- 1인 50개 제한(칩 16개 + 직접 입력 여유). 남용 방지용
create or replace function private.avoid_rules_before_insert()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  perform pg_advisory_xact_lock(hashtextextended('avoid_rules:' || new.user_id::text, 0));
  if (select count(*) from public.avoid_rules where user_id = new.user_id) >= 50 then
    raise exception 'avoid_rules_limit_exceeded'
      using errcode = 'check_violation',
            hint = '못 먹는 음식은 최대 50개까지 저장할 수 있습니다';
  end if;
  return new;
end;
$$;

create trigger avoid_rules_before_insert
  before insert on public.avoid_rules
  for each row execute function private.avoid_rules_before_insert();

alter table public.avoid_rules enable row level security;

create policy "avoid_rules: 본인 읽기"
  on public.avoid_rules for select to authenticated
  using ((select auth.uid()) = user_id);

create policy "avoid_rules: 본인 추가"
  on public.avoid_rules for insert to authenticated
  with check ((select auth.uid()) = user_id);

create policy "avoid_rules: 본인 삭제"
  on public.avoid_rules for delete to authenticated
  using ((select auth.uid()) = user_id);
-- update 없음: 칩은 지우고 다시 넣는다

revoke all on table public.avoid_rules from public, anon, authenticated;
grant select, delete on table public.avoid_rules to authenticated;
grant insert (user_id, kind, value) on table public.avoid_rules to authenticated;
grant all on table public.avoid_rules to service_role;

-- ─────────────────────────────────────────────────────────────
-- 6. 가입 트리거: auth.users 생성 → profiles, preferences 기본 행
-- ─────────────────────────────────────────────────────────────
-- 닉네임: 카카오 id_token의 nickname, 구글의 name/full_name. 네이버는 id_token에 sub만 있어
--   비어 있고, /auth/callback이 사용자 세션으로 한 번 채운다(T0.14, T4.7).
-- 아바타: avatar_url 또는 picture. http는 https로 바꾸고, 허용 CDN이 아니면 버린다.
-- provider: app_metadata.provider(서비스 롤만 쓰는 값이라 신뢰 가능). 목록 밖이면 null.
-- 토큰(provider_token 등)은 읽지도 저장하지도 않는다.
-- 이 함수가 실패하면 로그인 자체가 실패하므로 값이 이상하면 오류 대신 null로 둔다.
create or replace function private.meta_nickname(meta jsonb)
returns text
language sql
immutable
set search_path = ''
as $$
  -- 20자로 자른 뒤 다시 btrim해야 잘린 끝 공백이 profiles_nickname_len을 어기지 않는다
  select nullif(btrim(left(btrim(coalesce(
    meta ->> 'nickname',
    meta ->> 'name',
    meta ->> 'full_name',
    meta ->> 'preferred_username'
  )), 20)), '');
$$;

create or replace function private.meta_avatar_url(meta jsonb)
returns text
language sql
immutable
set search_path = ''
as $$
  with raw as (
    select regexp_replace(
      btrim(coalesce(meta ->> 'avatar_url', meta ->> 'picture', '')),
      '^http://', 'https://'
    ) as url
  )
  select case
    when char_length(url) <= 1024
     and url ~ '^https://([a-z0-9-]+\.)*(kakaocdn\.net|pstatic\.net|googleusercontent\.com)/'
    then url
  end
  from raw;
$$;

create or replace function private.meta_provider(app_meta jsonb)
returns text
language sql
immutable
set search_path = ''
as $$
  select case
    when app_meta ->> 'provider' in ('custom:kakao', 'custom:naver', 'google')
    then app_meta ->> 'provider'
  end;
$$;

create or replace function private.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (user_id, nickname, avatar_url, provider)
  values (
    new.id,
    private.meta_nickname(coalesce(new.raw_user_meta_data, '{}'::jsonb)),
    private.meta_avatar_url(coalesce(new.raw_user_meta_data, '{}'::jsonb)),
    private.meta_provider(coalesce(new.raw_app_meta_data, '{}'::jsonb))
  )
  on conflict (user_id) do nothing;

  insert into public.preferences (user_id)
  values (new.id)
  on conflict (user_id) do nothing;

  return new;
end;
$$;

revoke all on function private.handle_new_user() from public, anon, authenticated;
revoke all on function private.meta_nickname(jsonb) from public, anon, authenticated;
revoke all on function private.meta_avatar_url(jsonb) from public, anon, authenticated;
revoke all on function private.meta_provider(jsonb) from public, anon, authenticated;
revoke all on function private.set_updated_at() from public, anon, authenticated;
revoke all on function private.profiles_before_update() from public, anon, authenticated;
revoke all on function private.offices_before_insert() from public, anon, authenticated;
revoke all on function private.offices_switch_default() from public, anon, authenticated;
revoke all on function private.preferences_before_write() from public, anon, authenticated;
revoke all on function private.avoid_rules_before_insert() from public, anon, authenticated;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function private.handle_new_user();

-- 이미 있는 auth 사용자(0단계 로그인 실측 계정 등)도 기본 행을 갖게 한다
insert into public.profiles (user_id, nickname, avatar_url, provider)
select
  u.id,
  private.meta_nickname(coalesce(u.raw_user_meta_data, '{}'::jsonb)),
  private.meta_avatar_url(coalesce(u.raw_user_meta_data, '{}'::jsonb)),
  private.meta_provider(coalesce(u.raw_app_meta_data, '{}'::jsonb))
from auth.users as u
on conflict (user_id) do nothing;

insert into public.preferences (user_id)
select u.id from auth.users as u
on conflict (user_id) do nothing;
