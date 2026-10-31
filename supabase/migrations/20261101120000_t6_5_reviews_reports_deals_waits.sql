-- T6.5 후기, 신고, 제보, 할인, 웨이팅 + T6.6 집계 보안 함수
-- 테이블: reviews, review_reports, place_reports, place_deals, place_deal_checks, wait_reports, private.daily_usage
-- 함수:   place_stats, place_reviews, place_deals_list, register_deal, report_wait, my_daily_limits
-- PRD: FB-01~07, HIS-03, PLACE-02, PLACE-03, PLACE-05, PLACE-07, PLACE-08, DEAL-01~04, MOD-01~03, MOD-05,
--      AC-FB-2, AC-DEAL-1, AC-DEAL-3, 10.1절, 11.2절, 11.4절
-- 결정: 사용자 결정(2026-10-31), g6-comparison-report 5절 안건 2, 3, 5, 6, 7, 8, 9, 10, 12,
--       g6-comparison-feedback 5절 안건 4, 9, g6-comparison-me 5절 안건 3(늦은 답은 방문 후 14일까지)
-- 조사: research-notes T0.16(카카오 장소 값은 place_id와 place_url만 저장)
--
-- 규칙 (T4.4, T5.14 마이그레이션과 같다)
-- 1. 모든 테이블은 이 파일 안에서 RLS를 켜고 정책을 만든다(CLAUDE.md 7장).
-- 2. 권한은 모두 회수한 뒤 필요한 열만 다시 준다. 숨김, 상태, 날짜 같은 서버 값은 사용자가 못 바꾼다.
-- 3. 모든 행은 auth.users 삭제 시 함께 지워진다(on delete cascade, PRD 11.4). 집계는 그때그때 계산하므로
--    탈퇴한 사용자의 후기는 자동으로 집계에서 빠진다.
-- 4. 카카오 값은 place_id와 place_url만. 장소명, 주소, 좌표, 카테고리 컬럼 없음.
-- 5. 비공개 후기의 글(body)은 작성자 본인 외에는 어떤 응답에도 나오지 않는다(AC-FB-2).
--    다른 사람이 읽는 길은 아래 보안 함수 셋뿐이고, 셋 다 body를 is_public인 행에서만 꺼낸다(place_reviews).
--    가격, 👍/👎, 태그는 공개 여부와 상관없이 익명 집계(place_stats)에 들어간다(PRD 11.2 [확정]).
-- 6. 작성자 user_id는 다른 사람에게 돌려주지 않는다. 공개 후기 작성자는 닉네임과 아바타만(public_profiles와 같은 값).
-- 7. 시각은 timestamptz(UTC). "오늘", "하루 한도", "종료일"은 KST 날짜(private.kst_today())로 판정한다.
-- 8. 일일 한도(MOD-05, DEAL-04)는 Postgres 함수가 센다: 후기 20, 신고(후기, 할인 신고 + 식당 정보 제보) 30, 할인 제보 10.
--    지워도 돌려주지 않는 카운터(private.daily_usage)로 센다(지웠다 다시 쓰기로 한도를 넘지 못하게).
-- 9. 금칙어(MOD-04)는 TS 서버 계층(zod)에서 거른다. 여기서는 길이와 형식만 본다.
-- 10. 하루 지난 웨이팅 삭제, 종료 할인 상태 갱신, 지난 한도 카운터 정리는 pg_cron 마이그레이션(T6.26)이 맡는다.
--     그 전에도 읽기 함수가 30분, 종료일을 직접 걸러서 지난 값은 응답에 나오지 않는다(AC-DEAL-1).
-- 11. 수익화 테이블(sponsors, coupons 등)은 만들지 않는다. place_deals.source의 owner, sponsor는 값 목록에만 있다.

-- ─────────────────────────────────────────────────────────────
-- 0. 공통 도구
-- ─────────────────────────────────────────────────────────────

-- KST 오늘 날짜. 보안 함수와 트리거 안에서만 쓴다(정책, 기본값에서는 부르지 않는다)
create or replace function private.kst_today()
returns date
language sql
stable
set search_path = ''
as $$
  select (now() at time zone 'Asia/Seoul')::date;
$$;

-- 일일 한도 표. 값을 바꾸면 src/copy 안내 문구(하루 n건)도 함께 바꾼다
create or replace function private.daily_quota_max(p_bucket text)
returns int
language sql
immutable
set search_path = ''
as $$
  select case p_bucket
    when 'reviews' then 20   -- MOD-05 후기 하루 20
    when 'reports' then 30   -- MOD-05 신고 하루 30 (후기 신고, 할인 신고, 식당 정보 제보 합산, 안건 12)
    when 'deals'   then 10   -- DEAL-04 할인 제보 하루 10
  end;
$$;

-- 일일 사용량 카운터. Data API에 노출되지 않는 private 스키마에 두고, 보안 함수만 읽고 쓴다
create table private.daily_usage (
  user_id uuid not null references auth.users (id) on delete cascade,
  kst_day date not null,
  bucket  text not null,
  used    int  not null default 0,

  primary key (user_id, kst_day, bucket),
  constraint daily_usage_bucket_values check (bucket in ('reviews', 'reports', 'deals')),
  constraint daily_usage_used_nonneg check (used >= 0)
);

comment on table private.daily_usage is
  '일일 한도 카운터(MOD-05, DEAL-04). 지워도 줄지 않는다. 보안 함수만 쓴다. 지난 날짜 행은 T6.26 pg_cron이 지운다';

-- 정책 없음 = 사용자 역할은 아무것도 못 한다. 소유자(보안 함수)만 쓴다
alter table private.daily_usage enable row level security;
revoke all on table private.daily_usage from public, anon, authenticated;
grant all on table private.daily_usage to service_role;

