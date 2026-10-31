-- T5.14 방문 기록, 즐겨찾기, 다시 안 갈 곳: visits, favorites, blocklist
-- PRD: NAV-04, FB-01, FB-04, FB-05, HIS-01, HIS-02, REC-08, 10.1절, 11.4절
-- 조사: research-notes T0.16(카카오 장소 값은 place_id와 place_url만 저장, 이름, 주소, 좌표, 카테고리 저장 금지)
--
-- 규칙 (T4.4 마이그레이션과 같다)
-- 1. 모든 테이블은 이 파일 안에서 RLS를 켜고 정책을 만든다(CLAUDE.md 7장). 세 테이블 모두 본인만.
-- 2. 권한은 모두 회수한 뒤 필요한 열만 다시 준다(사용자가 visited_on, feedback_requested_at 같은 서버 값을 못 바꾸게).
-- 3. 모든 행은 auth.users 삭제 시 함께 지워진다(on delete cascade, AUTH-05, PRD 11.4).
-- 4. 카카오 값은 place_id(숫자 문자열)와 place_url(그 id의 카카오맵 상세 주소)만. 장소명, 주소, 좌표, 카테고리 컬럼 없음.
--    place_url은 place_id와 짝이 맞는 카카오맵 주소만 허용해 다른 값을 담는 통로가 되지 않게 한다.
-- 5. 사용자 메모 컬럼은 만들지 않는다. 카카오 답변(T10.2) 뒤 허용되면 새 마이그레이션으로 추가하고
--    기능 플래그 userPlaceMemo(src/lib/flags.ts)로 화면을 연다.
-- 6. 시각은 timestamptz(UTC 저장). 방문일(visited_on)은 서버가 KST 날짜로 정한다.
-- 7. 투표 확정 시 참여자 전원의 방문 후보는 T7.9 마감 보안 함수(security definer)가 만든다. 여기서는 정책을 넓히지 않는다.

-- ─────────────────────────────────────────────────────────────
-- 1. visits: 방문 후보와 방문 기록 (NAV-04, FB-01, HIS-01)
-- ─────────────────────────────────────────────────────────────
-- 길찾기를 누르면 그날 그 끼니의 방문 후보(status candidate)가 생긴다(NAV-04).
-- 다음 접속 때 "어제 ○○ 어땠어요?"를 물으면 feedback_requested_at이 기록되고(하루 1회, FB-04),
-- 답하면 visited(👍/👎) 또는 not_visited(안 갔어요, 부정 신호 아님 FB-05)로 바뀐다. 평가 자체는 feedback 테이블(T6) 몫.
create table public.visits (
  id                    uuid primary key default gen_random_uuid(),
  user_id               uuid not null default auth.uid() references auth.users (id) on delete cascade,
  place_id              text not null,
  place_url             text,
  meal                  text not null,
  -- 방문일(KST 날짜). 서버가 정한다(트리거). 사용자가 날짜를 거슬러 넣지 못하게 열 권한을 주지 않는다
  visited_on            date not null default ((now() at time zone 'Asia/Seoul')::date),
  -- 출처: rec 추천, poll 투표, map 지도 (PRD 10.2 directions_clicked.source, feedback_prompt_shown.visit_source와 같은 값)
  source                text not null,
  status                text not null default 'candidate',
  -- 피드백을 물은 시각. 서버 시각으로 한 번만 기록된다(FB-04 하루 1회, 48시간 판정의 기준)
  feedback_requested_at timestamptz,
  created_at            timestamptz not null default now(),
  updated_at            timestamptz not null default now(),

  constraint visits_place_id_format check (place_id ~ '^[0-9]{1,20}$'),
  constraint visits_place_url_format check (
    place_url is null
    or place_url in ('https://place.map.kakao.com/' || place_id, 'http://place.map.kakao.com/' || place_id)
  ),
  constraint visits_meal_values check (meal in ('lunch', 'dinner')),
  constraint visits_source_values check (source in ('rec', 'poll', 'map')),
  constraint visits_status_values check (status in ('candidate', 'visited', 'not_visited')),
  -- 같은 날 같은 끼니 같은 곳은 한 행. 길찾기를 여러 번 눌러도 후보는 하나(insert ... on conflict do nothing)
  constraint visits_unique_per_meal unique (user_id, visited_on, meal, place_id)
);

