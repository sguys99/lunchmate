-- T7.6~T7.10 친구 초대 투표: polls, poll_candidates, poll_members, poll_votes + 보안 함수 + 1분 마감 작업
-- PRD: POLL-01~13, MOD-05, 10.1절(polls, poll_candidates), 11.1절(투표 정책), 11.4절(탈퇴), 12장(링크 만료, 30명, 방장 탈퇴)
-- AC: AC-POLL-1(실시간 2초), AC-POLL-2(조회 시 확정), AC-POLL-3(코드 없이는 조회 불가), AC-POLL-5(확정 → 방문 후보)
-- 조사: research-notes T0.16(카카오 장소 값은 place_id와 place_url만), T0.16-1(투표방 기준점), T0.18(현위치 저장 금지)
-- 결정: G7 게이트(T7.5, 2026-11-01) 무기명(참여 여부만 공개), 방장이 동점을 30분 안에 정하지 않으면 서버 룰렛,
--       보내기 전 "만들기 취소"는 방을 지우고 하루 한도를 돌려준다, 보내지 않은 방도 진행 중에 남는다,
--       회식(kind party) 마감은 7일 안
--
-- 규칙 (T4.4, T5.14, T6.5와 같다)
-- 1. 모든 테이블은 이 파일 안에서 RLS를 켜고 정책을 만든다(CLAUDE.md 7장).
-- 2. 사용자 역할에는 읽기(select)만 준다. 쓰기는 전부 아래 보안 함수가 한다(상태, 마감, 한도, 30명 판정을 한곳에서).
-- 3. 투표방은 참여자만 읽는다. 코드만 가진 사람(비로그인 포함)은 poll_preview, join_poll로만 닿는다(AC-POLL-3).
-- 4. 카카오 값은 place_id와 place_url만. 후보, 결과 어디에도 장소명, 주소, 좌표, 카테고리, 거리 컬럼이 없다.
--    기준점(anchor)은 방장 사무실 핀이나 방장이 지도에서 찍은 점이다. 현위치를 보내지 않는 것은 앱 코드 경로가 막는다.
-- 5. 무기명: 다른 사람의 표 행은 RLS로 읽을 수 없다. 득표는 함수(get_poll)와 Realtime 집계 메시지로만 나간다.
--    poll_votes에는 user_id 열이 없다(참여자 행 id로만 잇는다).
-- 6. 탈퇴(PRD 11.4, T7.29): poll_members.user_id, polls.host_id, poll_candidates.added_by는 on delete set null.
--    진행 중(open) 방의 참여자 행은 트리거가 지워 표도 함께 사라지고, 끝난 방은 익명 참여자(user_id null)로 남는다.
--    방장이 탈퇴하면 진행 중이거나 동점 대기인 방은 취소된다(closed_reason host_left, PRD 12장).
-- 7. 시각은 timestamptz(UTC). 오늘, 하루 한도는 KST(private.kst_today()).
-- 8. 금칙어(MOD-04, 제목)는 TS 서버 계층(zod)에서 거른다. 여기서는 길이와 형식만 본다.
-- 9. 이미 푸시된 파일은 고치지 않는다. 앞 마이그레이션의 private.daily_usage 버킷 제약과 한도 함수는 넓히기만 한다.
--
-- 떠보기 방지 (G7 결정 2026-11-01)
-- - 기피 경고는 참여자 3명 이상일 때만 판정하고, 한 사람이 한 방에서 하루 10번까지(private.poll_avoid_usage).
-- - 코드만 가진 사람의 미리보기에는 기준점을 약 150m 격자로 내리고 반경을 150m 넓혀 준다. 참여자는 정확한 값.
-- - 표 없이 마감된 방은 결과 없이 closed로 둔다(화면 문구는 구현 단계).
--
-- Realtime (AC-POLL-1)
-- - postgres_changes로 poll_votes 행을 내보내면 누가 어디에 찍었는지가 새어 나가므로 쓰지 않는다.
-- - 쓰기 함수가 끝날 때 realtime.send()로 비공개(private) 채널 'poll:<poll id>'에 집계만 보낸다.
--   수신 권한은 realtime.messages의 select 정책(참여자만)이 정한다. 클라이언트는 private: true 채널로 구독한다.
-- - 출처 (2026-11-01 확인)
--   https://supabase.com/docs/guides/realtime/broadcast  "Broadcast from the database": realtime.send(payload, event,
--     topic, private). 메시지는 realtime.messages에 남고 3일 뒤 지워진다. private 값은 클라이언트 채널 설정과 같아야 한다.
--   https://supabase.com/docs/guides/realtime/authorization  private 채널은 realtime.messages RLS로 읽기 권한을 준다.
--     정책 안에서 realtime.topic()으로 채널 이름을 읽는다.

-- ─────────────────────────────────────────────────────────────
-- 0. 한도 버킷 'polls' 추가 (MOD-05 투표방 생성 하루 10개)
-- ─────────────────────────────────────────────────────────────
-- 값 목록을 넓히기만 한다(제약 교체, 데이터 변경 없음)
alter table private.daily_usage drop constraint daily_usage_bucket_values;
alter table private.daily_usage
  add constraint daily_usage_bucket_values check (bucket in ('reviews', 'reports', 'deals', 'polls'));

create or replace function private.daily_quota_max(p_bucket text)
returns int
language sql
immutable
set search_path = ''
as $$
  select case p_bucket
    when 'reviews' then 20   -- MOD-05 후기 하루 20
    when 'reports' then 30   -- MOD-05 신고 하루 30 (후기 신고, 할인 신고, 식당 정보 제보 합산)
    when 'deals'   then 10   -- DEAL-04 할인 제보 하루 10
    when 'polls'   then 10   -- MOD-05 투표방 생성 하루 10 (T7.11)
  end;
$$;

-- 한도 1건 되돌리기. 투표방을 보내기 전에 "만들기 취소"했을 때만 쓴다(G7 결정).
-- 만든 날(KST)의 카운터만 줄인다. 다른 버킷의 "지워도 줄지 않는다" 규칙은 그대로다.
create or replace function private.refund_daily_quota(p_user_id uuid, p_bucket text, p_day date)
returns void
language sql
security definer
set search_path = ''
as $$
  update private.daily_usage
     set used = greatest(0, used - 1)
   where user_id = p_user_id
     and bucket = p_bucket
     and kst_day = p_day;
$$;

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
    from unnest(array['reviews', 'reports', 'deals', 'polls']) as b(bucket)
    left join private.daily_usage as u
      on u.user_id = auth.uid()
     and u.kst_day = private.kst_today()
     and u.bucket = b.bucket
   where auth.uid() is not null;
$$;

comment on function public.my_daily_limits is
  '내 오늘 한도: reviews 20, reports 30, deals 10, polls 10 (MOD-05, DEAL-04)';

-- ─────────────────────────────────────────────────────────────
-- 1. polls: 투표방 (POLL-01, POLL-08, POLL-11, POLL-12)
-- ─────────────────────────────────────────────────────────────
-- 상태
--   open      투표 중
--   tie       마감했지만 1위가 둘 이상. 방장이 tie_until(마감 + 30분) 안에 고르거나 룰렛을 돌린다.
--             그때까지 안 고르면 서버가 룰렛으로 정한다(tie_resolved_by auto). 표는 더 받지 않는다.
--   closed    확정(winner_place_id). 아무도 투표하지 않았으면 winner 없이 closed
--   canceled  방장 취소(cancel) 또는 방장 탈퇴(host_left)
-- 링크 만료(POLL-11): closed_at + 24시간이 지나면 참여자가 아닌 사람에게는 '만료'만 보인다. 참여자는 결과를 계속 본다.
create table public.polls (
  id               uuid primary key default gen_random_uuid(),
  -- 추측할 수 없는 12자(31글자 알파벳, 약 59비트). 혼동되는 0, 1, i, l, o는 뺐다(AC-POLL-3)
  invite_code      text not null,
  host_id          uuid references auth.users (id) on delete set null,
  kind             text not null,
  title            text not null,
  multi            boolean not null default false,
  closes_at        timestamptz not null,
  status           text not null default 'open',
  closed_at        timestamptz,
  closed_reason    text,
  tie_until        timestamptz,
  tie_resolved_by  text,
  winner_place_id  text,
  winner_place_url text,
  -- 후보 이름 확인용 기준점(T0.16-1). 방장 사무실 핀 또는 방장이 지도에서 찍은 점. 현위치 금지
  anchor_lat       double precision not null,
  anchor_lng       double precision not null,
  radius_m         integer not null,
  -- 방장이 링크를 처음 보낸(카카오톡, 공유, 복사) 시각. 비어 있을 때만 "만들기 취소"로 지우고 한도를 돌려준다
  shared_at        timestamptz,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now(),

  constraint polls_invite_code_format check (invite_code ~ '^[2-9a-hjkmnp-z]{12}$'),
  constraint polls_invite_code_unique unique (invite_code),
  constraint polls_kind_values check (kind in ('lunch', 'dinner', 'party')),
  constraint polls_title_len check (char_length(title) between 1 and 20 and title = btrim(title)),
  constraint polls_status_values check (status in ('open', 'tie', 'closed', 'canceled')),
  constraint polls_closed_reason_values check (
    closed_reason is null or closed_reason in ('deadline', 'host', 'cancel', 'host_left')
  ),
  constraint polls_closed_at_state check ((status in ('closed', 'canceled')) = (closed_at is not null)),
  constraint polls_tie_state check ((status = 'tie') = (tie_until is not null)),
  constraint polls_tie_resolved_values check (
    tie_resolved_by is null or tie_resolved_by in ('host', 'roulette', 'auto')
  ),
  constraint polls_winner_state check (winner_place_id is null or status = 'closed'),
  constraint polls_winner_place_id_format check (winner_place_id is null or winner_place_id ~ '^[0-9]{1,20}$'),
  constraint polls_winner_place_url_format check (
    winner_place_url is null
    or winner_place_url in (
      'https://place.map.kakao.com/' || winner_place_id,
      'http://place.map.kakao.com/' || winner_place_id
    )
  ),
  constraint polls_anchor_lat_range check (anchor_lat between 33.0 and 38.7),
  constraint polls_anchor_lng_range check (anchor_lng between 124.5 and 132.0),
  constraint polls_radius_range check (radius_m between 100 and 3000)
);

