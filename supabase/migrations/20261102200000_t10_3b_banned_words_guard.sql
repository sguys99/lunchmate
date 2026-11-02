-- T10.3b 금칙어 DB 안전망 (MOD-04, DEAL-04, POLL-01). 결정: design-decisions D-27(T8.15 "사용자 결정" B안).
-- 조사: research-notes T8.15 "빠진 곳과 위험" 1번(로그인 사용자가 publishable 키와 자기 세션으로 PostgREST를 직접 부르면
--       서버 액션의 금칙어 검사를 건너뛴다).
-- 앞 마이그레이션: 20261102120000_t9_4_beta_feedback.sql
--
-- 이 파일이 하는 일 (파괴적 변경 없음: 함수와 트리거만 더한다. 테이블, 열, 기존 행은 바꾸지 않는다)
-- 1. private.banned_word_list(kind): 금칙어 목록. src/lib/moderation/banned-words.ts에서 생성한 덩어리
--    (scripts/build-banned-words-sql.ts, pnpm moderation:sql). 손으로 고치지 않는다.
-- 2. private.contains_banned_content(text): src/lib/moderation(index.ts, normalize.ts)의 containsBannedContent와
--    같은 판정. 정규화(NFKC, 소문자, 보이지 않는 문자, 한 글자 낱말 붙이기, 자모 조합, 늘이기, 반복, leet)와
--    흔한 말 지우기(SAFE), 이웃 낱말 규칙, 링크, 연락처(한글 숫자 포함) 정규식을 그대로 옮겼다.
-- 3. private.reject_banned_text(): 트리거 함수. 인자로 받은 열이 새로 들어오거나 값이 바뀔 때만 검사하고,
--    걸리면 'banned_content'(check_violation, 23514)로 거절한다. 걸린 낱말은 알리지 않는다(D-13 안건 13).
--    관리자 숨김, 정지, 마감 같은 다른 열 update는 검사하지 않는다(값이 그대로면 건너뜀).
-- 4. 트리거 (T8.15 금칙어 적용 지점 표 기준)
--      public.reviews.body            insert, update of body     한 줄 후기 (MOD-04)
--      public.place_deals.content     insert, update of content  할인 내용 (DEAL-04, register_deal 경유)
--      public.review_reports.note     insert, update of note     신고 "기타" 글 (DEAL-04, D-13)
--      public.polls.title             insert, update of title    투표방 제목 (POLL-01, create_poll, update_poll 경유)
--      public.profiles.nickname       update of nickname         닉네임 (4단계 결정)
--    profiles insert는 검사하지 않는다: 가입 트리거(handle_new_user)가 제공자 닉네임을 그대로 넣고, 실패하면
--    로그인 자체가 실패하기 때문이다. 금칙어 첫 닉네임은 /auth/callback이 "점심손님 NNNN"으로 바꾼다(T6.17 후속).
--    beta_feedback.body는 운영자만 읽는 글이라 금칙어 대상이 아니다(T9.4 안건 13).
--
-- 서버 액션 경로: zod withoutBannedContent가 먼저 걸러 "banned"를 돌려주므로 DB까지 오지 않고 문구도 그대로다.
-- 만약 오면(목록 어긋남) mapPgError, mapPollError가 'banned_content'를 같은 "banned"로 바꾼다.
--
-- 기존 데이터: 검사하지 않고 그대로 둔다. 금칙어가 든 옛 행도 다른 열(숨김, 공개 여부 등)은 고칠 수 있고,
-- 걸리는 열을 다른 금칙어 글로 바꿀 때만 거절된다.
--
-- 되돌리기 (새 마이그레이션으로):
--   drop trigger if exists reviews_banned_text_guard on public.reviews;
--   drop trigger if exists place_deals_banned_text_guard on public.place_deals;
--   drop trigger if exists review_reports_banned_text_guard on public.review_reports;
--   drop trigger if exists polls_banned_text_guard on public.polls;
--   drop trigger if exists profiles_banned_text_guard on public.profiles;
--   (함수는 남겨도 아무 데서도 부르지 않는다. 지우려면 아래 6장의 함수 이름을 drop function.)
--
-- 목록을 바꿀 때: banned-words.ts를 고친 뒤 `pnpm moderation:sql` 출력을 새 마이그레이션에 넣는다.
-- pnpm test의 src/lib/moderation/banned-words-sync.test.ts가 마지막 마이그레이션 덩어리와 TS 목록이 같은지 본다.
--
-- 규칙: 이미 푸시된 마이그레이션은 고치지 않는다(CLAUDE.md 11장). 새 테이블은 없다.

