-- T10.15 식당 메모 (D-32, D-33). 상세 시트에서 쓰고 홈 카드 배지, 즐겨찾기 이름표, 카카오 장애 때 이름 대체에 쓴다.
-- 결정: design-decisions D-32(만들기), D-33(시안 B 이름표 시트와 안건). 설계 초안: docs/design/g10-comparison-memo.md 6절.
-- 앞 마이그레이션: 20261102210000_t10_3_poll_retention.sql
--   다시 쓰는 것: private.daily_usage, private.consume_daily_quota(T6.5), private.block_suspended_writer(T8.5),
--   private.reject_banned_text(T10.3b), public.account_residue(T6.27, auth.users 외래 키를 카탈로그에서 찾음).
--
-- 이 파일이 하는 일 (파괴적 변경 없음: 테이블과 함수를 더하고, 한도 버킷 목록을 넓히고, 한도 표 함수를 같은 모양으로 바꾼다)
-- 1. 하루 한도 버킷 'place_memos'(KST 하루 30회, 저장과 고침 합산, 지우기와 같은 글 다시 저장은 세지 않음, D-33).
--    check 제약 교체와 함수 교체뿐, 기존 행 영향 없음.
-- 2. public.place_memos: 본인만 읽고, 쓰고, 고치고, 지운다. 고칠 수 있는 열은 body 하나(열 단위 권한).
--    - 카카오 값은 place_id, place_url만(favorites와 같은 형식 검사). 장소명, 주소, 좌표, 카테고리 열 없음(CLAUDE.md 7장).
--    - body: 사용자가 빈 입력란에 직접 쓴 글만(D-32). 1~40자(코드 포인트), 앞뒤 공백과 제어 문자 없음.
--      서버 zod(normalizeMemo)와 같은 규칙. 카카오 장소명 미리 채우기는 앱에서 하지 않는다(DB가 구분할 수는 없음).
--    - 즐겨찾기와 독립(즐겨찾기 안 한 곳, 다시 안 갈 곳에도 씀). 즐겨찾기 해제해도 메모는 남는다.
--    - 추천 점수에 쓰지 않는다(src/lib/reco는 이 테이블을 읽지 않는다).
--    - 1인 300곳 상한(favorites, blocklist와 같은 수).
--    - 탈퇴: user_id → auth.users on delete cascade(PRD 11.4). account_residue가 자동으로 센다.
--    - anon 권한, 관리자 읽기 함수 없음(운영자도 보지 않는 글).
-- 3. 트리거(이름 알파벳 순으로 돈다)
--      block_suspended_writer          insert, update   정지 사용자 쓰기 차단(account_suspended, 42501). 지우기는 막지 않는다
--      place_memos_banned_text_guard   insert, update of body   금칙어, 연락처, 링크(banned_content, 23514, D-33 안건 3)
--      place_memos_before_write        insert, update of body   300곳 상한(insert), 하루 30회, updated_at
--    거절되면 한도 사용도 트랜잭션과 함께 되돌아간다(beta_feedback과 같은 관례).
-- 4. public.my_favorite_memos(): 카카오 장애 때 홈 "즐겨찾기에서 고르기"(D-33 안건 4). 메모가 있는 즐겨찾기만,
--    최근에 고친 메모 순으로 3곳까지. security invoker라 RLS가 그대로 걸린다(본인 행만). 카카오 오류 뒤에만 부른다(앱).
--
-- 홈 카드 메모 배지 읽기(D-33 안건 1)는 SQL을 바꾸지 않는다
-- - 홈 집계 요청(src/features/rec/stats-source.ts 서버 액션, RPC public.place_stats)과 같은 서버 액션 안에서
--   place_memos를 place_id in (후보들)로 함께 읽는다(브라우저 왕복은 그대로 1번, 서버에서 Supabase로 두 요청을 나란히).
-- - public.place_stats를 바꾸지 않는 이유: 비로그인도 부르는 익명 집계 함수이고(지도, 회식, 투표방도 씀), 반환 열을 더하려면
--   drop function 후 다시 만들어야 한다(반환형 변경). 개인 메모를 익명 집계 응답에 섞지 않는다.
-- - 인덱스: 기본 키 (user_id, place_id)가 "본인 + place_id 목록" 조회를 그대로 받는다.
--
-- 쓰기 경로 메모(앱 구현 때)
-- - PostgREST upsert(on conflict merge)는 보낸 모든 열을 update하므로 열 단위 권한(update body만)에 막힌다.
--   서버 액션은 update(본인 행, place_id 일치) → 0행이면 insert, insert가 23505(동시 저장)면 update를 한 번 더 한다.
-- - 빈 글 저장 = delete.
--
-- 바꾸지 않는 것
-- - public.my_daily_limits(): 메모 칸은 열 때 남은 수를 미리 보이지 않고(저장할 때 한도 응답만), 이 함수 결과를 쓰는
--   할인 시트가 모르는 버킷을 받지 않게 목록을 그대로 둔다(T9.4와 같은 이유).
-- - favorites: 손대지 않는다(메모는 별도 테이블, g10-comparison-memo.md 6.1 표).
--
-- 플래그 userPlaceMemo를 끄면 앱이 메모를 숨기고 쓰기를 막는다(D-33 기본안: 숨기기만, 자동 일괄 삭제 없음).
-- 데이터를 지워야 하면 사용자 승인 뒤 새 마이그레이션으로 `delete from public.place_memos;`
--
-- 되돌리기 (새 마이그레이션으로):
--   drop function if exists public.my_favorite_memos();
--   drop table if exists public.place_memos;   -- 트리거와 정책도 함께 지워진다
--   drop function if exists private.place_memos_before_write();
--   (버킷 'place_memos'는 남겨도 쓰는 곳이 없다)
--
-- 규칙: 이미 푸시된 마이그레이션은 고치지 않는다(CLAUDE.md 11장). 새 테이블은 이 파일에서 RLS를 켜고 정책을 만든다.