comment on table public.polls is
  '투표방. 참여자만 읽기, 쓰기는 보안 함수만. 장소 값은 결과 place_id, place_url만 (POLL-01, 11.1, T0.16)';
comment on column public.polls.anchor_lat is
  '후보 이름 확인용 기준점 위도. 방장 사무실 핀 또는 지도에서 찍은 점(현위치 금지, T0.16-1)';
comment on column public.polls.shared_at is
  '방장이 링크를 처음 보낸 시각. null이면 보내기 전이라 만들기 취소(삭제 + 한도 반환)가 가능';

create index polls_due_open_idx on public.polls (closes_at) where status = 'open';
create index polls_due_tie_idx on public.polls (tie_until) where status = 'tie';
create index polls_host_idx on public.polls (host_id);

create trigger polls_set_updated_at
  before update on public.polls
  for each row execute function private.set_updated_at();

-- ─────────────────────────────────────────────────────────────
-- 2. poll_candidates: 후보 (place_id, place_url, 추가한 사람, 순서만. T0.16-1)
-- ─────────────────────────────────────────────────────────────
-- status approved는 투표 대상, suggested는 참여자 제안(방장 승인 대기, POLL-07). 승인된 후보는 2~5곳
create table public.poll_candidates (
  id         uuid primary key default gen_random_uuid(),
  poll_id    uuid not null references public.polls (id) on delete cascade,
  place_id   text not null,
  place_url  text,
  added_by   uuid references auth.users (id) on delete set null,
  position   smallint not null,
  status     text not null default 'approved',
  created_at timestamptz not null default now(),

  constraint poll_candidates_place_id_format check (place_id ~ '^[0-9]{1,20}$'),
  constraint poll_candidates_place_url_format check (
    place_url is null
    or place_url in ('https://place.map.kakao.com/' || place_id, 'http://place.map.kakao.com/' || place_id)
  ),
  constraint poll_candidates_status_values check (status in ('approved', 'suggested')),
  constraint poll_candidates_position_range check (position between 1 and 100),
  constraint poll_candidates_unique_place unique (poll_id, place_id)
);

comment on table public.poll_candidates is
  '투표 후보. place_id, place_url, 추가한 사람, 순서만. 이름, 좌표, 카테고리, 거리 없음 (T0.16-1, POLL-07)';

create index poll_candidates_poll_idx on public.poll_candidates (poll_id, position);

-- ─────────────────────────────────────────────────────────────
-- 3. poll_members: 참여자 (최대 30명, POLL-11)
-- ─────────────────────────────────────────────────────────────
create table public.poll_members (
  id        uuid primary key default gen_random_uuid(),
  poll_id   uuid not null references public.polls (id) on delete cascade,
  -- 탈퇴하면 null(익명 참여자). 진행 중 방이면 트리거가 행을 지운다(규칙 6)
  user_id   uuid references auth.users (id) on delete set null,
  is_host   boolean not null default false,
  joined_at timestamptz not null default now(),
  -- 마지막으로 표를 낸 시각. 다른 참여자에게는 "투표했음" 여부로만 보인다(어디에 찍었는지는 비공개)
  voted_at  timestamptz,

  constraint poll_members_unique_user unique (poll_id, user_id)
);

comment on table public.poll_members is
  '투표 참여자. 같은 방 참여자끼리만 읽기. 탈퇴 시 끝난 방은 익명(user_id null), 진행 중 방은 행 삭제 (11.4)';

create index poll_members_user_idx on public.poll_members (user_id, poll_id);

-- ─────────────────────────────────────────────────────────────
-- 4. poll_votes: 표 (1인 1표, 복수 선택이면 후보마다 1표, 11.1)
-- ─────────────────────────────────────────────────────────────
create table public.poll_votes (
  poll_id      uuid not null references public.polls (id) on delete cascade,
  member_id    uuid not null references public.poll_members (id) on delete cascade,
  candidate_id uuid not null references public.poll_candidates (id) on delete cascade,
  created_at   timestamptz not null default now(),

  primary key (member_id, candidate_id)
);

comment on table public.poll_votes is
  '표. user_id 열 없음(참여자 행 id로만 연결). 본인 표만 읽기, 득표는 get_poll과 Realtime 집계로만 (무기명, G7)';

create index poll_votes_candidate_idx on public.poll_votes (candidate_id);
create index poll_votes_poll_idx on public.poll_votes (poll_id);

-- ─────────────────────────────────────────────────────────────
-- 4a. 기피 경고 호출 카운터 (POLL-13, G7 결정 2026-11-01)
-- ─────────────────────────────────────────────────────────────
-- 후보 이름과 업종은 부르는 쪽이 넘기므로(저장 금지) 가짜 이름으로 남의 기피 항목을 떠보는 것을 막으려고
-- 한 사람이 한 방에서 하루(KST) 10번까지만 부른다. 지난 날짜 행은 11절 pg_cron 작업이 매일 지운다.
create table private.poll_avoid_usage (
  user_id uuid not null references auth.users (id) on delete cascade,
  poll_id uuid not null references public.polls (id) on delete cascade,
  kst_day date not null,
  used    int  not null default 0,

  primary key (user_id, poll_id, kst_day),
  constraint poll_avoid_usage_used_nonneg check (used >= 0)
);

comment on table private.poll_avoid_usage is
  '기피 경고 호출 수. 사람마다 방마다 하루 10번(POLL-13). 보안 함수만 쓴다. 지난 날짜 행은 pg_cron이 지운다';

alter table private.poll_avoid_usage enable row level security;
revoke all on table private.poll_avoid_usage from public, anon, authenticated;
grant all on table private.poll_avoid_usage to service_role;

-- ─────────────────────────────────────────────────────────────
-- 5. 기피 음식 키워드 (POLL-13). src/lib/reco/avoid-match.ts FOOD_RULES, ALLERGY_RULES를 옮긴 표
-- ─────────────────────────────────────────────────────────────
-- 정규화(공백 제거, 소문자)한 값. TS 표와 같은지는 src/features/poll/avoid-keywords-sync.test.ts가 이 파일을 읽어 확인한다.
-- TS 표를 바꾸면 새 마이그레이션으로 이 표를 다시 채운다(이 파일은 고치지 않는다).
create table private.avoid_keywords (
  rule_set text not null,
  value    text not null,
  field    text not null,
  keyword  text not null,

  primary key (rule_set, value, field, keyword),
  constraint avoid_keywords_rule_set_values check (rule_set in ('food', 'allergy')),
  constraint avoid_keywords_field_values check (field in ('category', 'exact', 'name'))
);

alter table private.avoid_keywords enable row level security;
revoke all on table private.avoid_keywords from public, anon, authenticated;
grant all on table private.avoid_keywords to service_role;