-- ─────────────────────────────────────────────────────────────
-- 1. 금칙어 목록 (생성물)
-- ─────────────────────────────────────────────────────────────
-- BEGIN GENERATED banned-words (pnpm moderation:sql, 원본 src/lib/moderation/banned-words.ts)
create or replace function private.banned_word_list(p_kind text)
returns text[]
language sql
immutable
set search_path = ''
as $$
  select case p_kind
    when 'hangul' then array[
      '씨발', '시발', '씨빨', '시빨', '씨팔', '시팔', '씨벌', '씨바', '시바러', '씨부랄', '씨부럴', '십새', '씹새', '씹년', '씹놈',
      '씹창', '씹할', '씹덕', '좆', '좃같', '좇같', '좇까', '존나', '병신', '븅신', '빙신', '병싄', '개새끼', '개새기', '개색기',
      '개색끼', '개섀끼', '개쉐', '개세끼', '개씨발', '개같은', '개같네', '개놈', '개자식', '개지랄', '개쓰레기', '미친놈', '미친년',
      '미친새끼', '미친개', '또라이', '지랄', '염병', '엠창', '느금', '니애미', '니애비', '니미럴', '애미뒤', '애비뒤', '호로새끼',
      '후레자식', '썅', '쌍년', '쌍놈', '걸레년', '닥쳐', '뒤질래', '디질래', '뒈져', '뒤져라', '쳐먹', '처먹어', '쓰레기새끼', '등신새끼',
      '찐따', '애자새끼', '꼴통', '한남충', '김치녀', '된장녀', '맘충', '급식충', '틀딱', '노인충', '똥꼬충', '짱깨', '쪽바리', '똥남아',
      '전라디언', '개쌍도', '흑형', '장애새끼', '정신병자새끼', '섹스', '섹파', '야동', '강간', '창녀', '창놈', '보빨', '좆물', '보짓',
      '자짓', '성매매', '조건만남', '원나잇', '출장안마', '출장마사지', '오피걸', '몸캠', '오픈채팅', '오픈톡', '오픈카톡', '오픈챗',
      '카톡아이디', '카톡친추', '톡아이디', '카카오톡아이디', '텔레그램', '텔레아이디', '라인아이디', '닷컴', '광고문의', '협찬문의', '체험단모집',
      '카톡문의', '디엠주세요', '토토사이트', '바카라', '먹튀검증', '카지노사이트', '불법대출', '작업대출', '대출문의', '수익보장', '슬롯사이트',
      '홀덤사이트', '파워볼', '사설토토', '먹튀사이트', '리딩방', '재택알바', '고액알바', '제휴문의', '홍보문의'
    ]::text[]
    when 'jamo' then array[
      'ㅅㅂ', 'ㅆㅂ', 'ㅅ발', 'ㅆ발', '시ㅂ', '씨ㅂ', 'ㅂㅅ', 'ㅄ', 'ㅂ신', '병ㅅ', 'ㅈㄹ', '지ㄹ', 'ㅈ랄', 'ㅈㄴ', '존ㄴ', 'ㅈ같',
      'ㅈ까', 'ㄱㅅㄲ', '개ㅅㄲ', 'ㅅㄲ', 'ㅁㅊㄴ', 'ㄴㄱㅁ', 'ㅇㅁ뒤'
    ]::text[]
    when 'mixed' then array[
      '18놈', '18년아', '18새끼', '개18'
    ]::text[]
    when 'latin' then array[
      'fuck', 'fck', 'shit', 'bitch', 'biatch', 'bastard', 'motherfucker', 'nigger', 'nigga',
      'faggot', 'porn', 'pussy', 'dickhead', 'whore', 'slut', 'tlqkf', 'qudtls', 'wlfkf', 'whssk',
      'sibal', 'sibbal', 'ssibal', 'byungsin', 'jiral'
    ]::text[]
    when 'safe' then array[
      '시발점', '역시발', '시발역', '시발택시', '시발자동차', '시발차', '씨발라', '씨발랐', '씨바르', 'shitake', '생강간',
      'scunthorpe'
    ]::text[]
  end;
$$;
-- END GENERATED banned-words