-- ─────────────────────────────────────────────────────────────
-- 1. 한도 버킷 'place_memos' (하루 30회)
-- ─────────────────────────────────────────────────────────────
alter table private.daily_usage drop constraint daily_usage_bucket_values;
alter table private.daily_usage
  add constraint daily_usage_bucket_values
  check (bucket in ('reviews', 'reports', 'deals', 'polls', 'beta_feedback', 'place_memos'));

-- 값을 바꾸면 src/copy 메모 한도 문구도 함께 고친다(src/lib/moderation/limits.test.ts가 비교한다)
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
  end;
$$;

revoke all on function private.daily_quota_max(text) from public, anon, authenticated;

-- ─────────────────────────────────────────────────────────────
-- 2. place_memos
-- ─────────────────────────────────────────────────────────────
create table public.place_memos (
  user_id    uuid not null default auth.uid() references auth.users (id) on delete cascade,
  place_id   text not null,
  place_url  text,
  -- 사용자가 빈 입력란에 직접 쓴 글만(D-32). 카카오 장소명 미리 채우기 없음
  body       text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  primary key (user_id, place_id),
  constraint place_memos_place_id_format check (place_id ~ '^[0-9]{1,20}$'),
  constraint place_memos_place_url_format check (
    place_url is null
    or place_url in ('https://place.map.kakao.com/' || place_id, 'http://place.map.kakao.com/' || place_id)
  ),
  -- 1~40자(코드 포인트, D-33 안건 2)
  constraint place_memos_body_length check (char_length(body) between 1 and 40),
  -- 앞뒤 공백 없음, 줄바꿈과 탭 같은 제어 문자 없음(한 줄 이름표)
  constraint place_memos_body_shape check (body = btrim(body) and body !~ '[[:cntrl:]]')
);

comment on table public.place_memos is
  '식당 메모(T10.15, D-32, D-33). 본인만 읽고 쓴다. 사용자가 직접 쓴 40자 이내 글만, 카카오 값은 place_id, place_url만. 추천 점수에 쓰지 않는다. 1인 300곳, 하루 30회. 탈퇴 시 cascade';
comment on column public.place_memos.body is
  '사용자가 빈 입력란에 직접 쓴 글(1~40자). 장소명 미리 채우기, 붙여 넣기 버튼 없음(D-32). 금칙어 트리거 대상';

alter table public.place_memos enable row level security;

create policy "place_memos: 본인 읽기"
  on public.place_memos for select to authenticated
  using ((select auth.uid()) = user_id);

