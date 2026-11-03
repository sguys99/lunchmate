-- T10.16c 메뉴와 메뉴별 가격 제보 (PRD 6.6B MENU-01~05, D-34, D-35).
-- 결정: design-decisions D-34(만들기), D-35(시안 조합 A + C와 안건). 설계 초안: docs/design/g10-comparison-menu.md 6절.
-- 앞 마이그레이션: 20261103100000_t10_15_place_memos.sql
--   다시 쓰는 것: private.kst_today(), private.daily_usage, private.consume_daily_quota(T6.5),
--   private.block_suspended_writer(T8.5), private.reject_banned_text(T10.3b), public.account_residue(T6.27, auth.users 외래 키를 카탈로그에서 찾음).
--
-- 이 파일이 하는 일 (파괴적 변경 없음: 테이블과 함수를 더하고, 한도 버킷 목록을 넓히고, 한도 표 함수를 같은 모양으로 바꾼다)
-- 1. 하루 한도 버킷 'menu_reports'(KST 하루 20건, 피드백 시트와 상세 알려주기 합산, MOD-05). check 제약 교체와 함수 교체뿐, 기존 행 영향 없음.
-- 2. public.menu_reports: 사용자가 직접 쓴 메뉴 이름과 가격. 원본 행은 본인만 읽고 쓰고 지운다. 고치기 없음(지우고 다시).
--    - 카카오 값은 place_id, place_url만(favorites, place_memos와 같은 형식 검사). 장소명, 주소, 좌표, 카테고리 열 없음(CLAUDE.md 7장).
--    - menu_name: 1~20자(코드 포인트), NFC, 앞뒤 공백 없음, 연속 공백과 제어 문자 없음. 서버 zod(normalizeMenuName)와 같은 규칙.
--    - menu_key: 트리거가 채운다(공백을 모두 지우고 소문자). 같은 메뉴 판정과 집계 묶음(D-35 안건 4).
--    - price_krw: 1천~10만 원, 500원 단위(FB-02 스테퍼와 같음).
--    - source: feedback(식후 피드백 시트, review_id 필수, 그 후기를 지우면 함께 지워짐) / detail(상세 알려주기, review_id 없음).
--      review_id는 본인 후기, 같은 place_id여야 한다(트리거). 후기 하나에 메뉴 하나.
--    - 같은 식당 같은 메뉴(menu_key)는 사용자당 KST 하루 1회(MENU-02).
--    - 추천 점수와 하드 필터에 쓰지 않는다(src/lib/reco는 이 테이블과 집계를 읽지 않는다, AC-MENU-2).
--    - 탈퇴: user_id → auth.users on delete cascade(PRD 11.4). account_residue가 자동으로 센다.
--    - hidden_at: 관리자 숨김 자리(T10.16f 관리자 함수는 다음 마이그레이션). 숨긴 행은 집계에서 빠진다.
-- 3. 트리거(이름 알파벳 순으로 돈다)
--      block_suspended_writer             insert   정지 사용자 쓰기 차단(account_suspended, 42501). 지우기는 막지 않는다
--      menu_reports_banned_text_guard     insert   금칙어, 연락처, 링크(banned_content, 23514)
--      menu_reports_before_insert         insert   menu_key, kst_day, review_id 검사, 하루 20건
--    거절되면 한도 사용도 트랜잭션과 함께 되돌아간다.
-- 4. public.place_menus(place_ids): 익명 집계. 최근 180일(D-35 안건 6), 숨김 행과 숨긴 후기에서 온 행 제외,
--    사용자마다 메뉴(menu_key)별 최신 제보 하나만 센다(같은 사람이 여러 날 남겨도 1표, place_stats의 latest_price와 같은 원칙).
--    메뉴별 가격 중앙값(100원 반올림), 제보 수, 대표 이름(가장 많이 쓴 표기, 같으면 최근), 최근 제보 월(KST). 식당마다 제보 수 많은 순 3개.
--    user_id와 원본 행은 돌려주지 않는다(AC-MENU-1). 비로그인도 부른다(상세는 비로그인도 본다). 한 번에 60곳까지.
--
-- 홈 카드 대표 메뉴(D-35 A, 제보 2건 이상인 1위)는 홈 집계 서버 액션(stats-source.ts)이 place_stats와 나란히 place_menus를 불러 쓴다.
-- public.place_stats는 바꾸지 않는다(반환형을 바꾸려면 drop 후 다시 만들어야 하고, 지도, 회식, 투표방도 쓴다).
--
-- 바꾸지 않는 것
-- - public.my_daily_limits(): 메뉴 칸은 열 때 남은 수를 미리 보이지 않고(보낼 때 한도 응답만) 목록을 그대로 둔다(T9.4, T10.15와 같은 이유).
-- - private.moderation_actions: 메뉴 숨김과 합치기 처리 이력은 T10.16f 마이그레이션에서 action 값을 넓힌다.
--
-- 플래그 menuReports를 끄면 앱이 메뉴를 숨기고 쓰기를 막는다. 데이터를 지워야 하면 사용자 승인 뒤 새 마이그레이션으로.
--
-- 되돌리기 (새 마이그레이션으로):
--   drop function if exists public.place_menus(text[]);
--   drop table if exists public.menu_reports;   -- 트리거와 정책도 함께 지워진다
--   drop function if exists private.menu_reports_before_insert();
--   (버킷 'menu_reports'는 남겨도 쓰는 곳이 없다)
--
-- 규칙: 이미 푸시된 마이그레이션은 고치지 않는다(CLAUDE.md 11장). 새 테이블은 이 파일에서 RLS를 켜고 정책을 만든다.