comment on table public.visits is
  '방문 후보와 기록. 카카오 값은 place_id, place_url만. 본인만 (NAV-04, FB-01, HIS-01, T0.16)';
comment on column public.visits.visited_on is
  'KST 방문일. 서버가 삽입 시각으로 정한다';
comment on column public.visits.status is
  'candidate 길찾기 누름, visited 다녀옴(👍/👎 응답), not_visited 안 갔어요(부정 신호 아님, FB-05)';
comment on column public.visits.feedback_requested_at is
  '피드백을 물은 시각. 서버 시각으로 한 번만 기록되고 되돌릴 수 없다 (FB-04)';

create index visits_user_recent_idx on public.visits (user_id, visited_on desc, created_at desc);

-- 삽입: 방문일은 서버 KST 날짜, 상태는 후보로 시작, 물은 시각은 비움. 1인 하루 20건 제한(남용 방지)
create or replace function private.visits_before_insert()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.visited_on := (now() at time zone 'Asia/Seoul')::date;
  new.status := 'candidate';
  new.feedback_requested_at := null;

  perform pg_advisory_xact_lock(hashtextextended('visits:' || new.user_id::text, 0));
  if (
    select count(*) from public.visits
     where user_id = new.user_id and visited_on = new.visited_on
  ) >= 20 then
    raise exception 'visits_daily_limit_exceeded'
      using errcode = 'check_violation',
            hint = '방문 기록은 하루 20건까지 저장할 수 있습니다';
  end if;
  return new;
end;
$$;

create trigger visits_before_insert
  before insert on public.visits
  for each row execute function private.visits_before_insert();

-- 수정: 상태는 후보로 되돌릴 수 없고, 물은 시각은 서버 시각으로 한 번만
create or replace function private.visits_before_update()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.status is distinct from old.status
     and new.status = 'candidate' then
    raise exception 'visits_status_back_to_candidate'
      using errcode = 'check_violation',
            hint = '응답한 방문은 후보로 되돌릴 수 없습니다';
  end if;
  if new.feedback_requested_at is distinct from old.feedback_requested_at then
    new.feedback_requested_at := coalesce(
      old.feedback_requested_at,
      case when new.feedback_requested_at is not null then now() end
    );
  end if;
  new.updated_at := now();
  return new;
end;
$$;

create trigger visits_before_update
  before update on public.visits
  for each row execute function private.visits_before_update();

alter table public.visits enable row level security;

create policy "visits: 본인 읽기"
  on public.visits for select to authenticated
  using ((select auth.uid()) = user_id);

create policy "visits: 본인 추가"
  on public.visits for insert to authenticated
  with check ((select auth.uid()) = user_id);

create policy "visits: 본인 수정"
  on public.visits for update to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

create policy "visits: 본인 삭제"
  on public.visits for delete to authenticated
  using ((select auth.uid()) = user_id);

revoke all on table public.visits from public, anon, authenticated;
grant select, delete on table public.visits to authenticated;
grant insert (user_id, place_id, place_url, meal, source) on table public.visits to authenticated;
grant update (status, feedback_requested_at) on table public.visits to authenticated;
grant all on table public.visits to service_role;

-- ─────────────────────────────────────────────────────────────
-- 2. favorites: 즐겨찾기 (REC-08, HIS-02)
-- ─────────────────────────────────────────────────────────────
create table public.favorites (
  user_id    uuid not null default auth.uid() references auth.users (id) on delete cascade,
  place_id   text not null,
  place_url  text,
  created_at timestamptz not null default now(),

  primary key (user_id, place_id),
  constraint favorites_place_id_format check (place_id ~ '^[0-9]{1,20}$'),
  constraint favorites_place_url_format check (
    place_url is null
    or place_url in ('https://place.map.kakao.com/' || place_id, 'http://place.map.kakao.com/' || place_id)
  )
);