comment on function private.banned_word_list(text) is
  '금칙어 목록(hangul, jamo, mixed, latin, safe). src/lib/moderation/banned-words.ts 생성물, 손으로 고치지 않는다 (T10.3b)';

-- ─────────────────────────────────────────────────────────────
-- 2. 정규화 도구 (normalize.ts)
-- ─────────────────────────────────────────────────────────────
-- 정규식 메모
-- - JS \s = [\t\n\v\f\r    -     　﻿]. Postgres \s는 로캘에 따라 달라
--   목록을 그대로 적는다. JS \d는 [0-9]뿐이라 여기서도 [0-9]로 쓴다.
-- - JS 소문자는 ASCII와 'İ'(→ i + U+0307)만 결과에 영향을 준다(NFKC 뒤, 비교는 a-z와 한글만). lower()는 DB 로캘에
--   따라 달라 translate로 고정한다.

-- 같은 글자가 이어지면 하나로 ("ㅋㅋㅋ" → "ㅋ")
create or replace function private.mod_collapse(p text)
returns text
language sql
immutable
strict
set search_path = ''
as $$
  select regexp_replace(p, '(.)\1+', '\1', 'g');
$$;

-- NFKC(호환 자모 ㄱ~ㆎ 구간 제외), 소문자, 보이지 않는 문자 제거
create or replace function private.mod_base_text(p text)
returns text
language sql
immutable
strict
set search_path = ''
as $$
  select regexp_replace(
    replace(
      translate(
        coalesce((
          select string_agg(
                   case when r.part[1] ~ '^[ㄱ-ㆎ]' then r.part[1]
                        else normalize(r.part[1], NFKC) end,
                   '' order by r.n)
            from regexp_matches(p, '[ㄱ-ㆎ]+|[^ㄱ-ㆎ]+', 'g') with ordinality as r(part, n)
        ), ''),
        'ABCDEFGHIJKLMNOPQRSTUVWXYZ',
        'abcdefghijklmnopqrstuvwxyz'
      ),
      U&'\0130', U&'i\0307'
    ),
    '[​-‍⁠﻿­]', '', 'g'
  );
$$;

-- 풀어 쓴 자모(ㅅㅣㅂㅏㄹ)를 음절로. 모음이 없는 자모(ㅅㅂ)는 그대로
create or replace function private.mod_compose_jamo(p text)
returns text
language plpgsql
immutable
strict
set search_path = ''
as $$
declare
  cho  constant text := 'ㄱㄲㄴㄷㄸㄹㅁㅂㅃㅅㅆㅇㅈㅉㅊㅋㅌㅍㅎ';
  jung constant text := 'ㅏㅐㅑㅒㅓㅔㅕㅖㅗㅘㅙㅚㅛㅜㅝㅞㅟㅠㅡㅢㅣ';
  jong constant text[] := array[
    '', 'ㄱ', 'ㄲ', 'ㄳ', 'ㄴ', 'ㄵ', 'ㄶ', 'ㄷ', 'ㄹ', 'ㄺ', 'ㄻ', 'ㄼ', 'ㄽ', 'ㄾ', 'ㄿ', 'ㅀ',
    'ㅁ', 'ㅂ', 'ㅄ', 'ㅅ', 'ㅆ', 'ㅇ', 'ㅈ', 'ㅊ', 'ㅋ', 'ㅌ', 'ㅍ', 'ㅎ'
  ];
  n    int := char_length(p);
  i    int := 1;
  c    text;
  l    int;
  v    int;
  t    int;
  take boolean;
  acc  text := '';
begin
  while i <= n loop
    c := substr(p, i, 1);
    l := strpos(cho, c) - 1;
    v := case when i + 1 <= n then strpos(jung, substr(p, i + 1, 1)) - 1 else -1 end;
    if l >= 0 and v >= 0 then
      t := case when i + 2 <= n then coalesce(array_position(jong, substr(p, i + 2, 1)) - 1, -1) else -1 end;
      -- 받침 후보 뒤에 모음이 오면 그 자모는 다음 음절의 초성이다
      take := t > 0 and (i + 3 > n or strpos(jung, substr(p, i + 3, 1)) = 0);
      acc := acc || chr(44032 + (l * 21 + v) * 28 + case when take then t else 0 end);
      i := i + case when take then 3 else 2 end;
      continue;
    end if;
    acc := acc || c;
    i := i + 1;
  end loop;
  return acc;
end;
$$;