-- 한도 1건 사용. 넘으면 '<bucket>_daily_limit_exceeded'(check_violation)로 거절하고, 예외라서 증가분도 되돌아간다.
-- 같은 트랜잭션 안의 뒤 단계(유일 키 위반 등)가 실패해도 함께 되돌아가므로 실패한 시도는 세지 않는다.
create or replace function private.consume_daily_quota(p_user_id uuid, p_bucket text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_max  int := private.daily_quota_max(p_bucket);
  v_used int;
begin
  if v_max is null then
    raise exception 'daily_quota_unknown_bucket' using errcode = 'check_violation';
  end if;

  insert into private.daily_usage as u (user_id, kst_day, bucket, used)
  values (p_user_id, private.kst_today(), p_bucket, 1)
  on conflict (user_id, kst_day, bucket) do update set used = u.used + 1
  returning u.used into v_used;

  if v_used > v_max then
    raise exception '%_daily_limit_exceeded', p_bucket
      using errcode = 'check_violation',
            hint = format('오늘은 %s건까지 남길 수 있습니다', v_max);
  end if;
end;
$$;

-- ─────────────────────────────────────────────────────────────
-- 1. visits.source에 'detail' 추가 (FB-06 상세에서 직접 후기 → 방문 기록 자동 생성)
-- ─────────────────────────────────────────────────────────────
-- [제안] 상세에서 쓴 후기는 길찾기 없이 생긴 방문이라 rec, poll, map 어디에도 맞지 않는다.
-- 허용 값을 넓히기만 하므로 기존 행에 영향이 없다(제약 교체, 데이터 변경 없음).
alter table public.visits drop constraint visits_source_values;
alter table public.visits
  add constraint visits_source_values check (source in ('rec', 'poll', 'map', 'detail'));

comment on column public.visits.source is
  'rec 추천, poll 투표, map 지도에서 길찾기, detail 상세에서 직접 후기(FB-06, T6.5)';

-- ─────────────────────────────────────────────────────────────
-- 2. reviews: 식후 평가와 후기 (FB-01~03, FB-06, FB-07, HIS-03)
-- ─────────────────────────────────────────────────────────────
-- 방문(visits) 한 건에 후기 한 건. 한 탭 👍/👎만 있어도 후기 행이다(선택 입력은 비어 있음).
-- "안 갔어요"는 후기가 아니라 visits.status = not_visited(FB-05)라서 이 테이블에 오지 않는다.
-- 후기를 쓰면 그 방문은 visited가 된다(트리거). 방문일로부터 14일이 지난 방문에는 새로 쓸 수 없다(나 탭 늦은 답).
-- 홈 띠의 48시간, 주말, 공휴일 판정은 TS(src/lib/time) 몫이다.
create table public.reviews (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null default auth.uid() references auth.users (id) on delete cascade,
  -- 방문을 지우면 그 후기도 지워진다
  visit_id      uuid not null references public.visits (id) on delete cascade,
  -- 방문의 place_id를 트리거가 복사한다(집계 색인용). 사용자가 넣지 않는다
  place_id      text not null,
  rating        text not null,
  -- 실제 1인 가격(원). 서버 범위 1천~10만 원 (feedback 안건 4)
  price_krw     integer,
  -- 태그 8종 slug: 혼밥 OK, 15분 컷, 웨이팅 적음, 룸 있음, 단체석, 가성비, 양 많음, 조용함 (FB-02)
  tags          text[] not null default '{}',
  -- 한 줄 후기 100자. 비공개면 작성자 본인만 읽는다(AC-FB-2)
  body          text,
  is_public     boolean not null default true,
  -- 신고 3건 자동 숨김(MOD-02) 또는 관리자 숨김. 숨긴 후기는 공개 목록과 집계에서 빠진다
  hidden_at     timestamptz,
  hidden_reason text,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),

  constraint reviews_place_id_format check (place_id ~ '^[0-9]{1,20}$'),
  constraint reviews_rating_values check (rating in ('up', 'down')),
  constraint reviews_price_range check (price_krw is null or price_krw between 1000 and 100000),
  constraint reviews_tags_values check (
    cardinality(tags) <= 8
    and tags <@ array[
      'solo_ok', 'quick_15', 'short_wait', 'private_room',
      'group_seats', 'good_value', 'big_portion', 'quiet'
    ]::text[]
  ),
  constraint reviews_body_len check (
    body is null or (char_length(body) between 1 and 100 and body = btrim(body))
  ),
  constraint reviews_hidden_pair check ((hidden_at is null) = (hidden_reason is null)),
  constraint reviews_hidden_reason_values check (hidden_reason is null or hidden_reason in ('reports', 'admin')),
  constraint reviews_one_per_visit unique (visit_id)
);

comment on table public.reviews is
  '식후 평가와 후기. 본인만 직접 읽는다. 다른 사람은 place_reviews(공개 글), place_stats(익명 집계)로만 (FB-01~07, AC-FB-2)';
comment on column public.reviews.tags is
  'solo_ok 혼밥 OK, quick_15 15분 컷, short_wait 웨이팅 적음, private_room 룸 있음, group_seats 단체석, good_value 가성비, big_portion 양 많음, quiet 조용함';
comment on column public.reviews.body is
  '한 줄 후기(100자). is_public = false면 작성자 외 어떤 응답에도 나오지 않는다(AC-FB-2)';

create index reviews_place_recent_idx on public.reviews (place_id, created_at desc);
create index reviews_user_recent_idx on public.reviews (user_id, created_at desc);

-- 삽입: 내 방문인지, 14일 안인지 확인하고 place_id를 채운다. 하루 20건 한도.
-- 보안 함수(소유자 권한)라 RLS 밖에서 visits를 읽으므로 소유자 일치를 직접 확인한다.
create or replace function private.reviews_before_insert()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_owner      uuid;
  v_place_id   text;
  v_visited_on date;
begin
  select v.user_id, v.place_id, v.visited_on
    into v_owner, v_place_id, v_visited_on
    from public.visits as v
   where v.id = new.visit_id;

  if v_owner is null or v_owner is distinct from new.user_id then
    raise exception 'reviews_visit_not_found'
      using errcode = 'check_violation',
            hint = '내 방문 기록에만 후기를 남길 수 있습니다';
  end if;
  -- 늦은 답은 방문일 포함 14일 뒤까지 (g6-comparison-me 안건 3, 사용자 결정 2026-10-31)
  if v_visited_on < private.kst_today() - 14 then
    raise exception 'reviews_visit_too_old'
      using errcode = 'check_violation',
            hint = '14일이 지난 방문에는 후기를 남길 수 없습니다';
  end if;

  new.place_id := v_place_id;
  new.tags := array(select distinct t from unnest(new.tags) as t order by t);
  new.hidden_at := null;
  new.hidden_reason := null;
  new.created_at := now();
  new.updated_at := now();

  perform private.consume_daily_quota(new.user_id, 'reviews');
  return new;