-- avoid-keywords:begin
insert into private.avoid_keywords (rule_set, value, field, keyword) values
  ('food', '회', 'category', '회'),
  ('food', '회', 'category', '초밥'),
  ('food', '회', 'name', '횟집'),
  ('food', '회', 'name', '회센터'),
  ('food', '회', 'name', '회집'),
  ('food', '회', 'name', '사시미'),
  ('food', '회', 'name', '물회'),
  ('food', '회', 'name', '생선회'),
  ('food', '회', 'name', '활어'),
  ('food', '회', 'name', '스시'),
  ('food', '회', 'name', '초밥'),
  ('food', '해산물', 'category', '해물'),
  ('food', '해산물', 'category', '해산물'),
  ('food', '해산물', 'category', '생선'),
  ('food', '해산물', 'category', '회'),
  ('food', '해산물', 'category', '초밥'),
  ('food', '해산물', 'category', '조개'),
  ('food', '해산물', 'category', '대게'),
  ('food', '해산물', 'category', '꽃게'),
  ('food', '해산물', 'category', '게요리'),
  ('food', '해산물', 'category', '낙지'),
  ('food', '해산물', 'category', '오징어'),
  ('food', '해산물', 'category', '주꾸미'),
  ('food', '해산물', 'category', '쭈꾸미'),
  ('food', '해산물', 'category', '장어'),
  ('food', '해산물', 'category', '새우'),
  ('food', '해산물', 'category', '랍스터'),
  ('food', '해산물', 'category', '복어'),
  ('food', '해산물', 'category', '아구'),
  ('food', '해산물', 'category', '아귀'),
  ('food', '해산물', 'category', '전복'),
  ('food', '해산물', 'category', '굴'),
  ('food', '해산물', 'exact', '게'),
  ('food', '해산물', 'name', '해물'),
  ('food', '해산물', 'name', '해산물'),
  ('food', '해산물', 'name', '수산'),
  ('food', '해산물', 'name', '횟집'),
  ('food', '해산물', 'name', '조개'),
  ('food', '해산물', 'name', '대게'),
  ('food', '해산물', 'name', '꽃게'),
  ('food', '해산물', 'name', '킹크랩'),
  ('food', '해산물', 'name', '크랩'),
  ('food', '해산물', 'name', '게장'),
  ('food', '해산물', 'name', '낙지'),
  ('food', '해산물', 'name', '오징어'),
  ('food', '해산물', 'name', '주꾸미'),
  ('food', '해산물', 'name', '쭈꾸미'),
  ('food', '해산물', 'name', '새우'),
  ('food', '해산물', 'name', '장어'),
  ('food', '해산물', 'name', '아구'),
  ('food', '해산물', 'name', '아귀'),
  ('food', '해산물', 'name', '복어'),
  ('food', '해산물', 'name', '전복'),
  ('food', '해산물', 'name', '생선'),
  ('food', '해산물', 'name', '초밥'),
  ('food', '해산물', 'name', '스시'),
  ('food', '매운 음식', 'category', '마라'),
  ('food', '매운 음식', 'category', '떡볶이'),
  ('food', '매운 음식', 'category', '짬뽕'),
  ('food', '매운 음식', 'category', '닭발'),
  ('food', '매운 음식', 'category', '낙지'),
  ('food', '매운 음식', 'category', '주꾸미'),
  ('food', '매운 음식', 'category', '쭈꾸미'),
  ('food', '매운 음식', 'category', '훠궈'),
  ('food', '매운 음식', 'category', '매운'),
  ('food', '매운 음식', 'name', '매운'),
  ('food', '매운 음식', 'name', '마라'),
  ('food', '매운 음식', 'name', '떡볶이'),
  ('food', '매운 음식', 'name', '라볶이'),
  ('food', '매운 음식', 'name', '짬뽕'),
  ('food', '매운 음식', 'name', '닭발'),
  ('food', '매운 음식', 'name', '불닭'),
  ('food', '매운 음식', 'name', '엽기'),
  ('food', '매운 음식', 'name', '낙지'),
  ('food', '매운 음식', 'name', '주꾸미'),
  ('food', '매운 음식', 'name', '쭈꾸미'),
  ('food', '매운 음식', 'name', '훠궈'),
  ('food', '매운 음식', 'name', '불족발'),
  ('food', '매운 음식', 'name', '실비김치'),
  ('food', '양고기', 'category', '양꼬치'),
  ('food', '양고기', 'category', '양고기'),
  ('food', '양고기', 'name', '양꼬치'),
  ('food', '양고기', 'name', '양고기'),
  ('food', '양고기', 'name', '양갈비'),
  ('food', '양고기', 'name', '양다리'),
  ('food', '양고기', 'name', '징기스칸'),
  ('food', '내장', 'category', '곱창'),
  ('food', '내장', 'category', '막창'),
  ('food', '내장', 'category', '대창'),
  ('food', '내장', 'category', '순대'),
  ('food', '내장', 'category', '내장'),
  ('food', '내장', 'name', '곱창'),
  ('food', '내장', 'name', '막창'),
  ('food', '내장', 'name', '대창'),
  ('food', '내장', 'name', '순대'),
  ('food', '내장', 'name', '내장'),
  ('food', '내장', 'name', '선지'),
  ('food', '내장', 'name', '곱도리'),
  ('food', '돼지고기', 'category', '돼지'),
  ('food', '돼지고기', 'category', '삼겹살'),
  ('food', '돼지고기', 'category', '족발'),
  ('food', '돼지고기', 'category', '보쌈'),
  ('food', '돼지고기', 'category', '감자탕'),
  ('food', '돼지고기', 'category', '순대'),
  ('food', '돼지고기', 'category', '돈까스'),
  ('food', '돼지고기', 'category', '돈가스'),
  ('food', '돼지고기', 'name', '돼지'),
  ('food', '돼지고기', 'name', '삼겹'),
  ('food', '돼지고기', 'name', '오겹'),
  ('food', '돼지고기', 'name', '족발'),
  ('food', '돼지고기', 'name', '보쌈'),
  ('food', '돼지고기', 'name', '감자탕'),
  ('food', '돼지고기', 'name', '순대'),
  ('food', '돼지고기', 'name', '돈까스'),
  ('food', '돼지고기', 'name', '돈가스'),
  ('food', '돼지고기', 'name', '돈카츠'),
  ('food', '돼지고기', 'name', '제육'),
  ('food', '돼지고기', 'name', '목살'),
  ('food', '돼지고기', 'name', '항정'),
  ('food', '닭고기', 'category', '닭'),
  ('food', '닭고기', 'category', '치킨'),
  ('food', '닭고기', 'category', '삼계탕'),
  ('food', '닭고기', 'name', '닭'),
  ('food', '닭고기', 'name', '치킨'),
  ('food', '닭고기', 'name', '삼계탕'),
  ('food', '닭고기', 'name', '통닭'),
  ('food', '닭고기', 'name', '백숙'),
  ('food', '날음식', 'category', '회'),
  ('food', '날음식', 'category', '초밥'),
  ('food', '날음식', 'category', '육회'),
  ('food', '날음식', 'category', '참치'),
  ('food', '날음식', 'name', '횟집'),
  ('food', '날음식', 'name', '회센터'),
  ('food', '날음식', 'name', '회집'),
  ('food', '날음식', 'name', '사시미'),
  ('food', '날음식', 'name', '물회'),
  ('food', '날음식', 'name', '생선회'),
  ('food', '날음식', 'name', '활어'),
  ('food', '날음식', 'name', '스시'),
  ('food', '날음식', 'name', '초밥'),
  ('food', '날음식', 'name', '육회'),
  ('food', '날음식', 'name', '게장'),
  ('food', '날음식', 'name', '포케'),
  ('food', '날음식', 'name', '생고기'),
  ('food', '날음식', 'name', '세비체'),
  ('allergy', '갑각류', 'category', '대게'),
  ('allergy', '갑각류', 'category', '꽃게'),
  ('allergy', '갑각류', 'category', '게요리'),
  ('allergy', '갑각류', 'category', '새우'),
  ('allergy', '갑각류', 'category', '랍스터'),
  ('allergy', '갑각류', 'category', '가재'),
  ('allergy', '갑각류', 'category', '크랩'),
  ('allergy', '갑각류', 'category', '게장'),
  ('allergy', '갑각류', 'category', '해물'),
  ('allergy', '갑각류', 'category', '해산물'),
  ('allergy', '갑각류', 'exact', '게'),
  ('allergy', '갑각류', 'name', '대게'),
  ('allergy', '갑각류', 'name', '꽃게'),
  ('allergy', '갑각류', 'name', '킹크랩'),
  ('allergy', '갑각류', 'name', '크랩'),
  ('allergy', '갑각류', 'name', '게장'),
  ('allergy', '갑각류', 'name', '새우'),
  ('allergy', '갑각류', 'name', '랍스터'),
  ('allergy', '갑각류', 'name', '가재'),
  ('allergy', '갑각류', 'name', '해물'),
  ('allergy', '갑각류', 'name', '해산물'),
  ('allergy', '조개류', 'category', '조개'),
  ('allergy', '조개류', 'category', '굴'),
  ('allergy', '조개류', 'category', '전복'),
  ('allergy', '조개류', 'category', '홍합'),
  ('allergy', '조개류', 'category', '바지락'),
  ('allergy', '조개류', 'category', '꼬막'),
  ('allergy', '조개류', 'category', '가리비'),
  ('allergy', '조개류', 'category', '해물'),
  ('allergy', '조개류', 'category', '해산물'),
  ('allergy', '조개류', 'name', '조개'),
  ('allergy', '조개류', 'name', '굴'),
  ('allergy', '조개류', 'name', '전복'),
  ('allergy', '조개류', 'name', '홍합'),
  ('allergy', '조개류', 'name', '바지락'),
  ('allergy', '조개류', 'name', '꼬막'),
  ('allergy', '조개류', 'name', '가리비'),
  ('allergy', '조개류', 'name', '해물'),
  ('allergy', '조개류', 'name', '해산물'),
  ('allergy', '조개류', 'name', '조개구이'),
  ('allergy', '땅콩', 'category', '땅콩'),
  ('allergy', '땅콩', 'name', '땅콩'),
  ('allergy', '견과류', 'category', '땅콩'),
  ('allergy', '견과류', 'category', '견과'),
  ('allergy', '견과류', 'name', '땅콩'),
  ('allergy', '견과류', 'name', '견과'),
  ('allergy', '견과류', 'name', '호두'),
  ('allergy', '견과류', 'name', '아몬드'),
  ('allergy', '견과류', 'name', '피스타치오'),
  ('allergy', '우유', 'category', '치즈'),
  ('allergy', '우유', 'category', '아이스크림'),
  ('allergy', '우유', 'name', '우유'),
  ('allergy', '우유', 'name', '밀크'),
  ('allergy', '우유', 'name', '치즈'),
  ('allergy', '우유', 'name', '크림'),
  ('allergy', '우유', 'name', '라떼'),
  ('allergy', '달걀', 'category', '계란'),
  ('allergy', '달걀', 'category', '달걀'),
  ('allergy', '달걀', 'name', '계란'),
  ('allergy', '달걀', 'name', '달걀'),
  ('allergy', '달걀', 'name', '에그'),
  ('allergy', '달걀', 'name', '오므라이스'),
  ('allergy', '밀', 'category', '빵'),
  ('allergy', '밀', 'category', '베이커리'),
  ('allergy', '밀', 'category', '제과'),
  ('allergy', '밀', 'category', '피자'),
  ('allergy', '밀', 'category', '파스타'),
  ('allergy', '밀', 'category', '국수'),
  ('allergy', '밀', 'category', '칼국수'),
  ('allergy', '밀', 'category', '라면'),
  ('allergy', '밀', 'category', '우동'),
  ('allergy', '밀', 'category', '만두'),
  ('allergy', '밀', 'category', '수제비'),
  ('allergy', '밀', 'category', '돈까스'),
  ('allergy', '밀', 'category', '돈가스'),
  ('allergy', '밀', 'category', '햄버거'),
  ('allergy', '밀', 'name', '빵'),
  ('allergy', '밀', 'name', '베이커리'),
  ('allergy', '밀', 'name', '피자'),
  ('allergy', '밀', 'name', '파스타'),
  ('allergy', '밀', 'name', '국수'),
  ('allergy', '밀', 'name', '칼국수'),
  ('allergy', '밀', 'name', '라면'),
  ('allergy', '밀', 'name', '우동'),
  ('allergy', '밀', 'name', '만두'),
  ('allergy', '밀', 'name', '수제비'),
  ('allergy', '밀', 'name', '버거'),
  ('allergy', '밀', 'name', '돈까스'),
  ('allergy', '밀', 'name', '돈가스'),
  ('allergy', '메밀', 'category', '메밀'),
  ('allergy', '메밀', 'category', '냉면'),
  ('allergy', '메밀', 'category', '막국수'),
  ('allergy', '메밀', 'category', '소바'),
  ('allergy', '메밀', 'name', '메밀'),
  ('allergy', '메밀', 'name', '냉면'),
  ('allergy', '메밀', 'name', '막국수'),
  ('allergy', '메밀', 'name', '소바');