-- ─────────────────────────────────────────────────────────────
-- 1. 한도 버킷 'menu_reports' (하루 20건)
-- ─────────────────────────────────────────────────────────────
alter table private.daily_usage drop constraint daily_usage_bucket_values;
alter table private.daily_usage
  add constraint daily_usage_bucket_values
  check (bucket in ('reviews', 'reports', 'deals', 'polls', 'beta_feedback', 'place_memos', 'menu_reports'));

-- 값을 바꾸면 src/copy 메뉴 한도 문구도 함께 고친다(src/lib/moderation/limits.test.ts가 비교한다)
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
    when 'place_memos'   then 30   -- T10.15 식당 메모 저장과 고침 하루 30 (D-33)
    when 'menu_reports'  then 20   -- T10.16 메뉴 제보 하루 20 (MOD-05, D-35 안건 8)
  end;
$$;

revoke all on function private.daily_quota_max(text) from public, anon, authenticated;

-- ─────────────────────────────────────────────────────────────
-- 2. menu_reports
-- ─────────────────────────────────────────────────────────────
create table public.menu_reports (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null default auth.uid() references auth.users (id) on delete cascade,
  place_id     text not null,
  place_url    text,
  -- 사용자가 빈 입력란에 직접 쓰거나 이미 제보된 메뉴 칩에서 고른 이름. 카카오 장소명, 카테고리 이름 미리 채우기 없음
  menu_name    text not null,
  -- 트리거가 채운다(사용자가 넣지 않음). 공백 제거 + 소문자
  menu_key     text not null default '',
  price_krw    integer not null,
  source       text not null,
  -- 식후 피드백에서 왔으면 그 후기. 후기를 지우면(본인, 방문 삭제, 탈퇴) 함께 지워진다(MENU-01)
  review_id    uuid references public.reviews (id) on delete cascade,
  hidden_at    timestamptz,
  hidden_reason text,
  -- 트리거가 채운다(KST 날짜). 같은 메뉴 하루 1회 판정
  kst_day      date not null default '1970-01-01',
  created_at   timestamptz not null default now(),

  constraint menu_reports_place_id_format check (place_id ~ '^[0-9]{1,20}$'),
  constraint menu_reports_place_url_format check (
    place_url is null
    or place_url in ('https://place.map.kakao.com/' || place_id, 'http://place.map.kakao.com/' || place_id)
  ),
  -- 1~20자(코드 포인트, PRD MENU-01, D-35 안건 5)
  constraint menu_reports_name_length check (char_length(menu_name) between 1 and 20),
  -- NFC, 앞뒤 공백 없음, 연속 공백 없음, 줄바꿈과 탭 같은 제어 문자 없음
  constraint menu_reports_name_shape check (
    menu_name is nfc normalized
    and menu_name = btrim(menu_name)
    and menu_name !~ '\s{2,}'
    and menu_name !~ '[[:cntrl:]]'
  ),
  constraint menu_reports_price_range check (price_krw between 1000 and 100000 and price_krw % 500 = 0),
  constraint menu_reports_source_values check (source in ('feedback', 'detail')),
  constraint menu_reports_source_review check ((source = 'feedback') = (review_id is not null)),
  constraint menu_reports_hidden_pair check ((hidden_at is null) = (hidden_reason is null)),
  constraint menu_reports_hidden_reason_values check (hidden_reason is null or hidden_reason in ('admin', 'merged')),
  constraint menu_reports_once_per_day unique (user_id, place_id, menu_key, kst_day),
  constraint menu_reports_one_per_review unique (review_id)
);