end;
$$;

create trigger reviews_before_insert
  before insert on public.reviews
  for each row execute function private.reviews_before_insert();

-- 후기를 남기면 방문 상태를 visited로 (안 갔어요로 답했던 방문도 후기를 쓰면 다녀온 것으로 본다)
create or replace function private.reviews_after_insert()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  update public.visits
     set status = 'visited'
   where id = new.visit_id
     and user_id = new.user_id
     and status <> 'visited';
  return null;
end;
$$;

create trigger reviews_after_insert
  after insert on public.reviews
  for each row execute function private.reviews_after_insert();

-- 수정: 태그 정리, updated_at. 숨김, 방문, 장소는 열 권한이 없어 바꿀 수 없다(FB-07은 평가, 가격, 태그, 글, 공개 여부만)
create or replace function private.reviews_before_update()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.tags is distinct from old.tags then
    new.tags := array(select distinct t from unnest(new.tags) as t order by t);
  end if;
  new.updated_at := now();
  return new;
end;
$$;

create trigger reviews_before_update
  before update on public.reviews
  for each row execute function private.reviews_before_update();

alter table public.reviews enable row level security;

create policy "reviews: 본인 읽기"
  on public.reviews for select to authenticated
  using ((select auth.uid()) = user_id);

create policy "reviews: 본인 추가"
  on public.reviews for insert to authenticated
  with check ((select auth.uid()) = user_id);

create policy "reviews: 본인 수정"
  on public.reviews for update to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

create policy "reviews: 본인 삭제"
  on public.reviews for delete to authenticated
  using ((select auth.uid()) = user_id);

revoke all on table public.reviews from public, anon, authenticated;
grant select, delete on table public.reviews to authenticated;
grant insert (user_id, visit_id, rating, price_krw, tags, body, is_public) on table public.reviews to authenticated;
grant update (rating, price_krw, tags, body, is_public) on table public.reviews to authenticated;
grant all on table public.reviews to service_role;

-- ─────────────────────────────────────────────────────────────
-- 3. place_deals: 할인, 이벤트 제보 (DEAL-01~04)
-- ─────────────────────────────────────────────────────────────
-- 등록은 register_deal 함수로만(중복 병합 판정과 교체가 남의 행을 숨겨야 해서). 테이블 직접 삽입 권한 없음.
-- 다른 사람은 place_deals_list(목록), place_stats(개수)로만 읽는다. 작성자 user_id는 돌려주지 않는다.
-- 표시만 하고 추천 점수에는 쓰지 않는다(제품 원칙 6, AC-DEAL-2).
create table public.place_deals (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null references auth.users (id) on delete cascade,
  place_id      text not null,
  place_url     text,
  -- user 사용자 제보(MVP), owner 사장님 등록(2단계), sponsor 제휴(수익화 3단계, 지금은 쓰지 않음)
  source        text not null default 'user',
  type          text not null,
  content       text not null,
  -- 적용 요일 비트: 월 1, 화 2, 수 4, 목 8, 금 16, 토 32, 일 64. 0이면 언제든 (안건 6)
  days          smallint not null default 0,
  -- 적용 시간대: lunch 11~15시, afternoon 15~17시, dinner 17시~. 빈 배열이면 언제든
  slots         text[] not null default '{}',
  -- 시작일 = 제보한 KST 날짜, 종료일 기본 +7일, 최대 +30일 (안건 7). 아직 해요는 종료일을 늘리지 않는다(안건 4)
  starts_on     date not null,
  ends_on       date not null,
  status        text not null default 'active',
  hidden_reason text,
  hidden_at     timestamptz,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),

  constraint place_deals_place_id_format check (place_id ~ '^[0-9]{1,20}$'),
  constraint place_deals_place_url_format check (
    place_url is null
    or place_url in ('https://place.map.kakao.com/' || place_id, 'http://place.map.kakao.com/' || place_id)
  ),
  constraint place_deals_source_values check (source in ('user', 'owner', 'sponsor')),
  constraint place_deals_type_values check (
    type in ('lunch_special', 'discount', 'event', 'happy_hour', 'other')
  ),
  constraint place_deals_content_len check (
    char_length(content) between 1 and 60 and content = btrim(content)
  ),
  constraint place_deals_days_range check (days between 0 and 127),
  constraint place_deals_slots_values check (
    cardinality(slots) <= 3 and slots <@ array['lunch', 'afternoon', 'dinner']::text[]
  ),
  constraint place_deals_ends_on_range check (ends_on between starts_on and starts_on + 30),
  constraint place_deals_status_values check (status in ('active', 'hidden', 'expired')),
  -- 숨김 사유: superseded 같은 유형 새 제보로 교체(안건 3), ended_checks 끝났어요 3명(AC-DEAL-3),
  -- reports 신고 3건, admin 관리자
  constraint place_deals_hidden_reason check (
    (status = 'hidden') = (hidden_reason is not null)
    and (hidden_reason is null or hidden_reason in ('superseded', 'ended_checks', 'reports', 'admin'))
  )
);

comment on table public.place_deals is
  '할인, 이벤트 제보. 작성자만 직접 읽는다. 공개 읽기는 place_deals_list, place_stats. 점수 반영 0 (DEAL-01~04, AC-DEAL-2)';
comment on column public.place_deals.days is
  '요일 비트(월 1 ... 일 64), 0이면 언제든';
comment on column public.place_deals.ends_on is
  'KST 종료일(그날까지 유효). 지나면 읽기 함수가 바로 거르고, T6.26 pg_cron이 status를 expired로 바꾼다 (AC-DEAL-1)';

-- 중복 병합 키: 같은 식당, 같은 출처, 같은 유형의 유효한 제보는 하나 (안건 2)
create unique index place_deals_one_active_per_key
  on public.place_deals (place_id, source, type)
  where status = 'active';