-- avoid-keywords:end

-- ─────────────────────────────────────────────────────────────
-- 6. 판정 도구 (private, 정책과 함수 안에서만)
-- ─────────────────────────────────────────────────────────────

-- 지금 사용자가 이 방의 참여자인가. poll_members 정책이 자기 자신을 다시 읽어 무한히 도는 것을 막으려고
-- security definer 함수로 둔다(정책은 이 함수만 부른다)
create or replace function private.is_poll_member(p_poll_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.poll_members as m
     where m.poll_id = p_poll_id
       and m.user_id = (select auth.uid())
  );
$$;

create or replace function private.is_poll_host(p_poll_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.polls as p
     where p.id = p_poll_id
       and p.host_id = (select auth.uid())
  );
$$;

-- Realtime 채널 이름 'poll:<uuid>'를 받아 지금 사용자가 그 방 참여자인지. 형식이 다르면 false(캐스트 오류 대신)
create or replace function private.can_read_poll_topic(p_topic text)
returns boolean
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  if p_topic is null
     or p_topic !~ '^poll:[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' then
    return false;
  end if;
  return private.is_poll_member(substr(p_topic, 6)::uuid);
end;
$$;

-- 초대 코드 12자. 바이트마다 31로 나눈 나머지(치우침 8/256, 추측 난이도에는 영향이 미미)
create or replace function private.new_invite_code()
returns text
language plpgsql
volatile
set search_path = ''
as $$
declare
  v_alphabet constant text := '23456789abcdefghjkmnpqrstuvwxyz';
  v_bytes bytea := extensions.gen_random_bytes(12);
  v_code text := '';
begin
  for i in 0..11 loop
    v_code := v_code || substr(v_alphabet, (get_byte(v_bytes, i) % 31) + 1, 1);
  end loop;
  return v_code;
end;
$$;

-- 끼니(visits.meal). 회식은 저녁(PARTY-02)
create or replace function private.poll_meal(p_kind text)
returns text
language sql
immutable
set search_path = ''
as $$
  select case when p_kind = 'lunch' then 'lunch' else 'dinner' end;
$$;

-- 집계 메시지. 무기명이라 후보별 표 수, 투표한 사람 수, 참여자 수만 담는다
create or replace function private.poll_snapshot(p_poll_id uuid)
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select jsonb_build_object(
    'poll_id', p.id,
    'status', p.status,
    'closes_at', p.closes_at,
    'closed_at', p.closed_at,
    'closed_reason', p.closed_reason,
    'tie_until', p.tie_until,
    'tie_resolved_by', p.tie_resolved_by,
    'winner_place_id', p.winner_place_id,
    'member_count', (select count(*) from public.poll_members as m where m.poll_id = p.id),
    'voter_count', (
      select count(distinct v.member_id) from public.poll_votes as v where v.poll_id = p.id
    ),
    'counts', coalesce((
      select jsonb_object_agg(c.id, (select count(*) from public.poll_votes as v where v.candidate_id = c.id))
        from public.poll_candidates as c
       where c.poll_id = p.id and c.status = 'approved'
    ), '{}'::jsonb)
  )
  from public.polls as p
  where p.id = p_poll_id;
$$;