create policy "place_memos: 본인 추가"
  on public.place_memos for insert to authenticated
  with check ((select auth.uid()) = user_id);

create policy "place_memos: 본인 고치기"
  on public.place_memos for update to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

create policy "place_memos: 본인 지우기"
  on public.place_memos for delete to authenticated
  using ((select auth.uid()) = user_id);
-- anon 정책 없음. 관리자 읽기 정책, 함수도 없다

revoke all on table public.place_memos from public, anon, authenticated;
grant select, delete on table public.place_memos to authenticated;
grant insert (user_id, place_id, place_url, body) on table public.place_memos to authenticated;
-- 고칠 수 있는 열은 body뿐. user_id, place_id, place_url, 시각은 바꾸지 못한다(42501)
grant update (body) on table public.place_memos to authenticated;
grant all on table public.place_memos to service_role;

-- ─────────────────────────────────────────────────────────────
-- 3. 트리거
-- ─────────────────────────────────────────────────────────────
-- 금칙어 DB 안전망 (T10.3b 함수 그대로). body가 새로 들어오거나 바뀔 때만 검사한다
create trigger place_memos_banned_text_guard
  before insert or update of body on public.place_memos
  for each row execute function private.reject_banned_text('body');

-- 300곳 상한(insert), 하루 30회(insert와 body가 바뀐 update), updated_at.
-- 소유자 권한(security definer): 한도 함수(consume_daily_quota)는 authenticated에 실행 권한이 없다(beta_feedback과 같음).
-- 넘으면 'place_memos_limit_exceeded' 또는 'place_memos_daily_limit_exceeded'(check_violation, 23514)
create or replace function private.place_memos_before_write()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  existing int;
begin
  if tg_op = 'UPDATE' then
    -- 같은 글 다시 저장은 세지 않고 시각도 그대로 둔다
    if new.body is not distinct from old.body then
      return new;
    end if;
  else
    perform pg_advisory_xact_lock(hashtextextended('place_memos:' || new.user_id::text, 0));
    select count(*) into existing from public.place_memos where user_id = new.user_id;
    if existing >= 300 then
      raise exception 'place_memos_limit_exceeded'
        using errcode = 'check_violation',
              hint = '메모는 300곳까지 남길 수 있습니다';
    end if;
  end if;
  perform private.consume_daily_quota(new.user_id, 'place_memos');
  new.updated_at := now();
  return new;
end;
$$;

revoke all on function private.place_memos_before_write() from public, anon, authenticated;

create trigger place_memos_before_write
  before insert or update of body on public.place_memos
  for each row execute function private.place_memos_before_write();

-- 정지 사용자 쓰기 차단(T8.5 공통 트리거). 지우기는 막지 않는다(본인 글 정리는 허용)
create trigger block_suspended_writer
  before insert or update on public.place_memos
  for each row execute function private.block_suspended_writer();

-- ─────────────────────────────────────────────────────────────
-- 4. 장애 홈 "즐겨찾기에서 고르기" (D-33 안건 4)
-- ─────────────────────────────────────────────────────────────
-- 메모가 있는 즐겨찾기 3곳까지, 최근에 고친 메모 순. security invoker: favorites, place_memos 둘 다 본인 행만 보인다.
-- place_url은 메모 쪽이 비었으면 즐겨찾기 쪽 값을 쓴다(둘 다 place_id와 짝이 맞는 카카오맵 주소만 허용)
create or replace function public.my_favorite_memos()
returns table (
  place_id   text,
  place_url  text,
  body       text,
  updated_at timestamptz
)
language sql
stable
security invoker
set search_path = ''
as $$
  select m.place_id,
         coalesce(m.place_url, f.place_url),
         m.body,
         m.updated_at
    from public.place_memos as m
    join public.favorites as f
      on f.user_id = m.user_id
     and f.place_id = m.place_id
   where m.user_id = (select auth.uid())
   order by m.updated_at desc, m.place_id
   limit 3;
$$;

comment on function public.my_favorite_memos() is
  '카카오 장애 때 홈 "즐겨찾기에서 고르기": 메모가 있는 즐겨찾기 3곳까지(T10.15, D-33). security invoker, 본인 행만';

revoke all on function public.my_favorite_memos() from public, anon;
grant execute on function public.my_favorite_memos() to authenticated, service_role;