create index place_deals_place_active_idx on public.place_deals (place_id) where status = 'active';
create index place_deals_user_recent_idx on public.place_deals (user_id, created_at desc);

create trigger place_deals_set_updated_at
  before update on public.place_deals
  for each row execute function private.set_updated_at();

alter table public.place_deals enable row level security;

create policy "place_deals: 작성자 읽기"
  on public.place_deals for select to authenticated
  using ((select auth.uid()) = user_id);
-- insert, update, delete 정책 없음: 등록은 register_deal, 숨김은 트리거와 관리자(service role)만

revoke all on table public.place_deals from public, anon, authenticated;
grant select on table public.place_deals to authenticated;
grant all on table public.place_deals to service_role;

-- ─────────────────────────────────────────────────────────────
-- 4. place_deal_checks: 아직 해요 / 끝났어요 (DEAL-03, 안건 5)
-- ─────────────────────────────────────────────────────────────
-- 1인 1응답. 바꾸기는 수정, 되돌리기는 삭제. 끝났어요가 서로 다른 3명이 되면 그 자리에서 숨긴다(AC-DEAL-3).
-- 아직 해요는 끝났어요 수를 깎지 않는다. 다른 사람의 응답은 place_deals_list의 개수로만 보인다.
create table public.place_deal_checks (
  deal_id    uuid not null references public.place_deals (id) on delete cascade,
  user_id    uuid not null default auth.uid() references auth.users (id) on delete cascade,
  answer     text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  primary key (deal_id, user_id),
  constraint place_deal_checks_answer_values check (answer in ('still', 'ended'))
);

comment on table public.place_deal_checks is
  '할인 최신성 확인. 1인 1응답, 되돌리기는 삭제. 본인만 직접 읽는다 (DEAL-03, AC-DEAL-3)';

create index place_deal_checks_user_idx on public.place_deal_checks (user_id);

-- 응답은 보이는 할인(유효, 종료일 안 지남)에만. 보안 함수라서 남의 할인 행을 읽을 수 있다
create or replace function private.place_deal_checks_before_write()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not exists (
    select 1 from public.place_deals as d
     where d.id = new.deal_id
       and d.status = 'active'
       and d.starts_on <= private.kst_today()
       and d.ends_on >= private.kst_today()
  ) then
    raise exception 'deal_not_open'
      using errcode = 'check_violation',
            hint = '이미 내려간 할인 정보입니다';
  end if;
  if tg_op = 'UPDATE' then
    new.updated_at := now();
  else
    new.created_at := now();
    new.updated_at := now();
  end if;
  return new;
end;
$$;

create trigger place_deal_checks_before_write
  before insert or update on public.place_deal_checks
  for each row execute function private.place_deal_checks_before_write();

-- 끝났어요 3명이면 즉시 숨김 (AC-DEAL-3)
create or replace function private.place_deal_checks_after_write()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.answer = 'ended' and (
    select count(*) from public.place_deal_checks as c
     where c.deal_id = new.deal_id and c.answer = 'ended'
  ) >= 3 then
    update public.place_deals
       set status = 'hidden', hidden_reason = 'ended_checks', hidden_at = now()
     where id = new.deal_id and status = 'active';
  end if;
  return null;
end;
$$;

create trigger place_deal_checks_after_write
  after insert or update of answer on public.place_deal_checks
  for each row execute function private.place_deal_checks_after_write();

alter table public.place_deal_checks enable row level security;

create policy "place_deal_checks: 본인 읽기"
  on public.place_deal_checks for select to authenticated
  using ((select auth.uid()) = user_id);

create policy "place_deal_checks: 본인 추가"
  on public.place_deal_checks for insert to authenticated
  with check ((select auth.uid()) = user_id);

create policy "place_deal_checks: 본인 수정"
  on public.place_deal_checks for update to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

create policy "place_deal_checks: 본인 삭제"
  on public.place_deal_checks for delete to authenticated
  using ((select auth.uid()) = user_id);

revoke all on table public.place_deal_checks from public, anon, authenticated;
grant select, delete on table public.place_deal_checks to authenticated;
grant insert (deal_id, user_id, answer) on table public.place_deal_checks to authenticated;
grant update (answer) on table public.place_deal_checks to authenticated;
grant all on table public.place_deal_checks to service_role;

-- ─────────────────────────────────────────────────────────────
-- 5. review_reports: 후기 신고와 할인 신고 (MOD-01, MOD-02, DEAL-04, 안건 10)
-- ─────────────────────────────────────────────────────────────
-- 대상은 review 또는 deal. 같은 대상은 한 사람이 한 번. 서로 다른 3명이면 자동 숨김(관리자 검토 대기).
-- 사유: 후기 spam 광고/스팸, abuse 욕설/비방, privacy 개인정보, false 허위, other 기타
--       할인 ad_false 광고성/허위, abuse, privacy, other
-- 신고자는 자기 신고만 읽는다(신고한 후기를 나에게 가리기, 안건 11). 취소 없음.
create table public.review_reports (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null default auth.uid() references auth.users (id) on delete cascade,
  target_type text not null,
  review_id   uuid references public.reviews (id) on delete cascade,
  deal_id     uuid references public.place_deals (id) on delete cascade,
  reason      text not null,
  -- 기타 사유 자세히(선택, 100자). 관리자만 본다. 금칙어는 TS 서버에서
  note        text,
  created_at  timestamptz not null default now(),

  constraint review_reports_target check (
    (target_type = 'review' and review_id is not null and deal_id is null)
    or (target_type = 'deal' and deal_id is not null and review_id is null)
  ),
  constraint review_reports_reason_values check (
    (target_type = 'review' and reason in ('spam', 'abuse', 'privacy', 'false', 'other'))
    or (target_type = 'deal' and reason in ('ad_false', 'abuse', 'privacy', 'other'))
  ),
  constraint review_reports_note check (
    note is null or (reason = 'other' and char_length(note) between 1 and 100 and note = btrim(note))
  ),
  -- 같은 대상 1인 1회 (review_id, deal_id 중 null인 쪽은 서로 겹치지 않는다)
  constraint review_reports_one_per_review unique (user_id, review_id),
  constraint review_reports_one_per_deal unique (user_id, deal_id)
);