comment on table public.menu_reports is
  '메뉴 제보(T10.16, PRD MENU, D-34, D-35). 사용자가 직접 쓴 메뉴 이름(20자)과 가격. 원본은 본인만, 다른 사람에게는 place_menus 집계로만. 카카오 값은 place_id, place_url만. 추천 점수에 쓰지 않는다. 하루 20건, 같은 메뉴 하루 1회. 탈퇴 시 cascade';
comment on column public.menu_reports.menu_name is
  '사용자가 빈 입력란에 직접 쓰거나 이미 제보된 메뉴에서 고른 이름(1~20자, NFC). 장소명 미리 채우기 없음. 금칙어 트리거 대상';
comment on column public.menu_reports.menu_key is
  '같은 메뉴 판정 키: 공백을 모두 지우고 소문자. 트리거가 채운다(D-35 안건 4)';

-- 집계: 식당별 최근 제보. 본인 목록: user_id 기준
create index menu_reports_place_recent_idx on public.menu_reports (place_id, created_at desc) where hidden_at is null;
create index menu_reports_user_idx on public.menu_reports (user_id, created_at desc);

alter table public.menu_reports enable row level security;

create policy "menu_reports: 본인 읽기"
  on public.menu_reports for select to authenticated
  using ((select auth.uid()) = user_id);

create policy "menu_reports: 본인 추가"
  on public.menu_reports for insert to authenticated
  with check ((select auth.uid()) = user_id and hidden_at is null and hidden_reason is null);

create policy "menu_reports: 본인 지우기"
  on public.menu_reports for delete to authenticated
  using ((select auth.uid()) = user_id);
-- update 정책 없음(고치려면 지우고 다시). anon 정책 없음. 관리자 처리는 T10.16f 보안 함수

revoke all on table public.menu_reports from public, anon, authenticated;
grant select, delete on table public.menu_reports to authenticated;
-- menu_key, kst_day, hidden_*, created_at은 사용자가 넣지 못한다(트리거, 기본값)
grant insert (user_id, place_id, place_url, menu_name, price_krw, source, review_id) on table public.menu_reports to authenticated;
grant all on table public.menu_reports to service_role;

-- ─────────────────────────────────────────────────────────────
-- 3. 트리거
-- ─────────────────────────────────────────────────────────────
-- 정지 사용자 쓰기 차단(T8.5 공통 트리거). 지우기는 막지 않는다(본인 글 정리는 허용)
create trigger block_suspended_writer
  before insert on public.menu_reports
  for each row execute function private.block_suspended_writer();

-- 금칙어 DB 안전망 (T10.3b 함수 그대로). 연락처와 링크 검사가 카카오 값 옮겨 담기도 막는다
create trigger menu_reports_banned_text_guard
  before insert on public.menu_reports
  for each row execute function private.reject_banned_text('menu_name');