-- 참여자 화면에 집계를 보낸다(비공개 채널). Realtime이 실패해도 투표 자체는 성공해야 하므로 오류를 삼킨다.
-- 화면은 이 메시지를 못 받아도 get_poll을 다시 불러 맞춘다(재연결 시)
create or replace function private.poll_broadcast(p_poll_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  perform realtime.send(private.poll_snapshot(p_poll_id), 'poll_state', 'poll:' || p_poll_id::text, true);
exception when others then
  null;
end;
$$;

-- 확정: 결과를 적고, 참여자 전원(익명 제외)의 오늘 방문 후보를 만든다(AC-POLL-5, NAV-04 source poll).
-- visits는 본인만 쓰기(RLS)라 이 보안 함수 안에서 만든다(T5.14 규칙 7). 하루 20건 한도 같은 이유로
-- 한 사람의 삽입이 실패해도 다른 사람과 확정 자체는 계속한다.
create or replace function private.finalize_poll(p_poll_id uuid, p_candidate_id uuid, p_resolved_by text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_poll public.polls;
  v_cand public.poll_candidates;
  r record;
begin
  select * into v_poll from public.polls where id = p_poll_id;
  select * into v_cand from public.poll_candidates where id = p_candidate_id and poll_id = p_poll_id;

  update public.polls
     set status = 'closed',
         closed_at = now(),
         tie_until = null,
         tie_resolved_by = p_resolved_by,
         winner_place_id = v_cand.place_id,
         winner_place_url = v_cand.place_url
   where id = p_poll_id;

  for r in
    select m.user_id from public.poll_members as m
     where m.poll_id = p_poll_id and m.user_id is not null
  loop
    begin
      insert into public.visits (user_id, place_id, place_url, meal, source)
      values (r.user_id, v_cand.place_id, v_cand.place_url, private.poll_meal(v_poll.kind), 'poll')
      on conflict on constraint visits_unique_per_meal do nothing;
    exception when others then
      null;
    end;
  end loop;
end;
$$;

-- 마감 처리(시각 도달 deadline 또는 방장 결정 host). 1위가 하나면 확정, 둘 이상이면 동점 대기, 표가 없으면 결과 없이 닫는다
create or replace function private.close_poll(p_poll_id uuid, p_reason text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_status text;
  v_max    bigint;
  v_leaders uuid[];
begin
  select status into v_status from public.polls where id = p_poll_id for update;
  if v_status is distinct from 'open' then
    return;
  end if;

  with tally as (
    select c.id, (select count(*) from public.poll_votes as v where v.candidate_id = c.id) as n
      from public.poll_candidates as c
     where c.poll_id = p_poll_id and c.status = 'approved'
  )
  select max(n), array_agg(id order by id) filter (where n = (select max(n) from tally))
    into v_max, v_leaders
    from tally;

  if coalesce(v_max, 0) = 0 then
    update public.polls
       set status = 'closed', closed_at = now(), closed_reason = p_reason
     where id = p_poll_id;
  elsif cardinality(v_leaders) = 1 then
    update public.polls set closed_reason = p_reason where id = p_poll_id;
    perform private.finalize_poll(p_poll_id, v_leaders[1], null);
  else
    update public.polls
       set status = 'tie', closed_reason = p_reason, tie_until = now() + interval '30 minutes'
     where id = p_poll_id;
  end if;

  perform private.poll_broadcast(p_poll_id);
end;
$$;

-- 동점 후보 가운데 하나를 무작위로(룰렛). 방장이 누른 룰렛(roulette)과 30분 뒤 서버 룰렛(auto)이 같이 쓴다
create or replace function private.tie_roulette(p_poll_id uuid, p_resolved_by text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_pick uuid;
begin
  with tally as (
    select c.id, (select count(*) from public.poll_votes as v where v.candidate_id = c.id) as n
      from public.poll_candidates as c
     where c.poll_id = p_poll_id and c.status = 'approved'
  )
  select id into v_pick
    from tally
   where n = (select max(n) from tally)
   order by random()
   limit 1;

  perform private.finalize_poll(p_poll_id, v_pick, p_resolved_by);
  perform private.poll_broadcast(p_poll_id);
end;
$$;

-- 조회 시 판정(AC-POLL-2). 읽기, 참여, 투표 함수가 먼저 부른다. pg_cron도 같은 함수를 쓴다
create or replace function private.close_if_due(p_poll_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_poll public.polls;
begin
  select * into v_poll from public.polls where id = p_poll_id;
  if not found then
    return;
  end if;
  if v_poll.status = 'open' and v_poll.closes_at <= now() then
    perform private.close_poll(p_poll_id, 'deadline');
  elsif v_poll.status = 'tie' and v_poll.tie_until <= now() then
    -- 방장 결정과 cron이 같은 순간 룰렛을 두 번 돌리지 않게 행을 잠그고 다시 본다
    if (select status from public.polls where id = p_poll_id for update) = 'tie' then
      perform private.tie_roulette(p_poll_id, 'auto');
    end if;
  end if;
end;
$$;

-- 1분 작업(pg_cron): 마감이 지난 방과 30분 지난 동점 방을 처리한다. 한 번에 200곳까지(밀려도 다음 분에 이어서)
create or replace function private.close_due_polls()
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  r record;
  v_count integer := 0;
begin
  for r in
    select id from public.polls
     where (status = 'open' and closes_at <= now())
        or (status = 'tie' and tie_until <= now())
     order by coalesce(tie_until, closes_at)
     limit 200
  loop
    perform private.close_if_due(r.id);
    v_count := v_count + 1;
  end loop;
  return v_count;
end;
$$;

-- 방 하나를 잠그고 방장인지, 상태가 맞는지 본다. 쓰기 함수 공통 머리
create or replace function private.lock_poll_for_host(p_poll_id uuid, p_states text[])
returns public.polls
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_poll public.polls;
begin
  if auth.uid() is null then
    raise exception 'not_authenticated' using errcode = '42501';
  end if;
  perform private.close_if_due(p_poll_id);
  select * into v_poll from public.polls where id = p_poll_id for update;
  if not found or v_poll.host_id is distinct from auth.uid() then
    raise exception 'poll_not_host' using errcode = '42501';
  end if;
  if not (v_poll.status = any (p_states)) then
    raise exception 'poll_state_%', v_poll.status using errcode = 'check_violation';
  end if;
  return v_poll;
end;
$$;

-- 미리보기 기준점 흐리기(G7). 위도 0.00135도(약 150m), 경도 0.0017도(한국 위도에서 약 140~155m) 격자의 가운데로 내린다
create or replace function private.coarse_lat(p double precision)
returns double precision
language sql
immutable
set search_path = ''
as $$
  select round(((floor(p / 0.00135) + 0.5) * 0.00135)::numeric, 6)::double precision;
$$;

create or replace function private.coarse_lng(p double precision)
returns double precision
language sql
immutable
set search_path = ''
as $$
  select round(((floor(p / 0.0017) + 0.5) * 0.0017)::numeric, 6)::double precision;
$$;

-- 기피 음식 판정 (POLL-13). src/lib/reco/avoid-match.ts의 ruleMatches와 같은 순서
create or replace function private.avoid_norm(p text)
returns text
language sql
immutable
set search_path = ''
as $$
  select lower(regexp_replace(normalize(coalesce(p, ''), nfc), '\s+', '', 'g'));
$$;

create or replace function private.avoid_matcher_hit(p_set text, p_value text, p_name text, p_parts text[])
returns boolean
language sql
stable
set search_path = ''
as $$
  select exists (
    select 1 from private.avoid_keywords as k
     where k.rule_set = p_set
       and k.value = p_value
       and (
         (k.field = 'category' and exists (select 1 from unnest(p_parts) as part where strpos(part, k.keyword) > 0))
         or (k.field = 'exact' and k.keyword = any (p_parts))
         or (k.field = 'name' and strpos(p_name, k.keyword) > 0)
       )
  );
$$;

create or replace function private.avoid_rule_hit(
  p_kind text, p_value text, p_name text, p_parts text[], p_label text
)
returns boolean
language plpgsql
stable
set search_path = ''
as $$
declare
  v_value text := btrim(p_value);
  v_norm  text := private.avoid_norm(p_value);
  v_food  boolean := exists (select 1 from private.avoid_keywords where rule_set = 'food' and value = btrim(p_value));
  v_alg   boolean := exists (select 1 from private.avoid_keywords where rule_set = 'allergy' and value = btrim(p_value));
begin
  if p_kind = 'food' and v_food then
    return private.avoid_matcher_hit('food', v_value, p_name, p_parts);
  end if;
  if p_kind = 'allergy' and v_alg then
    return private.avoid_matcher_hit('allergy', v_value, p_name, p_parts);
  end if;
  -- 직접 입력, 또는 표에 없는 옛 칩 값: 이름, 업종 조각, 카테고리 라벨에 들어 있으면 해당
  if v_norm <> '' and (
       strpos(p_name, v_norm) > 0
       or exists (select 1 from unnest(p_parts) as part where strpos(part, v_norm) > 0)
       or strpos(p_label, v_norm) > 0
     ) then
    return true;
  end if;
  if v_food then
    return private.avoid_matcher_hit('food', v_value, p_name, p_parts);
  end if;
  if v_alg then
    return private.avoid_matcher_hit('allergy', v_value, p_name, p_parts);
  end if;
  return false;
end;
$$;

-- ─────────────────────────────────────────────────────────────
-- 7. 탈퇴 트리거 (T7.29, T7.22, PRD 11.4, 12장)
-- ─────────────────────────────────────────────────────────────
-- auth.users 삭제 → poll_members.user_id가 null로 바뀐 직후(after update). 진행 중 방이면 행을 지워 표도 사라진다.
-- 동점 대기, 확정, 취소된 방은 익명 참여자로 남긴다(동점 대기의 표는 이미 마감된 결과라 바꾸지 않는다).
create or replace function private.poll_members_after_anonymize()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if (select status from public.polls where id = new.poll_id) = 'open' then
    delete from public.poll_members where id = new.id;
    perform private.poll_broadcast(new.poll_id);
  end if;
  return null;
end;
$$;

create trigger poll_members_after_anonymize
  after update of user_id on public.poll_members
  for each row
  when (old.user_id is not null and new.user_id is null)
  execute function private.poll_members_after_anonymize();

-- 방장 탈퇴 → 진행 중이거나 동점 대기인 방은 자동 취소(host_left)
create or replace function private.polls_after_host_left()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.status in ('open', 'tie') then
    update public.polls
       set status = 'canceled', closed_reason = 'host_left', closed_at = now(), tie_until = null
     where id = new.id;
    perform private.poll_broadcast(new.id);
  end if;
  return null;
end;
$$;

create trigger polls_after_host_left
  after update of host_id on public.polls
  for each row
  when (old.host_id is not null and new.host_id is null)
  execute function private.polls_after_host_left();

-- ─────────────────────────────────────────────────────────────
-- 8. RLS 정책 (읽기만. 쓰기는 9절 함수)
-- ─────────────────────────────────────────────────────────────
alter table public.polls enable row level security;
alter table public.poll_candidates enable row level security;
alter table public.poll_members enable row level security;
alter table public.poll_votes enable row level security;

create policy "polls: 참여자 읽기"
  on public.polls for select to authenticated
  using (private.is_poll_member(id));

-- 승인된 후보는 참여자 모두, 제안은 제안한 사람과 방장만
create policy "poll_candidates: 참여자 읽기"
  on public.poll_candidates for select to authenticated
  using (
    private.is_poll_member(poll_id)
    and (status = 'approved' or added_by = (select auth.uid()) or private.is_poll_host(poll_id))
  );

create policy "poll_members: 같은 방 참여자 읽기"
  on public.poll_members for select to authenticated
  using (private.is_poll_member(poll_id));

-- 무기명: 내 표만
create policy "poll_votes: 본인 표 읽기"
  on public.poll_votes for select to authenticated
  using (
    exists (
      select 1 from public.poll_members as m
       where m.id = member_id
         and m.user_id = (select auth.uid())
    )
  );

revoke all on table public.polls from public, anon, authenticated;
revoke all on table public.poll_candidates from public, anon, authenticated;
revoke all on table public.poll_members from public, anon, authenticated;
revoke all on table public.poll_votes from public, anon, authenticated;
grant select on table public.polls to authenticated;
grant select on table public.poll_candidates to authenticated;
grant select on table public.poll_members to authenticated;
grant select on table public.poll_votes to authenticated;
grant all on table public.polls to service_role;
grant all on table public.poll_candidates to service_role;
grant all on table public.poll_members to service_role;
grant all on table public.poll_votes to service_role;

-- Realtime 비공개 채널 'poll:<id>' 수신은 그 방 참여자만. 보내기(insert)는 정책이 없어 사용자가 못 한다(서버만 보냄)
create policy "poll 채널: 참여자 수신"
  on realtime.messages for select to authenticated
  using (
    realtime.messages.extension = 'broadcast'
    and private.can_read_poll_topic((select realtime.topic()))
  );

-- ─────────────────────────────────────────────────────────────
-- 9. 함수 (PostgREST rpc)
-- ─────────────────────────────────────────────────────────────

-- 투표방 만들기 (POLL-01, POLL-02, PARTY-05, MOD-05). 하루 10개. 방장은 참여자로 함께 들어간다
create or replace function public.create_poll(
  p_kind        text,
  p_title       text,
  p_closes_at   timestamptz,
  p_multi       boolean,
  p_place_ids   text[],
  p_place_urls  text[],
  p_anchor_lat  double precision,
  p_anchor_lng  double precision,
  p_radius_m    integer
)
returns table (poll_id uuid, invite_code text)
language plpgsql
volatile
security definer
set search_path = ''
as $$
#variable_conflict use_column
declare
  v_uid  uuid := auth.uid();
  v_id   uuid;
  v_code text;
  v_n    int := coalesce(cardinality(p_place_ids), 0);
  v_max  interval;
begin
  if v_uid is null then
    raise exception 'not_authenticated' using errcode = '42501';
  end if;
  if v_n < 2 or v_n > 5 then
    raise exception 'poll_candidates_count' using errcode = 'check_violation',
      hint = '후보는 2~5곳입니다';
  end if;
  if (select count(distinct x) from unnest(p_place_ids) as x) <> v_n then
    raise exception 'poll_candidates_duplicate' using errcode = 'check_violation';
  end if;
  if p_place_urls is not null and cardinality(p_place_urls) not in (0, v_n) then
    raise exception 'poll_candidates_urls_length' using errcode = 'check_violation';
  end if;

  -- 마감: 1분 뒤 이후. 점심, 저녁은 24시간 안(화면은 오늘 안으로 고른다), 회식은 7일 안(G7)
  v_max := case when p_kind = 'party' then interval '7 days' else interval '24 hours' end;
  if p_closes_at is null or p_closes_at < now() + interval '1 minute' or p_closes_at > now() + v_max then
    raise exception 'poll_closes_at_range' using errcode = 'check_violation';
  end if;

  perform private.consume_daily_quota(v_uid, 'polls');

  -- 코드 충돌(극히 드묾)은 다시 뽑는다
  for i in 1..5 loop
    v_code := private.new_invite_code();
    exit when not exists (select 1 from public.polls as p where p.invite_code = v_code);
  end loop;

  insert into public.polls (
    invite_code, host_id, kind, title, multi, closes_at, anchor_lat, anchor_lng, radius_m
  ) values (
    v_code, v_uid, p_kind, btrim(p_title), coalesce(p_multi, false), p_closes_at,
    p_anchor_lat, p_anchor_lng, p_radius_m
  )
  returning id into v_id;

  insert into public.poll_members (poll_id, user_id, is_host) values (v_id, v_uid, true);

  insert into public.poll_candidates (poll_id, place_id, place_url, added_by, position, status)
  select v_id, x.place_id, nullif(p_place_urls[x.ord::int], ''), v_uid, x.ord::smallint, 'approved'
    from unnest(p_place_ids) with ordinality as x(place_id, ord);

  return query select v_id, v_code;
end;
$$;

comment on function public.create_poll is
  '투표방 만들기. 후보 2~5곳, 마감 1분~24시간(회식 7일), 하루 10개 (POLL-01, POLL-02, MOD-05)';

-- 방장이 링크를 처음 보냄(카카오톡, 공유, 복사). 이후에는 만들기 취소 대신 방장 취소(POLL-12)
create or replace function public.mark_poll_shared(p_poll_id uuid)
returns void
language plpgsql
volatile
security definer
set search_path = ''
as $$
begin
  if not private.is_poll_member(p_poll_id) then
    raise exception 'poll_not_member' using errcode = '42501';
  end if;
  update public.polls
     set shared_at = coalesce(shared_at, now())
   where id = p_poll_id
     and host_id = auth.uid();
end;
$$;

-- 보내기 전 "만들기 취소": 방을 지우고 만든 날 한도를 돌려준다(G7). 보냈거나 다른 참여자가 있으면 거절
create or replace function public.cancel_unsent_poll(p_poll_id uuid)
returns boolean
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  v_poll public.polls := private.lock_poll_for_host(p_poll_id, array['open']);
begin
  if v_poll.shared_at is not null
     or (select count(*) from public.poll_members as m where m.poll_id = p_poll_id) > 1 then
    raise exception 'poll_already_shared' using errcode = 'check_violation';
  end if;
  delete from public.polls where id = p_poll_id;
  perform private.refund_daily_quota(
    v_poll.host_id, 'polls', (v_poll.created_at at time zone 'Asia/Seoul')::date
  );
  return true;
end;
$$;

-- 방장 고치기 (T7.2 C "먼저 만들고 고치기"). null은 그대로. 복수 선택은 표가 하나도 없을 때만 바꾼다
create or replace function public.update_poll(
  p_poll_id   uuid,
  p_title     text default null,
  p_closes_at timestamptz default null,
  p_multi     boolean default null
)
returns void
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  v_poll public.polls := private.lock_poll_for_host(p_poll_id, array['open']);
  v_max  interval := case when v_poll.kind = 'party' then interval '7 days' else interval '24 hours' end;
begin
  if p_closes_at is not null
     and (p_closes_at < now() + interval '1 minute' or p_closes_at > v_poll.created_at + v_max) then
    raise exception 'poll_closes_at_range' using errcode = 'check_violation';
  end if;
  if p_multi is not null and p_multi <> v_poll.multi
     and exists (select 1 from public.poll_votes as v where v.poll_id = p_poll_id) then
    raise exception 'poll_multi_has_votes' using errcode = 'check_violation';
  end if;

  update public.polls
     set title = coalesce(btrim(p_title), title),
         closes_at = coalesce(p_closes_at, closes_at),
         multi = coalesce(p_multi, multi)
   where id = p_poll_id;

  perform private.poll_broadcast(p_poll_id);
end;
$$;

-- 코드로 미리보기 (POLL-05, 비로그인 포함). 제목, 후보 place_id와 순서, 기준점, 마감, 참여 인원만. 득표는 없다.
-- 만료(마감 + 24시간)된 방은 참여자가 아니면 status 'expired'만 돌려준다(POLL-11). 없는 코드는 null
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
    ), '[]'::jsonb)
  );
end;
$$;

comment on function public.poll_preview is
  '초대 코드로 미리보기. 득표 없음, 만료면 expired만 (POLL-05, POLL-11, AC-POLL-3)';

-- 코드로 참여 (로그인 필요). 이미 참여자면 그 방 id. 진행 중일 때만, 30명까지
create or replace function public.join_poll(p_code text)
returns uuid
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  v_uid  uuid := auth.uid();
  v_poll public.polls;
begin
  if v_uid is null then
    raise exception 'not_authenticated' using errcode = '42501';
  end if;
  if p_code is null or p_code !~ '^[2-9a-hjkmnp-z]{12}$' then
    raise exception 'poll_not_found' using errcode = 'no_data_found';
  end if;
  select * into v_poll from public.polls where invite_code = p_code;
  if not found then
    raise exception 'poll_not_found' using errcode = 'no_data_found';
  end if;

  if exists (select 1 from public.poll_members where poll_id = v_poll.id and user_id = v_uid) then
    return v_poll.id;
  end if;

  perform private.close_if_due(v_poll.id);
  perform pg_advisory_xact_lock(hashtextextended('poll_join:' || v_poll.id::text, 0));
  select * into v_poll from public.polls where id = v_poll.id;

  if v_poll.status <> 'open' then
    if v_poll.closed_at is not null and v_poll.closed_at + interval '24 hours' <= now() then
      raise exception 'poll_expired' using errcode = 'check_violation';
    end if;
    raise exception 'poll_closed' using errcode = 'check_violation';
  end if;
  if (select count(*) from public.poll_members where poll_id = v_poll.id) >= 30 then
    raise exception 'poll_full' using errcode = 'check_violation',
      hint = '참여 인원이 가득 찼습니다';
  end if;

  insert into public.poll_members (poll_id, user_id) values (v_poll.id, v_uid);
  perform private.poll_broadcast(v_poll.id);
  return v_poll.id;
end;
$$;

-- 참여자 화면 한 번에 (POLL-06, POLL-08, POLL-09, AC-POLL-2). 읽기 전에 마감을 판정한다.
-- 다른 참여자는 닉네임 표시용 user_id와 "투표했음" 여부만. 어디에 찍었는지는 my_votes(내 것)뿐
create or replace function public.get_poll(p_poll_id uuid)
returns jsonb
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  v_uid  uuid := auth.uid();
  v_poll public.polls;
  v_host boolean;
begin
  if v_uid is null or not private.is_poll_member(p_poll_id) then
    raise exception 'poll_not_member' using errcode = '42501';
  end if;
  perform private.close_if_due(p_poll_id);
  select * into v_poll from public.polls where id = p_poll_id;
  v_host := v_poll.host_id = v_uid;

  return jsonb_build_object(
    'poll', jsonb_build_object(
      'id', v_poll.id,
      'invite_code', v_poll.invite_code,
      'kind', v_poll.kind,
      'title', v_poll.title,
      'multi', v_poll.multi,
      'status', v_poll.status,
      'closes_at', v_poll.closes_at,
      'closed_at', v_poll.closed_at,
      'closed_reason', v_poll.closed_reason,
      'tie_until', v_poll.tie_until,
      'tie_resolved_by', v_poll.tie_resolved_by,
      'winner_place_id', v_poll.winner_place_id,
      'winner_place_url', v_poll.winner_place_url,
      'anchor_lat', v_poll.anchor_lat,
      'anchor_lng', v_poll.anchor_lng,
      'radius_m', v_poll.radius_m,
      'shared', v_poll.shared_at is not null,
      'is_host', v_host,
      'expires_at', v_poll.closed_at + interval '24 hours'
    ),
    'candidates', coalesce((
      select jsonb_agg(jsonb_build_object(
               'id', c.id,
               'place_id', c.place_id,
               'place_url', c.place_url,
               'position', c.position,
               'status', c.status,
               'suggested_by_me', c.status = 'suggested' and c.added_by = v_uid,
               'votes', case when c.status = 'approved'
                             then (select count(*) from public.poll_votes as v where v.candidate_id = c.id) end
             ) order by c.status, c.position)
        from public.poll_candidates as c
       where c.poll_id = p_poll_id
         and (c.status = 'approved' or v_host or c.added_by = v_uid)
    ), '[]'::jsonb),
    'members', coalesce((
      select jsonb_agg(jsonb_build_object(
               'id', m.id,
               'user_id', m.user_id,
               'is_host', m.is_host,
               'is_me', m.user_id = v_uid,
               'has_voted', exists (select 1 from public.poll_votes as v where v.member_id = m.id)
             ) order by m.is_host desc, m.joined_at)
        from public.poll_members as m
       where m.poll_id = p_poll_id
    ), '[]'::jsonb),
    'my_votes', coalesce((
      select jsonb_agg(v.candidate_id)
        from public.poll_votes as v
        join public.poll_members as m on m.id = v.member_id
       where v.poll_id = p_poll_id and m.user_id = v_uid
    ), '[]'::jsonb),
    'voter_count', (select count(distinct v.member_id) from public.poll_votes as v where v.poll_id = p_poll_id)
  );
end;
$$;

-- 투표, 바꾸기, 취소 (POLL-06). 후보 id 목록으로 내 표를 통째로 바꾼다. 빈 목록이면 취소.
-- 한 곳만(multi false)은 1개까지. 처음 낸 표면 true(poll_voted.is_first_vote)
create or replace function public.cast_vote(p_poll_id uuid, p_candidate_ids uuid[])
returns boolean
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  v_uid    uuid := auth.uid();
  v_member uuid;
  v_poll   public.polls;
  v_n      int := coalesce(cardinality(p_candidate_ids), 0);
  v_first  boolean;
begin
  if v_uid is null then
    raise exception 'not_authenticated' using errcode = '42501';
  end if;
  select id, voted_at is null into v_member, v_first
    from public.poll_members
   where poll_id = p_poll_id and user_id = v_uid;
  if v_member is null then
    raise exception 'poll_not_member' using errcode = '42501';
  end if;

  perform private.close_if_due(p_poll_id);
  select * into v_poll from public.polls where id = p_poll_id;
  if v_poll.status <> 'open' then
    raise exception 'poll_closed' using errcode = 'check_violation';
  end if;
  if not v_poll.multi and v_n > 1 then
    raise exception 'poll_single_choice' using errcode = 'check_violation';
  end if;
  if (select count(distinct x) from unnest(coalesce(p_candidate_ids, '{}')) as x) <> v_n
     or (select count(*) from public.poll_candidates as c
          where c.poll_id = p_poll_id and c.status = 'approved' and c.id = any (p_candidate_ids)) <> v_n then
    raise exception 'poll_candidate_invalid' using errcode = 'check_violation';
  end if;

  delete from public.poll_votes where member_id = v_member;
  insert into public.poll_votes (poll_id, member_id, candidate_id)
  select p_poll_id, v_member, x from unnest(coalesce(p_candidate_ids, '{}')) as x;

  update public.poll_members
     set voted_at = case when v_n = 0 then null else now() end
   where id = v_member;

  perform private.poll_broadcast(p_poll_id);
  return v_first and v_n > 0;
end;
$$;

-- 후보 넣기 (방장은 바로 승인, 참여자는 제안 POLL-07). 승인 5곳까지, 참여자 한 사람의 대기 제안 3개까지
create or replace function public.add_poll_candidate(p_poll_id uuid, p_place_id text, p_place_url text default null)
returns uuid
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  v_uid  uuid := auth.uid();
  v_poll public.polls;
  v_host boolean;
  v_id   uuid;
begin
  if v_uid is null or not private.is_poll_member(p_poll_id) then
    raise exception 'poll_not_member' using errcode = '42501';
  end if;
  perform private.close_if_due(p_poll_id);
  select * into v_poll from public.polls where id = p_poll_id for update;
  if v_poll.status <> 'open' then
    raise exception 'poll_closed' using errcode = 'check_violation';
  end if;
  v_host := v_poll.host_id = v_uid;

  if exists (select 1 from public.poll_candidates where poll_id = p_poll_id and place_id = p_place_id) then
    raise exception 'poll_candidate_exists' using errcode = 'unique_violation';
  end if;
  if v_host and (select count(*) from public.poll_candidates where poll_id = p_poll_id and status = 'approved') >= 5 then
    raise exception 'poll_candidates_full' using errcode = 'check_violation';
  end if;
  if not v_host and (
    select count(*) from public.poll_candidates
     where poll_id = p_poll_id and status = 'suggested' and added_by = v_uid
  ) >= 3 then
    raise exception 'poll_suggestions_full' using errcode = 'check_violation';
  end if;

  insert into public.poll_candidates (poll_id, place_id, place_url, added_by, position, status)
  values (
    p_poll_id, p_place_id, nullif(p_place_url, ''), v_uid,
    coalesce((select max(position) from public.poll_candidates where poll_id = p_poll_id), 0) + 1,
    case when v_host then 'approved' else 'suggested' end
  )
  returning id into v_id;

  perform private.poll_broadcast(p_poll_id);
  return v_id;
end;
$$;

-- 제안 승인, 거절 (방장, POLL-07). 승인은 5곳 안에서만, 거절은 지운다
create or replace function public.review_poll_suggestion(p_candidate_id uuid, p_approve boolean)
returns void
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  v_poll_id uuid := (select poll_id from public.poll_candidates where id = p_candidate_id and status = 'suggested');
  v_poll    public.polls;
begin
  if v_poll_id is null then
    raise exception 'poll_suggestion_not_found' using errcode = 'no_data_found';
  end if;
  v_poll := private.lock_poll_for_host(v_poll_id, array['open']);
  if p_approve then
    if (select count(*) from public.poll_candidates where poll_id = v_poll_id and status = 'approved') >= 5 then
      raise exception 'poll_candidates_full' using errcode = 'check_violation';
    end if;
    update public.poll_candidates set status = 'approved' where id = p_candidate_id;
  else
    delete from public.poll_candidates where id = p_candidate_id;
  end if;
  perform private.poll_broadcast(v_poll_id);
end;
$$;

-- 후보 빼기 (방장). 승인 후보는 2곳 아래로 줄일 수 없다. 그 후보의 표는 함께 지워진다
create or replace function public.remove_poll_candidate(p_candidate_id uuid)
returns void
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  v_cand public.poll_candidates;
  v_poll public.polls;
begin
  select * into v_cand from public.poll_candidates where id = p_candidate_id;
  if not found then
    raise exception 'poll_candidate_not_found' using errcode = 'no_data_found';
  end if;
  v_poll := private.lock_poll_for_host(v_cand.poll_id, array['open']);
  if v_cand.status = 'approved'
     and (select count(*) from public.poll_candidates where poll_id = v_cand.poll_id and status = 'approved') <= 2 then
    raise exception 'poll_candidates_min' using errcode = 'check_violation';
  end if;
  delete from public.poll_candidates where id = p_candidate_id;
  -- 그 후보에만 찍었던 사람은 다시 "아직 안 고름"
  update public.poll_members as m
     set voted_at = null
   where m.poll_id = v_cand.poll_id
     and m.voted_at is not null
     and not exists (select 1 from public.poll_votes as v where v.member_id = m.id);
  perform private.poll_broadcast(v_cand.poll_id);
end;
$$;

-- 방장 [결정] (POLL-08). 지금 1위로 마감, 동점이면 동점 대기로
create or replace function public.close_poll_now(p_poll_id uuid)
returns void
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  v_poll public.polls := private.lock_poll_for_host(p_poll_id, array['open']);
begin
  perform private.close_poll(p_poll_id, 'host');
end;
$$;

-- 동점 정하기 (방장, POLL-08). 후보를 고르면 그곳, null이면 룰렛
create or replace function public.resolve_poll_tie(p_poll_id uuid, p_candidate_id uuid default null)
returns void
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  v_poll public.polls := private.lock_poll_for_host(p_poll_id, array['tie']);
begin
  if p_candidate_id is null then
    perform private.tie_roulette(p_poll_id, 'roulette');
    return;
  end if;
  if not exists (
    with tally as (
      select c.id, (select count(*) from public.poll_votes as v where v.candidate_id = c.id) as n
        from public.poll_candidates as c
       where c.poll_id = p_poll_id and c.status = 'approved'
    )
    select 1 from tally where id = p_candidate_id and n = (select max(n) from tally)
  ) then
    raise exception 'poll_not_tied_candidate' using errcode = 'check_violation';
  end if;
  perform private.finalize_poll(p_poll_id, p_candidate_id, 'host');
  perform private.poll_broadcast(p_poll_id);
end;
$$;

-- 방장 취소 (POLL-12). 진행 중이거나 동점 대기일 때
create or replace function public.cancel_poll(p_poll_id uuid)
returns void
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  v_poll public.polls := private.lock_poll_for_host(p_poll_id, array['open', 'tie']);
begin
  update public.polls
     set status = 'canceled', closed_reason = 'cancel', closed_at = now(), tie_until = null
   where id = p_poll_id;
  perform private.poll_broadcast(p_poll_id);
end;
$$;

-- 투표 탭 목록 (POLL-10). 마감이 지난 내 방은 먼저 판정한다. 진행 중 → 동점 대기 → 끝난 방 순, 최근 50개
create or replace function public.my_polls()
returns table (
  poll_id         uuid,
  invite_code     text,
  kind            text,
  title           text,
  status          text,
  closes_at       timestamptz,
  closed_at       timestamptz,
  tie_until       timestamptz,
  winner_place_id text,
  winner_place_url text,
  is_host         boolean,
  has_voted       boolean,
  member_count    bigint,
  candidate_count bigint,
  created_at      timestamptz
)
language plpgsql
volatile
security definer
set search_path = ''
as $$
#variable_conflict use_column
declare
  v_uid uuid := auth.uid();
  r record;
begin
  if v_uid is null then
    raise exception 'not_authenticated' using errcode = '42501';
  end if;
  for r in
    select p.id from public.polls as p
      join public.poll_members as m on m.poll_id = p.id and m.user_id = v_uid
     where (p.status = 'open' and p.closes_at <= now()) or (p.status = 'tie' and p.tie_until <= now())
  loop
    perform private.close_if_due(r.id);
  end loop;

  return query
  select p.id, p.invite_code, p.kind, p.title, p.status, p.closes_at, p.closed_at, p.tie_until,
         p.winner_place_id, p.winner_place_url,
         p.host_id = v_uid,
         m.voted_at is not null,
         (select count(*) from public.poll_members as x where x.poll_id = p.id),
         (select count(*) from public.poll_candidates as c where c.poll_id = p.id and c.status = 'approved'),
         p.created_at
    from public.polls as p
    join public.poll_members as m on m.poll_id = p.id and m.user_id = v_uid
   order by case p.status when 'open' then 0 when 'tie' then 1 else 2 end,
            case when p.status = 'open' then p.closes_at end asc,
            coalesce(p.closed_at, p.created_at) desc
   limit 50;
end;
$$;

-- 기피 음식 경고 (POLL-13). 참여자 누구의 avoid_rules에 걸리는지, 어떤 항목인지는 돌려주지 않고 장소마다 true/false만.
-- 후보 이름과 업종은 저장하지 않으므로(T0.16) 부르는 쪽이 세션의 카카오 값을 넘긴다:
--   p_places = [{ "place_id": "...", "name": "...", "category_text": "음식점 > 한식 > 해물,생선", "category_label": "한식" }]
-- 이 방의 후보(승인, 제안) place_id만, 한 번에 5곳까지 받는다. 넘긴 값은 판정에만 쓰고 어디에도 남기지 않는다.
-- 떠보기 방지(G7 결정 2026-11-01)
-- - 참여자(탈퇴한 익명 제외, 본인 포함)가 3명 미만이면 판정하지 않고 모두 false + too_few true를 돌려준다.
--   2명 방에서는 경고 하나가 곧 상대의 기피 항목이 되기 때문이다. 화면은 too_few면 경고 칸을 숨긴다.
-- - 판정은 한 사람이 한 방에서 하루 10번까지. 넘으면 'poll_avoid_daily_limit_exceeded'. 3명 미만이면 세지 않는다.
create or replace function public.poll_avoid_flags(p_poll_id uuid, p_places jsonb)
returns table (place_id text, flagged boolean, too_few boolean)
language plpgsql
volatile
security definer
set search_path = ''
as $$
#variable_conflict use_column
declare
  v_uid     uuid := auth.uid();
  v_members int;
  v_used    int;
begin
  if v_uid is null or not private.is_poll_member(p_poll_id) then
    raise exception 'poll_not_member' using errcode = '42501';
  end if;
  if p_places is null or jsonb_typeof(p_places) <> 'array' or jsonb_array_length(p_places) > 5 then
    raise exception 'poll_avoid_places_invalid' using errcode = 'check_violation';
  end if;

  select count(*) into v_members
    from public.poll_members as m
   where m.poll_id = p_poll_id and m.user_id is not null;

  if v_members < 3 then
    return query
    select e ->> 'place_id', false, true
      from jsonb_array_elements(p_places) as e
     where exists (
       select 1 from public.poll_candidates as c
        where c.poll_id = p_poll_id and c.place_id = e ->> 'place_id'
     );
    return;
  end if;

  insert into private.poll_avoid_usage as u (user_id, poll_id, kst_day, used)
  values (v_uid, p_poll_id, private.kst_today(), 1)
  on conflict (user_id, poll_id, kst_day) do update set used = u.used + 1
  returning u.used into v_used;
  if v_used > 10 then
    raise exception 'poll_avoid_daily_limit_exceeded' using errcode = 'check_violation',
      hint = '기피 음식 확인은 한 투표방에서 하루 10번까지입니다';
  end if;

  return query
  with input as (
    select e ->> 'place_id' as place_id,
           private.avoid_norm(left(e ->> 'name', 100)) as name_n,
           array(
             select private.avoid_norm(part)
               from regexp_split_to_table(left(coalesce(e ->> 'category_text', ''), 200), '[>,]') as part
              where private.avoid_norm(part) <> ''
           ) as parts,
           private.avoid_norm(left(e ->> 'category_label', 40)) as label_n
      from jsonb_array_elements(p_places) as e
  )
  select i.place_id,
         exists (
           select 1
             from public.poll_members as m
             join public.avoid_rules as r on r.user_id = m.user_id
            where m.poll_id = p_poll_id
              and private.avoid_rule_hit(r.kind, r.value, i.name_n, i.parts, i.label_n)
         ),
         false
    from input as i
   where exists (
     select 1 from public.poll_candidates as c
      where c.poll_id = p_poll_id and c.place_id = i.place_id
   );
end;
$$;

comment on function public.poll_avoid_flags is
  '후보마다 참여자 누군가의 기피 규칙에 걸리는지만(누구, 무엇 비공개). 3명 미만이면 too_few, 사람마다 방마다 하루 10번. 이름, 업종은 저장하지 않음 (POLL-13)';

-- ─────────────────────────────────────────────────────────────
-- 10. 함수 권한
-- ─────────────────────────────────────────────────────────────
-- 미리보기만 비로그인도 부른다(POLL-05). 나머지는 로그인 사용자만
revoke all on function public.poll_preview(text) from public;
grant execute on function public.poll_preview(text) to anon, authenticated, service_role;

revoke all on function public.create_poll(text, text, timestamptz, boolean, text[], text[], double precision, double precision, integer) from public, anon;
grant execute on function public.create_poll(text, text, timestamptz, boolean, text[], text[], double precision, double precision, integer) to authenticated, service_role;
revoke all on function public.mark_poll_shared(uuid) from public, anon;
grant execute on function public.mark_poll_shared(uuid) to authenticated, service_role;
revoke all on function public.cancel_unsent_poll(uuid) from public, anon;
grant execute on function public.cancel_unsent_poll(uuid) to authenticated, service_role;
revoke all on function public.update_poll(uuid, text, timestamptz, boolean) from public, anon;
grant execute on function public.update_poll(uuid, text, timestamptz, boolean) to authenticated, service_role;
revoke all on function public.join_poll(text) from public, anon;
grant execute on function public.join_poll(text) to authenticated, service_role;
revoke all on function public.get_poll(uuid) from public, anon;
grant execute on function public.get_poll(uuid) to authenticated, service_role;
revoke all on function public.cast_vote(uuid, uuid[]) from public, anon;
grant execute on function public.cast_vote(uuid, uuid[]) to authenticated, service_role;
revoke all on function public.add_poll_candidate(uuid, text, text) from public, anon;
grant execute on function public.add_poll_candidate(uuid, text, text) to authenticated, service_role;
revoke all on function public.review_poll_suggestion(uuid, boolean) from public, anon;
grant execute on function public.review_poll_suggestion(uuid, boolean) to authenticated, service_role;
revoke all on function public.remove_poll_candidate(uuid) from public, anon;
grant execute on function public.remove_poll_candidate(uuid) to authenticated, service_role;
revoke all on function public.close_poll_now(uuid) from public, anon;
grant execute on function public.close_poll_now(uuid) to authenticated, service_role;
revoke all on function public.resolve_poll_tie(uuid, uuid) from public, anon;
grant execute on function public.resolve_poll_tie(uuid, uuid) to authenticated, service_role;
revoke all on function public.cancel_poll(uuid) from public, anon;
grant execute on function public.cancel_poll(uuid) to authenticated, service_role;
revoke all on function public.my_polls() from public, anon;
grant execute on function public.my_polls() to authenticated, service_role;
revoke all on function public.poll_avoid_flags(uuid, jsonb) from public, anon;
grant execute on function public.poll_avoid_flags(uuid, jsonb) to authenticated, service_role;
revoke all on function public.my_daily_limits() from public, anon;
grant execute on function public.my_daily_limits() to authenticated, service_role;

-- 정책이 부르는 판정 함수는 authenticated가 실행할 수 있어야 한다(내용은 auth.uid() 기준이라 남의 정보를 주지 않는다)
revoke all on function private.is_poll_member(uuid) from public, anon;
grant execute on function private.is_poll_member(uuid) to authenticated, service_role;
revoke all on function private.is_poll_host(uuid) from public, anon;
grant execute on function private.is_poll_host(uuid) to authenticated, service_role;
revoke all on function private.can_read_poll_topic(text) from public, anon;
grant execute on function private.can_read_poll_topic(text) to authenticated, service_role;

-- 나머지 private 함수는 직접 호출할 수 없다
revoke all on function private.daily_quota_max(text) from public, anon, authenticated;
revoke all on function private.refund_daily_quota(uuid, text, date) from public, anon, authenticated;
revoke all on function private.new_invite_code() from public, anon, authenticated;
revoke all on function private.poll_meal(text) from public, anon, authenticated;
revoke all on function private.poll_snapshot(uuid) from public, anon, authenticated;
revoke all on function private.poll_broadcast(uuid) from public, anon, authenticated;
revoke all on function private.finalize_poll(uuid, uuid, text) from public, anon, authenticated;
revoke all on function private.close_poll(uuid, text) from public, anon, authenticated;
revoke all on function private.tie_roulette(uuid, text) from public, anon, authenticated;
revoke all on function private.close_if_due(uuid) from public, anon, authenticated;
revoke all on function private.close_due_polls() from public, anon, authenticated;
revoke all on function private.lock_poll_for_host(uuid, text[]) from public, anon, authenticated;
revoke all on function private.avoid_norm(text) from public, anon, authenticated;
revoke all on function private.coarse_lat(double precision) from public, anon, authenticated;
revoke all on function private.coarse_lng(double precision) from public, anon, authenticated;
revoke all on function private.avoid_matcher_hit(text, text, text, text[]) from public, anon, authenticated;
revoke all on function private.avoid_rule_hit(text, text, text, text[], text) from public, anon, authenticated;
revoke all on function private.poll_members_after_anonymize() from public, anon, authenticated;
revoke all on function private.polls_after_host_left() from public, anon, authenticated;

-- ─────────────────────────────────────────────────────────────
-- 11. 1분 마감 작업 (pg_cron, PRD 6.10 마감 처리 2). pg_cron은 T6.26 마이그레이션이 켰다
-- ─────────────────────────────────────────────────────────────
-- 실행 기록은 T6.26의 lunchmate_purge_cron_history가 14일 뒤 지운다(lunchmate_ 접두)
-- 기피 경고 호출 카운터: 어제 이전 행 삭제. 매일 04:25 KST(19:25 UTC), T6.26 작업들 사이
create or replace function private.purge_old_poll_avoid_usage()
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_count integer;
begin
  delete from private.poll_avoid_usage where kst_day < private.kst_today();
  get diagnostics v_count = row_count;
  return v_count;
end;
$$;

revoke all on function private.purge_old_poll_avoid_usage() from public, anon, authenticated;

select cron.unschedule(j.jobid)
  from cron.job as j
 where j.jobname in ('lunchmate_close_polls', 'lunchmate_purge_poll_avoid_usage');
select cron.schedule('lunchmate_close_polls', '* * * * *', 'select private.close_due_polls()');
select cron.schedule('lunchmate_purge_poll_avoid_usage', '25 19 * * *', 'select private.purge_old_poll_avoid_usage()');