comment on table public.review_reports is
  '후기, 할인 신고. 신고자 본인만 읽는다. 3명이면 자동 숨김 (MOD-01, MOD-02, DEAL-04)';

create index review_reports_review_idx on public.review_reports (review_id) where review_id is not null;
create index review_reports_deal_idx on public.review_reports (deal_id) where deal_id is not null;

-- 신고 대상 확인: 공개이고 보이는 후기, 또는 보이는 할인만. 자기 것은 신고할 수 없다. 하루 30건(정보 제보와 합산).
-- 없는 대상과 비공개 후기는 같은 오류를 돌려 비공개 후기의 존재를 알리지 않는다.
create or replace function private.review_reports_before_insert()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_owner uuid;
begin
  if new.target_type = 'review' then
    select r.user_id into v_owner
      from public.reviews as r
     where r.id = new.review_id
       and r.is_public
       and r.hidden_at is null;
  else
    select d.user_id into v_owner
      from public.place_deals as d
     where d.id = new.deal_id
       and d.status = 'active'
       and d.starts_on <= private.kst_today()
       and d.ends_on >= private.kst_today();
  end if;

  if v_owner is null then
    raise exception 'report_target_unavailable'
      using errcode = 'check_violation',
            hint = '신고할 수 없는 대상입니다';
  end if;
  if v_owner = new.user_id then
    raise exception 'report_own_target'
      using errcode = 'check_violation',
            hint = '내가 쓴 글은 신고할 수 없습니다';
  end if;

  new.created_at := now();
  perform private.consume_daily_quota(new.user_id, 'reports');
  return new;
end;
$$;

create trigger review_reports_before_insert
  before insert on public.review_reports
  for each row execute function private.review_reports_before_insert();

-- 서로 다른 3명이면 자동 숨김 (MOD-02). 1인 1회라 행 수 = 신고자 수
create or replace function private.review_reports_after_insert()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.target_type = 'review' then
    if (select count(*) from public.review_reports where review_id = new.review_id) >= 3 then
      update public.reviews
         set hidden_at = now(), hidden_reason = 'reports'
       where id = new.review_id and hidden_at is null;
    end if;
  else
    if (select count(*) from public.review_reports where deal_id = new.deal_id) >= 3 then
      update public.place_deals
         set status = 'hidden', hidden_reason = 'reports', hidden_at = now()
       where id = new.deal_id and status = 'active';
    end if;
  end if;
  return null;
end;
$$;

create trigger review_reports_after_insert
  after insert on public.review_reports
  for each row execute function private.review_reports_after_insert();

alter table public.review_reports enable row level security;

create policy "review_reports: 본인 읽기"
  on public.review_reports for select to authenticated
  using ((select auth.uid()) = user_id);

create policy "review_reports: 본인 추가"
  on public.review_reports for insert to authenticated
  with check ((select auth.uid()) = user_id);
-- update, delete 없음: 신고는 취소하지 않는다. 탈퇴 시 cascade로 지워진다

revoke all on table public.review_reports from public, anon, authenticated;
grant select on table public.review_reports to authenticated;
grant insert (user_id, target_type, review_id, deal_id, reason, note) on table public.review_reports to authenticated;
grant all on table public.review_reports to service_role;

-- ─────────────────────────────────────────────────────────────
-- 6. place_reports: 문 닫았어요 / 가격이 달라요 / 정보가 틀려요 (PLACE-05, MOD-03, 안건 9)
-- ─────────────────────────────────────────────────────────────
-- 자유 글 없음: 칩과 가격 숫자만 detail(jsonb)에. 같은 식당 같은 종류는 사용자당 KST 하루 1회.
-- 가격 숫자는 관리자 확인용이고 가격 집계(place_stats)에 넣지 않는다(가격 집계는 식후 후기 하나로).
-- 폐업은 서로 다른 3명이면 추천 제외(place_stats.closed). "오늘만 쉬어요"는 폐업 수에 세지 않는다.
create table public.place_reports (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null default auth.uid() references auth.users (id) on delete cascade,
  place_id   text not null,
  place_url  text,
  kind       text not null,
  -- closed: {"closed": "gone"|"moved"|"today"}, price: {"price_krw": 1000~100000}, info: {"fields": ["name","location","phone","category"]}
  -- 모두 선택(빈 객체 허용)
  detail     jsonb not null default '{}'::jsonb,
  -- 제보한 KST 날짜. 서버가 정한다(하루 1회 판정)
  kst_day    date not null default '1970-01-01',
  created_at timestamptz not null default now(),

  constraint place_reports_place_id_format check (place_id ~ '^[0-9]{1,20}$'),
  constraint place_reports_place_url_format check (
    place_url is null
    or place_url in ('https://place.map.kakao.com/' || place_id, 'http://place.map.kakao.com/' || place_id)
  ),
  constraint place_reports_kind_values check (kind in ('closed', 'price', 'info')),
  -- CASE로 감싸 형 변환 전에 형식을 먼저 본다(AND는 평가 순서가 보장되지 않는다)
  constraint place_reports_detail_shape check (
    jsonb_typeof(detail) = 'object'
    and case kind
      when 'closed' then
        (detail - 'closed') = '{}'::jsonb
        and case when detail ? 'closed'
              then coalesce(detail ->> 'closed' in ('gone', 'moved', 'today'), false)
              else true end
      when 'price' then
        (detail - 'price_krw') = '{}'::jsonb
        and case when detail ? 'price_krw'
              then case when jsonb_typeof(detail -> 'price_krw') = 'number'
                     then (detail ->> 'price_krw')::numeric between 1000 and 100000
                          and (detail ->> 'price_krw')::numeric % 1 = 0
                     else false end
              else true end
      when 'info' then
        (detail - 'fields') = '{}'::jsonb
        and case when detail ? 'fields'
              then case when jsonb_typeof(detail -> 'fields') = 'array'
                     then jsonb_array_length(detail -> 'fields') between 1 and 4
                          and (detail -> 'fields') <@ '["name", "location", "phone", "category"]'::jsonb
                     else false end
              else true end
      else false
    end
  ),
  constraint place_reports_once_per_day unique (user_id, place_id, kind, kst_day)
);