-- 소리 늘이기 합치기: "씨이" → "씨", "바알" → "발" (앞 음절과 모음이 같은 ㅇ 음절, 앞 음절 받침 없음)
create or replace function private.mod_merge_stretch(p text)
returns text
language plpgsql
immutable
strict
set search_path = ''
as $$
declare
  n    int := char_length(p);
  acc  text := '';
  prev text := null;
  c    text;
  pc   int;
  cc   int;
begin
  for i in 1..n loop
    c := substr(p, i, 1);
    if prev is not null then
      pc := ascii(prev) - 44032;
      cc := ascii(c) - 44032;
      if pc between 0 and 11171 and cc between 0 and 11171
         and cc / 588 = 11
         and (cc % 588) / 28 = (pc % 588) / 28
         and pc % 28 = 0 then
        prev := chr(ascii(prev) + cc % 28);
        continue;
      end if;
      acc := acc || prev;
    end if;
    prev := c;
  end loop;
  return acc || coalesce(prev, '');
end;
$$;

-- 한 글자 낱말 덩어리만 붙인다("시 발 놈" → "시발놈"). 빈 낱말은 버린다
create or replace function private.mod_glue(p text[])
returns text[]
language plpgsql
immutable
strict
set search_path = ''
as $$
declare
  t   text;
  run text := '';
  acc text[] := '{}';
begin
  foreach t in array p loop
    if char_length(t) = 0 then
      continue;
    end if;
    if char_length(t) = 1 then
      run := run || t;
      continue;
    end if;
    if run <> '' then
      acc := acc || run;
      run := '';
    end if;
    acc := acc || t;
  end loop;
  if run <> '' then
    acc := acc || run;
  end if;
  return acc;
end;
$$;

-- 낱말 세 모양 (normalizeTokens): hangul 한글만, mixed 한글+영문+숫자, latin leet 치환 뒤 영문만
create or replace function private.mod_tokens(
  p text,
  out hangul text[],
  out mixed text[],
  out latin text[]
)
language plpgsql
immutable
strict
set search_path = ''
as $$
declare
  raw text[] := regexp_split_to_array(
    private.mod_base_text(p),
    '[\t\n\v\f\r    -     　﻿]+'
  );
begin
  hangul := array(
    select private.mod_collapse(g.x)
      from unnest(private.mod_glue(array(
             select private.mod_collapse(private.mod_merge_stretch(private.mod_compose_jamo(
                      regexp_replace(r.x, '[^ㄱ-ㆎ가-힣]', '', 'g'))))
               from unnest(raw) with ordinality as r(x, n)
              order by r.n
           ))) with ordinality as g(x, n)
     order by g.n
  );
  -- \p{Script=Hangul} 구간(Unicode, Node 24 기준)
  mixed := array(
    select private.mod_collapse(private.mod_compose_jamo(g.x))
      from unnest(private.mod_glue(array(
             select regexp_replace(
                      r.x,
                      '[^ᄀ-ᇿ〮-〯ㄱ-ㆎ㈀-㈞㉠-㉾ꥠ-ꥼ가-힣ힰ-ퟆퟋ-ퟻﾠ-ﾾￂ-ￇￊ-ￏￒ-ￗￚ-ￜa-z0-9]',
                      '', 'g')
               from unnest(raw) with ordinality as r(x, n)
              order by r.n
           ))) with ordinality as g(x, n)
     order by g.n
  );
  -- leet: 0→o 1→i 3→e 4→a 5→s 7→t @→a $→s !→i |→i
  latin := array(
    select private.mod_collapse(g.x)
      from unnest(private.mod_glue(array(
             select regexp_replace(translate(r.x, '013457@$!|', 'oieastasii'), '[^a-z]', '', 'g')
               from unnest(raw) with ordinality as r(x, n)
              order by r.n
           ))) with ordinality as g(x, n)
     order by g.n
  );
end;
$$;

-- ─────────────────────────────────────────────────────────────
-- 3. 판정 (index.ts)
-- ─────────────────────────────────────────────────────────────
-- 목록 준비: 반복 합치기 + 중복 제거(처음 나온 순서 유지, SAFE는 순서대로 지우므로)
create or replace function private.banned_words(p_kind text)
returns text[]
language sql
immutable
strict
set search_path = ''
as $$
  select coalesce(array(
    select s.w
      from (
        select private.mod_collapse(u.x) as w, min(u.n) as first_n
          from unnest(private.banned_word_list(p_kind)) with ordinality as u(x, n)
         group by 1
      ) as s
     order by s.first_n
  ), '{}');