-- menu_key, kst_day를 채우고, review_id가 본인 후기이며 같은 식당인지 확인하고, 하루 20건을 센다.
-- 소유자 권한(security definer): 한도 함수(consume_daily_quota)는 authenticated에 실행 권한이 없다.
-- 거절: 'menu_reports_review_mismatch'(check_violation, 23514), 한도는 consume_daily_quota가 'daily_limit_exceeded'
create or replace function private.menu_reports_before_insert()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  new.menu_key := lower(regexp_replace(new.menu_name, '\s', '', 'g'));
  new.kst_day := private.kst_today();
  new.created_at := now();
  if new.review_id is not null and not exists (
    select 1
      from public.reviews as r
     where r.id = new.review_id
       and r.user_id = new.user_id
       and r.place_id = new.place_id
  ) then
    raise exception 'menu_reports_review_mismatch'
      using errcode = 'check_violation',
            hint = '본인 후기와 같은 식당의 메뉴만 남길 수 있습니다';
  end if;
  perform private.consume_daily_quota(new.user_id, 'menu_reports');
  return new;
end;
$$;

revoke all on function private.menu_reports_before_insert() from public, anon, authenticated;

create trigger menu_reports_before_insert
  before insert on public.menu_reports
  for each row execute function private.menu_reports_before_insert();

-- ─────────────────────────────────────────────────────────────
-- 4. place_menus: 식당별 메뉴 집계 (MENU-03, MENU-04)
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
begin
  if p_place_ids is null or cardinality(p_place_ids) = 0 then
    return;
  end if;
  if cardinality(p_place_ids) > 60 then
    raise exception 'place_menus_too_many_ids'
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
    select m.user_id, m.place_id as pid, m.menu_key as k, m.menu_name as nm, m.price_krw, m.created_at
      from public.menu_reports as m
      left join public.reviews as r on r.id = m.review_id
     where m.place_id in (select pid from ids)
       and m.hidden_at is null
       and m.created_at >= now() - interval '180 days'
       -- 숨긴 후기(신고 3건, 관리자)에서 온 메뉴는 함께 뺀다
       and (m.review_id is null or r.hidden_at is null)
  ),
  -- 사용자마다 메뉴별 최신 제보 하나(같은 사람이 여러 날 남겨도 1표)
  latest as (
    select distinct on (v.user_id, v.pid, v.k) v.pid, v.k, v.nm, v.price_krw, v.created_at
      from visible as v
     order by v.user_id, v.pid, v.k, v.created_at desc
  ),
  stats as (
    select l.pid, l.k,
           count(*)::int as n,
           (round(percentile_cont(0.5) within group (order by l.price_krw) / 100.0) * 100)::int as median,
           max(l.created_at) as last_at
      from latest as l
     group by l.pid, l.k
  ),
  -- 대표 이름: 가장 많이 쓴 표기, 같으면 최근 표기
  names as (
    select distinct on (x.pid, x.k) x.pid, x.k, x.nm
      from (
        select l.pid, l.k, l.nm, count(*) as c, max(l.created_at) as at
          from latest as l
         group by l.pid, l.k, l.nm
      ) as x
     order by x.pid, x.k, x.c desc, x.at desc
  ),
  ranked as (
    select s.pid, s.k, n2.nm, s.median, s.n,
           date_trunc('month', s.last_at at time zone 'Asia/Seoul')::date as last_month,
           row_number() over (partition by s.pid order by s.n desc, s.last_at desc, s.k)::int as rn
      from stats as s
      join names as n2 on n2.pid = s.pid and n2.k = s.k
  )
  select r.pid, r.k, r.nm, r.median, r.n, r.last_month, r.rn
    from ranked as r
   where r.rn <= 3
   order by r.pid, r.rn;
end;
$$;

comment on function public.place_menus(text[]) is
  '식당별 메뉴 익명 집계(T10.16, MENU-03, MENU-04): 최근 180일, 사용자마다 메뉴별 최신 1건, 메뉴별 가격 중앙값과 제보 수, 대표 이름, 최근 제보 월, 상위 3개. 작성자 없음(AC-MENU-1). 추천 점수에 쓰지 않는다';

revoke all on function public.place_menus(text[]) from public;
grant execute on function public.place_menus(text[]) to anon, authenticated, service_role;