comment on table public.place_reports is
  '식당 정보 제보(폐업, 가격, 정보 오류). 칩과 숫자만, 자유 글 없음. 본인만 직접 읽는다. 폐업 3명은 place_stats.closed (PLACE-05, MOD-03)';

create index place_reports_place_kind_idx on public.place_reports (place_id, kind);

create or replace function private.place_reports_before_insert()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  new.kst_day := private.kst_today();
  new.created_at := now();
  perform private.consume_daily_quota(new.user_id, 'reports');
  return new;
end;
$$;

create trigger place_reports_before_insert
  before insert on public.place_reports
  for each row execute function private.place_reports_before_insert();

alter table public.place_reports enable row level security;

create policy "place_reports: 본인 읽기"
  on public.place_reports for select to authenticated
  using ((select auth.uid()) = user_id);

create policy "place_reports: 본인 추가"
  on public.place_reports for insert to authenticated
  with check ((select auth.uid()) = user_id);
-- update, delete 없음: 제보는 고치거나 취소하지 않는다. 처리는 관리자(MOD-06)

revoke all on table public.place_reports from public, anon, authenticated;
grant select on table public.place_reports to authenticated;
grant insert (user_id, place_id, place_url, kind, detail) on table public.place_reports to authenticated;
grant all on table public.place_reports to service_role;

-- ─────────────────────────────────────────────────────────────
-- 7. wait_reports: 웨이팅 한 탭 제보 (PLACE-07, PLACE-08, 안건 8)
-- ─────────────────────────────────────────────────────────────
-- 등록은 report_wait 함수로만(같은 사용자, 같은 식당 30분 1회 판정과 retry_at 응답).
-- 되돌리기는 2분 안에만 행 삭제(제한도 함께 풀린다). 다른 사람은 place_stats의 최신 1건 요약(수준, 몇 분 전)만 본다.
-- 30분 지난 행은 읽기에서 빠지고, 하루 지난 행은 T6.26 pg_cron이 지운다.
create table public.wait_reports (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references auth.users (id) on delete cascade,
  place_id   text not null,
  -- now 바로 입장, short 조금 기다려요, long 줄 길어요
  level      text not null,
  created_at timestamptz not null default now(),

  constraint wait_reports_place_id_format check (place_id ~ '^[0-9]{1,20}$'),
  constraint wait_reports_level_values check (level in ('now', 'short', 'long'))
);

comment on table public.wait_reports is
  '웨이팅 제보. 30분 유효, 같은 사용자 같은 식당 30분 1회, 2분 안 되돌리기. 본인만 직접 읽는다 (PLACE-07)';
comment on column public.wait_reports.level is
  'now 바로 입장, short 조금 기다려요, long 줄 길어요 (TS WaitLevel walkIn, short, long)';

create index wait_reports_place_recent_idx on public.wait_reports (place_id, created_at desc);
create index wait_reports_user_place_recent_idx on public.wait_reports (user_id, place_id, created_at desc);

alter table public.wait_reports enable row level security;

create policy "wait_reports: 본인 읽기"
  on public.wait_reports for select to authenticated
  using ((select auth.uid()) = user_id);

-- 되돌리기: 2분 안의 내 제보만 (안건 8)
create policy "wait_reports: 본인 2분 안 삭제"
  on public.wait_reports for delete to authenticated
  using ((select auth.uid()) = user_id and created_at > now() - interval '2 minutes');
-- insert 정책 없음: report_wait(보안 함수)만 넣는다

revoke all on table public.wait_reports from public, anon, authenticated;
grant select, delete on table public.wait_reports to authenticated;
grant all on table public.wait_reports to service_role;

-- ─────────────────────────────────────────────────────────────
-- 8. 쓰기 함수: register_deal, report_wait
-- ─────────────────────────────────────────────────────────────

-- 할인 제보 등록 (DEAL-01, DEAL-04, 안건 2, 3, 7)
-- - 같은 식당, 같은 유형의 유효한 사용자 제보가 있으면 새 행 없이 merged_with에 그 id를 돌려준다(한도도 쓰지 않는다).
--   화면은 중복 단계를 띄우고, "아직 해요로 확인"은 place_deal_checks에 still을 넣는다.
-- - p_replace = true("다른 내용이라 새로 남기기")면 기존 제보를 hidden(superseded)으로 바꾸고 새로 넣는다.
--   기존 아직 해요 수는 넘기지 않는다.
-- - 종료일이 지났는데 아직 active인 행(pg_cron 전)은 먼저 expired로 바꿔 유일 키를 비운다.
-- - 하루 10건(DEAL-04). 종료일 기본 오늘 + 7일, 최대 + 30일.
create or replace function public.register_deal(
  p_place_id  text,
  p_type      text,
  p_content   text,
  p_ends_on   date default null,
  p_days      smallint default 0,
  p_slots     text[] default '{}',
  p_place_url text default null,
  p_replace   boolean default false
)
returns table (deal_id uuid, merged_with uuid, ends_on date)
language plpgsql
volatile
security definer
set search_path = ''
as $$
#variable_conflict use_column
declare
  v_uid      uuid := auth.uid();
  v_today    date := private.kst_today();
  v_existing uuid;
  v_new      uuid;
  v_ends_on  date;
begin
  if v_uid is null then
    raise exception 'not_authenticated' using errcode = '42501';
  end if;

  -- 같은 키의 동시 등록이 둘 다 "없음"을 보고 유일 키 오류가 나는 경쟁을 막는다
  perform pg_advisory_xact_lock(hashtextextended('deal:' || coalesce(p_place_id, '') || ':' || coalesce(p_type, ''), 0));

  update public.place_deals as d
     set status = 'expired'
   where d.place_id = p_place_id
     and d.source = 'user'
     and d.type = p_type
     and d.status = 'active'
     and d.ends_on < v_today;

  select d.id into v_existing
    from public.place_deals as d
   where d.place_id = p_place_id
     and d.source = 'user'
     and d.type = p_type
     and d.status = 'active';

  if v_existing is not null and not coalesce(p_replace, false) then
    return query select null::uuid, v_existing, null::date;
    return;
  end if;

  perform private.consume_daily_quota(v_uid, 'deals');

  if v_existing is not null then
    update public.place_deals as d
       set status = 'hidden', hidden_reason = 'superseded', hidden_at = now()
     where d.id = v_existing;
  end if;

  v_ends_on := coalesce(p_ends_on, v_today + 7);

  insert into public.place_deals (
    user_id, place_id, place_url, source, type, content, days, slots, starts_on, ends_on
  ) values (
    v_uid, p_place_id, p_place_url, 'user', p_type, p_content,
    coalesce(p_days, 0),
    array(select distinct s from unnest(coalesce(p_slots, '{}'::text[])) as s order by s),
    v_today, v_ends_on
  )
  returning id into v_new;

  return query select v_new, null::uuid, v_ends_on;
