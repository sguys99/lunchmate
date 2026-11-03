-- T9.17 좋아하는 음식과 취향 띠 닫기 (D-39, PRD ONB-06, SET-06, REC 7장)
--
-- 1. preferences.liked_categories: 온보딩 넷째 단계와 나 탭에서 고르는 좋아하는 카테고리(최대 5, 술집 제외).
--    만료 없음. 추천은 P에 더하되 그 카테고리의 실제 👍👎이 쌓일수록 줄인다(앱 src/lib/reco).
-- 2. preferences.taste_prompt_dismissed_at: 홈 "못 먹는 음식이 있나요?" 띠를 닫은 시각. 한 번 닫으면 다시 보이지 않는다.
--    띠 노출 판정(가입 7일 안, 기피와 좋아하는 음식 둘 다 비어 있음)은 앱이 preferences.created_at으로 한다.
--
-- 규칙
-- - 기존 테이블의 열 추가라 RLS 정책은 그대로다(본인 행만 읽기, 수정). 열 단위 update 권한만 더한다.
-- - 중복 제거와 정렬은 트리거가 한다(craving_categories와 같은 방식). 검사 제약은 개수와 slug만 본다.
-- - 파괴적 변경 없음(열 추가, 기본값 있음).

alter table public.preferences
  add column liked_categories text[] not null default '{}',
  add column taste_prompt_dismissed_at timestamptz;

alter table public.preferences
  add constraint preferences_liked_slugs check (
    cardinality(liked_categories) <= 5
    and liked_categories <@ array[
      'hansik', 'jungsik', 'ilsik', 'yangsik', 'bunsik', 'gukbap',
      'gogi', 'asian', 'fastfood', 'salad', 'cafe'
    ]::text[]
  );

comment on column public.preferences.liked_categories is
  '좋아하는 카테고리(categories.ts slug, 최대 5, 술집 제외). 만료 없음. 추천 P 가산, 피드백이 쌓이면 줄임 (D-39)';
comment on column public.preferences.taste_prompt_dismissed_at is
  '홈 취향 띠를 닫은 시각. null이면 아직 닫지 않음 (D-39)';

-- 중복 제거와 정렬
create or replace function private.normalize_liked_categories()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if tg_op = 'INSERT' or new.liked_categories is distinct from old.liked_categories then
    new.liked_categories := array(
      select distinct c from unnest(new.liked_categories) as c order by c
    );
  end if;
  return new;
end;
$$;

create trigger preferences_normalize_liked
  before insert or update on public.preferences
  for each row execute function private.normalize_liked_categories();

grant update (liked_categories, taste_prompt_dismissed_at)
  on public.preferences to authenticated;