$$;

-- 흔한 말(시발점, 수박씨 발라) 부분을 띄어쓰기로 바꾼다
create or replace function private.mod_strip_safe(p text, p_safe text[])
returns text
language plpgsql
immutable
strict
set search_path = ''
as $$
declare
  s   text;
  acc text := p;
begin
  foreach s in array p_safe loop
    acc := replace(acc, s, ' ');
  end loop;
  return acc;
end;
$$;

-- 낱말 안 어디든, 또는 이웃 두 낱말을 붙였을 때 앞 낱말(2글자 이상) 처음에서 시작해 뒤 낱말까지 걸치는 금칙어
create or replace function private.mod_match_tokens(p_tokens text[], p_words text[], p_safe text[])
returns boolean
language plpgsql
immutable
strict
set search_path = ''
as $$
declare
  clean text[] := array(
    select private.mod_strip_safe(u.x, p_safe)
      from unnest(p_tokens) with ordinality as u(x, n)
     order by u.n
  );
  n    int := coalesce(cardinality(clean), 0);
  t    text;
  pair text;
begin
  for i in 1..n loop
    t := clean[i];
    if exists (select 1 from unnest(p_words) as w(x) where strpos(t, w.x) > 0) then
      return true;
    end if;
    continue when i = n;
    pair := private.mod_strip_safe(t || clean[i + 1], p_safe);
    if char_length(t) > 1 and exists (
      select 1 from unnest(p_words) as w(x)
       where starts_with(pair, w.x) and char_length(w.x) > char_length(t)
    ) then
      return true;
    end if;
  end loop;
  return false;
end;
$$;

-- 욕설, 비하, 성적 표현, 광고 낱말 (hasBannedWord)
create or replace function private.has_banned_word(p text)
returns boolean
language plpgsql
immutable
strict
set search_path = ''
as $$
declare
  tk   record := private.mod_tokens(p);
  safe text[] := private.banned_words('safe');
begin
  return private.mod_match_tokens(tk.hangul, private.banned_words('hangul'), safe)
      or private.mod_match_tokens(tk.hangul, private.banned_words('jamo'), safe)
      or private.mod_match_tokens(tk.mixed, private.banned_words('mixed'), safe)
      or private.mod_match_tokens(tk.latin, private.banned_words('latin'), safe);
end;
$$;

-- 링크, 연락처, 오픈채팅 (hasContactOrLink). 전화번호는 0으로 시작하는 9~11자리와 15xx-xxxx, 한글로 쓴 9자 이상 숫자 포함
create or replace function private.has_contact_or_link(p text)
returns boolean
language plpgsql
immutable
strict
set search_path = ''
as $$
declare
  ws_class constant text := '\t\n\v\f\r    -     　﻿';
  digit_run constant text :=
    '[공영일이삼사오육륙칠팔구](?:[' || ws_class || '.-]*[공영일이삼사오육륙칠팔구]){8,}';
  t     text;
  run   text;
  rep   text;
  pos   int;
  start int := 1;
begin
  -- normalizeForPatterns: 점, 쌍점, 빗금 주변 공백 제거("naver . com")
  t := regexp_replace(private.mod_base_text(p), '[' || ws_class || ']*([.:/])[' || ws_class || ']*', '\1', 'g');

  if t ~ 'https?://'
     or t ~ '(^|[^a-z0-9])www\.'
     or t ~ 'open\.kakao\.com'
     or t ~ '(^|[^a-z0-9])t\.me/'
     or t ~ '[a-z0-9-]{2,}\.(com|net|org|kr|me|io|ly|gl|gg|shop|xyz|link|site|app|biz|info|tv|store|club|top)(?![a-z])'
     or t ~ '[a-z0-9._%+-]+@[a-z0-9-]+\.[a-z]{2,}' then
    return true;
  end if;

  -- 한글 숫자 덩어리("공일공 일이삼사 오육칠팔")만 숫자로 바꾼다(구분자는 버림)
  loop
    pos := regexp_instr(t, digit_run, start);
    exit when pos = 0;
    run := regexp_substr(t, digit_run, start);
    rep := regexp_replace(translate(run, '공영일이삼사오육륙칠팔구', '001234566789'), '[^0-9]', '', 'g');
    t := left(t, pos - 1) || rep || substr(t, pos + char_length(run));
    start := pos + char_length(rep);
  end loop;

  if t ~ '(^|[^0-9])1[568][0-9]{2}-[0-9]{4}([^0-9]|$)' then
    return true;
  end if;
  -- 숫자 사이 구분자를 지운다(가격 "12,000"은 0으로 시작하지 않아 걸리지 않는다)
  t := regexp_replace(t, '([0-9])[' || ws_class || '.()/_~-]+(?=[0-9])', '\1', 'g');
  return t ~ '(^|[^0-9])0[0-9]{8,10}([^0-9]|$)';