end;
$$;

comment on function public.register_deal is
  '할인 제보 등록. 같은 키가 있으면 merged_with, p_replace면 기존을 superseded로 숨기고 새로 등록 (DEAL-01, DEAL-04)';

-- 웨이팅 제보 (PLACE-07, 안건 8). 30분 안에 같은 식당에 낸 제보가 있으면 넣지 않고 accepted = false와 retry_at을 돌려준다
create or replace function public.report_wait(p_place_id text, p_level text)
returns table (accepted boolean, report_id uuid, reported_at timestamptz, retry_at timestamptz)
language plpgsql
volatile
security definer
set search_path = ''
as $$
#variable_conflict use_column
declare
  v_uid  uuid := auth.uid();
  v_last timestamptz;
  v_id   uuid;
  v_at   timestamptz;
begin
  if v_uid is null then
    raise exception 'not_authenticated' using errcode = '42501';
  end if;

  perform pg_advisory_xact_lock(hashtextextended('wait:' || v_uid::text || ':' || coalesce(p_place_id, ''), 0));

  select max(w.created_at) into v_last
    from public.wait_reports as w
   where w.user_id = v_uid
     and w.place_id = p_place_id
     and w.created_at > now() - interval '30 minutes';

  if v_last is not null then
    return query select false, null::uuid, v_last, v_last + interval '30 minutes';
    return;
  end if;

  insert into public.wait_reports (user_id, place_id, level)
  values (v_uid, p_place_id, p_level)
  returning id, created_at into v_id, v_at;

  return query select true, v_id, v_at, v_at + interval '30 minutes';
end;
$$;

comment on function public.report_wait is
  '웨이팅 제보. 같은 사용자 같은 식당 30분 1회, 막히면 accepted false + retry_at (PLACE-07)';

-- ─────────────────────────────────────────────────────────────
-- 9. 읽기 함수 (T6.6): place_stats, place_reviews, place_deals_list, my_daily_limits
-- ─────────────────────────────────────────────────────────────