comment on table public.favorites is
  '즐겨찾기. 카카오 값은 place_id, place_url만. 메모 컬럼 없음(T10.2 답변 전). 본인만 (HIS-02, T0.16)';

-- ─────────────────────────────────────────────────────────────
-- 3. blocklist: 다시 안 갈 곳 (REC-08, HIS-02, 추천 하드 필터 2순위)
-- ─────────────────────────────────────────────────────────────
create table public.blocklist (
  user_id    uuid not null default auth.uid() references auth.users (id) on delete cascade,
  place_id   text not null,
  place_url  text,
  created_at timestamptz not null default now(),

  primary key (user_id, place_id),
  constraint blocklist_place_id_format check (place_id ~ '^[0-9]{1,20}$'),
  constraint blocklist_place_url_format check (
    place_url is null
    or place_url in ('https://place.map.kakao.com/' || place_id, 'http://place.map.kakao.com/' || place_id)
  )
);

comment on table public.blocklist is
  '다시 안 갈 곳. 추천 하드 필터에 쓴다. 카카오 값은 place_id, place_url만. 본인만 (HIS-02, T0.16)';

-- 즐겨찾기, 다시 안 갈 곳은 각각 1인 300곳 제한(남용 방지). 테이블 이름을 인자로 받는 한 함수로 둔다
create or replace function private.place_list_before_insert()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
  existing int;
begin
  perform pg_advisory_xact_lock(hashtextextended(tg_table_name || ':' || new.user_id::text, 0));
  if tg_table_name = 'favorites' then
    select count(*) into existing from public.favorites where user_id = new.user_id;
  else
    select count(*) into existing from public.blocklist where user_id = new.user_id;
  end if;
  if existing >= 300 then
    raise exception '%_limit_exceeded', tg_table_name
      using errcode = 'check_violation',
            hint = '최대 300곳까지 저장할 수 있습니다';
  end if;
  return new;
end;
$$;

create trigger favorites_before_insert
  before insert on public.favorites
  for each row execute function private.place_list_before_insert();

create trigger blocklist_before_insert
  before insert on public.blocklist
  for each row execute function private.place_list_before_insert();

alter table public.favorites enable row level security;
alter table public.blocklist enable row level security;

create policy "favorites: 본인 읽기"
  on public.favorites for select to authenticated
  using ((select auth.uid()) = user_id);

create policy "favorites: 본인 추가"
  on public.favorites for insert to authenticated
  with check ((select auth.uid()) = user_id);

create policy "favorites: 본인 삭제"
  on public.favorites for delete to authenticated
  using ((select auth.uid()) = user_id);

create policy "blocklist: 본인 읽기"
  on public.blocklist for select to authenticated
  using ((select auth.uid()) = user_id);

create policy "blocklist: 본인 추가"
  on public.blocklist for insert to authenticated
  with check ((select auth.uid()) = user_id);

create policy "blocklist: 본인 삭제"
  on public.blocklist for delete to authenticated
  using ((select auth.uid()) = user_id);
-- update 없음: 지우고 다시 넣는다(해제 = 삭제, HIS-02)

revoke all on table public.favorites from public, anon, authenticated;
grant select, delete on table public.favorites to authenticated;
grant insert (user_id, place_id, place_url) on table public.favorites to authenticated;
grant all on table public.favorites to service_role;

revoke all on table public.blocklist from public, anon, authenticated;
grant select, delete on table public.blocklist to authenticated;
grant insert (user_id, place_id, place_url) on table public.blocklist to authenticated;
grant all on table public.blocklist to service_role;

-- 트리거 함수는 직접 호출할 수 없게 한다(T4.4와 같은 관례)
revoke all on function private.visits_before_insert() from public, anon, authenticated;
revoke all on function private.visits_before_update() from public, anon, authenticated;
revoke all on function private.place_list_before_insert() from public, anon, authenticated;