end;
$$;

-- 금칙어 또는 연락처, 링크 (containsBannedContent). 빈 글과 null은 false
create or replace function private.contains_banned_content(p text)
returns boolean
language sql
immutable
set search_path = ''
as $$
  select coalesce(p, '') <> ''
     and (private.has_banned_word(p) or private.has_contact_or_link(p));
$$;

comment on function private.contains_banned_content(text) is
  'src/lib/moderation containsBannedContent와 같은 판정(정규화, 목록, 링크, 연락처). 트리거 안전망 전용 (T10.3b, MOD-04)';

-- ─────────────────────────────────────────────────────────────
-- 4. 트리거 함수: 인자로 받은 열이 새로 들어오거나 바뀔 때만 검사
-- ─────────────────────────────────────────────────────────────
-- 소유자 권한(security definer)으로 돌아 authenticated에 검사 함수 실행 권한을 주지 않는다.
-- 걸린 낱말과 열 이름은 오류에 넣지 않는다. 앱은 message 'banned_content'만 보고 "banned" 문구를 쓴다.
create or replace function private.reject_banned_text()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  col   text;
  v_new text;
begin
  foreach col in array tg_argv loop
    v_new := to_jsonb(new) ->> col;
    continue when v_new is null;
    continue when tg_op = 'UPDATE' and v_new is not distinct from (to_jsonb(old) ->> col);
    if private.contains_banned_content(v_new) then
      raise exception 'banned_content'
        using errcode = 'check_violation',
              hint = '금칙어, 연락처, 링크가 들어간 글은 저장할 수 없습니다';
    end if;
  end loop;
  return new;
end;
$$;

-- ─────────────────────────────────────────────────────────────
-- 5. 트리거
-- ─────────────────────────────────────────────────────────────
create trigger reviews_banned_text_guard
  before insert or update of body on public.reviews
  for each row execute function private.reject_banned_text('body');

create trigger place_deals_banned_text_guard
  before insert or update of content on public.place_deals
  for each row execute function private.reject_banned_text('content');

create trigger review_reports_banned_text_guard
  before insert or update of note on public.review_reports
  for each row execute function private.reject_banned_text('note');

create trigger polls_banned_text_guard
  before insert or update of title on public.polls
  for each row execute function private.reject_banned_text('title');

-- insert는 검사하지 않는다(가입 트리거가 실패하면 로그인이 실패한다. 머리말 참고)
create trigger profiles_banned_text_guard
  before update of nickname on public.profiles
  for each row execute function private.reject_banned_text('nickname');

-- ─────────────────────────────────────────────────────────────
-- 6. 권한: 모두 비공개. 트리거만 부른다
-- ─────────────────────────────────────────────────────────────
revoke all on function private.banned_word_list(text) from public, anon, authenticated;
revoke all on function private.banned_words(text) from public, anon, authenticated;
revoke all on function private.mod_collapse(text) from public, anon, authenticated;
revoke all on function private.mod_base_text(text) from public, anon, authenticated;
revoke all on function private.mod_compose_jamo(text) from public, anon, authenticated;
revoke all on function private.mod_merge_stretch(text) from public, anon, authenticated;
revoke all on function private.mod_glue(text[]) from public, anon, authenticated;
revoke all on function private.mod_tokens(text) from public, anon, authenticated;
revoke all on function private.mod_strip_safe(text, text[]) from public, anon, authenticated;
revoke all on function private.mod_match_tokens(text[], text[], text[]) from public, anon, authenticated;
revoke all on function private.has_banned_word(text) from public, anon, authenticated;
revoke all on function private.has_contact_or_link(text) from public, anon, authenticated;
revoke all on function private.contains_banned_content(text) from public, anon, authenticated;
revoke all on function private.reject_banned_text() from public, anon, authenticated;