-- 식당별 익명 집계 (PLACE-02, PLACE-03, PLACE-07, MOD-03, DEAL-02, 추천 P/C/B/W/폐업 필터)
-- - 후기는 숨김을 빼고, 사용자마다 그 식당의 최신 값 하나만 센다([제안] 한 사람이 여러 번 가도 한 표).
--   평가는 최신 후기, 가격은 가격을 적은 최신 후기, 태그는 태그를 고른 최신 후기에서.
-- - 비공개 후기도 가격, 평가, 태그는 익명으로 들어간다. 글(body)과 작성자는 어디에도 나오지 않는다(AC-FB-2).
-- - price_points: 가격 제보 값만(익명, 오름차순). 상세 점 분포와 사분위/최소~최대(D-10)는 TS detail-model이 계산한다.
-- - closed_reports: 문 닫았어요를 낸 서로 다른 사람 수("오늘만 쉬어요" 제외). 3 이상이면 closed(추천 제외, MOD-03).
-- - wait_*: 30분 안의 최신 웨이팅 제보 1건 요약. 제보자 정보 없음.
-- - deal_count: 지금 보이는 할인 수(유효, 시작일~종료일 안). 점수에 쓰지 않는다(AC-DEAL-2).
-- 입력은 한 번에 60곳까지(추천 후보 최대 45곳 + 여유). 요청한 모든 id에 한 행씩(없으면 0과 null) 돌려준다.
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
  closed_counts as (
    select pr.place_id as pid, count(distinct pr.user_id)::int as n
      from public.place_reports as pr
     where pr.place_id in (select pid from ids)
       and pr.kind = 'closed'
       and coalesce(pr.detail ->> 'closed', '') <> 'today'
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
         coalesce(closed_counts.n, 0) >= 3,
         waits.level,
         waits.created_at,
         case when waits.created_at is null then null
              else greatest(0, floor(extract(epoch from (now() - waits.created_at)) / 60))::int end,
         coalesce(deals.n, 0)
    from ids
    left join prices        on prices.pid = ids.pid
    left join thumbs        on thumbs.pid = ids.pid
    left join tags_top      on tags_top.pid = ids.pid
    left join closed_counts on closed_counts.pid = ids.pid
    left join waits         on waits.pid = ids.pid
    left join deals         on deals.pid = ids.pid;
end;
$$;

comment on function public.place_stats is
  '식당별 익명 집계: 가격 중앙값과 값 목록, 👍/👎, 태그 상위 5, 폐업 제보 수, 30분 안 웨이팅 1건, 할인 수. 글과 작성자 없음 (T6.6, AC-FB-2)';

-- 공개 후기 목록 (PLACE-03, PRD 11.2). 최신순, 한 번에 20건까지.
-- - is_public이고 숨기지 않았고 글이 있는 후기만. 비공개 후기는 어떤 경우에도 나오지 않는다(AC-FB-2).
-- - 작성자는 닉네임과 아바타만(정지 사용자 후기는 빼고), 방문은 월만(visit_month). user_id와 정확한 시각은 주지 않는다.
-- - is_mine: 내 후기(상세는 내 후기를 따로 보여 준다), reported_by_me: 내가 신고한 후기(나에게 가리기, 안건 11).
-- - 닉네임이 나가므로 public_profiles와 같이 로그인 사용자만 부를 수 있다.
create or replace function public.place_reviews(
  p_place_id text,
  p_limit    int default 10,
  p_offset   int default 0
)
returns table (
  id             uuid,
  nickname       text,
  avatar_url     text,
  visit_month    smallint,
  rating         text,
  price_krw      int,
  tags           text[],
  body           text,
  is_mine        boolean,
  reported_by_me boolean
)
language sql
stable
security definer
set search_path = ''
as $$
  select r.id,
         p.nickname,
         p.avatar_url,
         extract(month from v.visited_on)::smallint,
         r.rating,
         r.price_krw,
         r.tags,
         r.body,
         coalesce(r.user_id = auth.uid(), false),
         exists (
           select 1 from public.review_reports as rr
            where rr.review_id = r.id and rr.user_id = auth.uid()
         )
    from public.reviews as r
    join public.visits as v on v.id = r.visit_id
    join public.profiles as p on p.user_id = r.user_id and p.status = 'active'
   where r.place_id = p_place_id
     and r.is_public
     and r.hidden_at is null
     and r.body is not null
   order by r.created_at desc, r.id
   limit least(greatest(coalesce(p_limit, 10), 1), 20)
  offset least(greatest(coalesce(p_offset, 0), 0), 200);
$$;

comment on function public.place_reviews is
  '공개 후기 최신순(글 있는 것만). 닉네임, 아바타, 방문 월만. 비공개 후기는 나오지 않는다 (PLACE-03, PRD 11.2, AC-FB-2)';

-- 식당의 지금 보이는 할인 목록 (DEAL-02, DEAL-03). 작성자 id 없이 출처, 확인 수, 내 응답만
create or replace function public.place_deals_list(p_place_id text)
returns table (
  id          uuid,
  source      text,
  type        text,
  content     text,
  days        smallint,
  slots       text[],
  starts_on   date,
  ends_on     date,
  created_at  timestamptz,
  still_count int,
  ended_count int,
  my_answer   text,
  is_mine     boolean
)
language sql
stable
security definer
set search_path = ''
as $$
  select d.id, d.source, d.type, d.content, d.days, d.slots, d.starts_on, d.ends_on, d.created_at,
         (select count(*)::int from public.place_deal_checks as c where c.deal_id = d.id and c.answer = 'still'),
         (select count(*)::int from public.place_deal_checks as c where c.deal_id = d.id and c.answer = 'ended'),
         (select c.answer from public.place_deal_checks as c where c.deal_id = d.id and c.user_id = auth.uid()),
         coalesce(d.user_id = auth.uid(), false)
    from public.place_deals as d
   where d.place_id = p_place_id
     and d.status = 'active'
     and d.starts_on <= private.kst_today()
     and d.ends_on >= private.kst_today()
   -- 사장님 등록을 사용자 제보보다 위에(DEAL-07), 그다음 최신순
   order by case d.source when 'owner' then 0 when 'user' then 1 else 2 end, d.created_at desc;
$$;

comment on function public.place_deals_list is
  '식당의 유효한 할인 목록. 종료일 지난 것은 pg_cron 전에도 빠진다(AC-DEAL-1). 작성자 id 없음 (DEAL-02)';

-- 오늘 남은 한도 (안건 12: 할인 등록은 열 때 미리 알린다)
create or replace function public.my_daily_limits()
returns table (bucket text, used int, limit_count int, remaining int)
language sql
stable
security definer
set search_path = ''
as $$
  select b.bucket,
         coalesce(u.used, 0),
         private.daily_quota_max(b.bucket),
         greatest(0, private.daily_quota_max(b.bucket) - coalesce(u.used, 0))
    from unnest(array['reviews', 'reports', 'deals']) as b(bucket)
    left join private.daily_usage as u
      on u.user_id = auth.uid()
     and u.kst_day = private.kst_today()
     and u.bucket = b.bucket
   where auth.uid() is not null;
$$;

comment on function public.my_daily_limits is
  '내 오늘 한도: reviews 20, reports 30, deals 10 (MOD-05, DEAL-04)';

-- ─────────────────────────────────────────────────────────────
-- 10. 함수 권한
-- ─────────────────────────────────────────────────────────────
-- 집계와 할인 목록은 개인 정보가 없어 비로그인도 부른다(홈 비로그인 추천, 상세).
-- 공개 후기는 닉네임이 나가므로 로그인 사용자만(public_profiles와 같은 기준).
-- 쓰기 함수와 한도 조회는 로그인 사용자만.
revoke all on function public.place_stats(text[]) from public;
grant execute on function public.place_stats(text[]) to anon, authenticated, service_role;

revoke all on function public.place_deals_list(text) from public;
grant execute on function public.place_deals_list(text) to anon, authenticated, service_role;

revoke all on function public.place_reviews(text, int, int) from public, anon;
grant execute on function public.place_reviews(text, int, int) to authenticated, service_role;

revoke all on function public.register_deal(text, text, text, date, smallint, text[], text, boolean) from public, anon;
grant execute on function public.register_deal(text, text, text, date, smallint, text[], text, boolean)
  to authenticated, service_role;

revoke all on function public.report_wait(text, text) from public, anon;
grant execute on function public.report_wait(text, text) to authenticated, service_role;

revoke all on function public.my_daily_limits() from public, anon;
grant execute on function public.my_daily_limits() to authenticated, service_role;

-- private 함수는 직접 호출할 수 없게 한다(T4.4와 같은 관례)
revoke all on function private.kst_today() from public, anon, authenticated;
revoke all on function private.daily_quota_max(text) from public, anon, authenticated;
revoke all on function private.consume_daily_quota(uuid, text) from public, anon, authenticated;
revoke all on function private.reviews_before_insert() from public, anon, authenticated;
revoke all on function private.reviews_after_insert() from public, anon, authenticated;
revoke all on function private.reviews_before_update() from public, anon, authenticated;
revoke all on function private.place_deal_checks_before_write() from public, anon, authenticated;
revoke all on function private.place_deal_checks_after_write() from public, anon, authenticated;
revoke all on function private.review_reports_before_insert() from public, anon, authenticated;
revoke all on function private.review_reports_after_insert() from public, anon, authenticated;
revoke all on function private.place_reports_before_insert() from public, anon, authenticated;
