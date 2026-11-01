-- T6.26 정리 작업(pg_cron) + T6.27 탈퇴 삭제 범위 점검 함수
-- PRD: PLACE-07(웨이팅 30분 유효), AC-DEAL-1(종료 할인 숨김), MOD-05, DEAL-04(일일 한도), 11.4절(탈퇴 삭제)
-- 앞 마이그레이션: 20261101120000_t6_5_reviews_reports_deals_waits.sql (규칙 10: 정리는 이 파일이 맡는다)
--
-- 출처 (2026-11-01 확인)
-- - Supabase Cron 설치: https://supabase.com/docs/guides/cron/install
--   대시보드(Integrations > Cron에서 pg_cron 켜기) 또는 SQL
--   "create extension pg_cron with schema pg_catalog; grant usage on schema cron to postgres;
--    grant all privileges on all tables in schema cron to postgres;". 요금제 제한 문구 없음.
-- - Supabase Cron 빠른 시작: https://supabase.com/docs/guides/cron/quickstart
--   같은 이름으로 cron.schedule을 다시 부르면 기존 작업을 덮어쓴다(upsert). 예시 시각은 GMT 기준.
--   cron.job_run_details는 자동으로 지워지지 않으니 정리 작업을 두라고 권한다.
--
-- 이 파일이 하는 일
-- 1. pg_cron을 켠다. 쓸 수 없는 프로젝트면 맨 앞에서 분명한 오류로 멈춘다(뒤의 어떤 것도 만들지 않는다).
-- 2. private 스키마에 정리 함수 4개(security definer, search_path 고정, 일반 역할 실행 권한 없음).
-- 3. 작업 4개를 매일 새벽 KST에 예약한다. 이름은 lunchmate_ 접두. 다시 적용해도 같은 상태(있으면 지우고 다시 예약).
--    pg_cron 시각은 GMT(UTC)로 해석한다. KST = UTC + 9.
--      lunchmate_purge_wait_reports   04:10 KST (19:10 UTC)  하루 지난 웨이팅 제보 삭제
--      lunchmate_expire_deals         04:15 KST (19:15 UTC)  종료일 지난 할인 status active → expired
--      lunchmate_purge_daily_usage    04:20 KST (19:20 UTC)  그제 이전 일일 한도 카운터 삭제
--      lunchmate_purge_cron_history   04:30 KST (19:30 UTC)  lunchmate_ 작업 실행 기록 14일 지난 것 삭제
--    정리 전에도 읽기 함수가 30분, 종료일을 직접 걸러서 지난 값은 응답에 나오지 않는다. 이 작업은 저장 공간 정리와
--    상태 값 정확도용이라 몇 시간 늦거나 하루 빠져도 화면 동작은 같다.
-- 4. T6.27: 탈퇴 뒤 남은 행을 세는 service_role 전용 함수 public.account_residue.
--
-- T6.27 탈퇴 삭제 범위 점검 결과 (스키마 변경 없음)
-- 6단계 테이블은 모두 user_id → auth.users on delete cascade라서 Auth Admin 삭제 한 번으로 지워진다.
--   reviews(공개, 비공개 모두. visits cascade로도 지워진다), review_reports(신고자로서), place_reports,
--   place_deals(작성), place_deal_checks, wait_reports, private.daily_usage.
-- 남의 행에 걸린 것
--   - 탈퇴자가 쓴 할인이 지워지면 거기 달린 남의 확인 응답과 신고도 deal_id cascade로 지워진다.
--   - 탈퇴자의 후기가 지워지면 거기 달린 남의 신고도 review_id cascade로 지워진다.
--   - 집계(place_stats, place_reviews, place_deals_list)는 그때그때 계산하므로 탈퇴자 값은 바로 빠진다(PRD 11.4 [확정]).
-- [제안] 신고자 탈퇴 시 이미 적용된 숨김은 그대로 둔다.
--   탈퇴자의 신고가 지워지면 남의 후기, 할인의 신고 수는 줄지만, 3명 기준으로 이미 숨긴 상태(hidden_at,
--   status hidden + hidden_reason reports)와 끝났어요 3명 숨김(ended_checks)은 되돌리지 않는다.
--   이유: 숨김은 그 시점의 판단이고, 자동 복원하면 신고 후 탈퇴를 반복해 숨김을 풀거나 문제 글을 다시 노출할 수 있다.
--   복원은 관리자 검토(MOD 관리자 화면, 2단계)에서만 한다. 그래서 이 파일은 트리거를 더하지 않는다.
--
-- 규칙: 이미 푸시된 파일은 고치지 않는다(CLAUDE.md 11장). 테이블을 새로 만들지 않으므로 RLS 정책 추가 없음.

-- ─────────────────────────────────────────────────────────────
-- 0. pg_cron 사전 확인 (실패하면 여기서 멈춘다)
-- ─────────────────────────────────────────────────────────────
do $$
begin
  if not exists (select 1 from pg_catalog.pg_available_extensions where name = 'pg_cron') then
    raise exception 'pg_cron extension is not available on this project'
      using hint = 'Supabase 대시보드 Integrations > Cron에서 pg_cron을 켠 뒤 다시 푸시하십시오 (T6.26)';
  end if;
end;
$$;

create extension if not exists pg_cron with schema pg_catalog;

grant usage on schema cron to postgres;
grant all privileges on all tables in schema cron to postgres;

-- ─────────────────────────────────────────────────────────────
-- 1. 정리 함수 (private, security definer, search_path 고정)
-- ─────────────────────────────────────────────────────────────

-- 하루 지난 웨이팅 제보 삭제 (PLACE-07). 읽기는 30분만 쓰고, 2분 되돌리기와 30분 재제보 판정도 하루 안의 행만 본다
create or replace function private.purge_stale_wait_reports()
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_count integer;
begin
  delete from public.wait_reports
   where created_at < now() - interval '1 day';
  get diagnostics v_count = row_count;
  return v_count;
end;
$$;

-- 종료일 지난 할인을 expired로 (AC-DEAL-1). ends_on은 KST 날짜이고 그날까지 유효하다.
-- 숨김(hidden) 행은 사유를 지키려고 건드리지 않는다. expired는 hidden_reason이 없어야 하므로(제약) active만 바꾼다
create or replace function private.expire_ended_deals()
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_count integer;
begin
  update public.place_deals
     set status = 'expired'
   where status = 'active'
     and ends_on < private.kst_today();
  get diagnostics v_count = row_count;
  return v_count;
end;
$$;

-- 지난 일일 한도 카운터 삭제 (MOD-05, DEAL-04). 오늘과 어제(KST)는 남긴다.
-- 한도는 오늘 행만 세므로 어제 행은 자정 직후 경계와 조사용 여유분이다
create or replace function private.purge_old_daily_usage()
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_count integer;
begin
  delete from private.daily_usage
   where kst_day < private.kst_today() - 1;
  get diagnostics v_count = row_count;
  return v_count;
end;
$$;

-- lunchmate_ 작업의 실행 기록만 14일 지나면 삭제(다른 작업 기록은 건드리지 않는다)
create or replace function private.purge_lunchmate_cron_history()
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_count integer;
begin
  delete from cron.job_run_details as d
   using cron.job as j
   where d.jobid = j.jobid
     and j.jobname like 'lunchmate\_%'
     and d.end_time < now() - interval '14 days';
  get diagnostics v_count = row_count;
  return v_count;
end;
$$;

revoke all on function private.purge_stale_wait_reports() from public, anon, authenticated;
revoke all on function private.expire_ended_deals() from public, anon, authenticated;
revoke all on function private.purge_old_daily_usage() from public, anon, authenticated;
revoke all on function private.purge_lunchmate_cron_history() from public, anon, authenticated;

-- ─────────────────────────────────────────────────────────────
-- 2. 작업 예약 (다시 적용해도 같은 상태: 같은 이름은 지우고 다시 만든다)
-- ─────────────────────────────────────────────────────────────
select cron.unschedule(j.jobid)
  from cron.job as j
 where j.jobname in (
   'lunchmate_purge_wait_reports',
   'lunchmate_expire_deals',
   'lunchmate_purge_daily_usage',
   'lunchmate_purge_cron_history'
 );

select cron.schedule('lunchmate_purge_wait_reports', '10 19 * * *',
  'select private.purge_stale_wait_reports()');
select cron.schedule('lunchmate_expire_deals', '15 19 * * *',
  'select private.expire_ended_deals()');
select cron.schedule('lunchmate_purge_daily_usage', '20 19 * * *',
  'select private.purge_old_daily_usage()');
select cron.schedule('lunchmate_purge_cron_history', '30 19 * * *',
  'select private.purge_lunchmate_cron_history()');

-- ─────────────────────────────────────────────────────────────
-- 3. T6.27 탈퇴 잔여 행 점검 (service_role 전용)
-- ─────────────────────────────────────────────────────────────
-- auth.users를 참조하는 public, private 스키마의 모든 외래 키를 카탈로그에서 찾아, 그 사용자 id로 남은 행 수와
-- 삭제 규칙을 돌려준다. 테이블 목록을 손으로 적지 않으므로 T7.29처럼 테이블이 늘어도 빠짐없이 센다(tasks S9).
-- RLS 테스트(t6-delete-account)가 앱 탈퇴 경로를 거친 뒤 모든 행이 0인지, 규칙이 cascade(또는 set null)인지 본다.
-- private.daily_usage는 Data API로 셀 수 없어 이 함수가 유일한 확인 길이다.
-- 사용자 세션과 비로그인은 부를 수 없다(남의 id로 활동 여부를 알아내지 못하게).
create or replace function public.account_residue(p_user_id uuid)
returns table (
  table_schema text,
  table_name   text,
  column_name  text,
  on_delete    text,
  remaining    bigint
)
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  r record;
begin
  for r in
    select n.nspname::text as sch,
           c.relname::text as tbl,
           a.attname::text as col,
           case con.confdeltype
             when 'c' then 'cascade'
             when 'n' then 'set null'
             when 'd' then 'set default'
             when 'r' then 'restrict'
             else 'no action'
           end as rule
      from pg_catalog.pg_constraint as con
      join pg_catalog.pg_class as c on c.oid = con.conrelid
      join pg_catalog.pg_namespace as n on n.oid = c.relnamespace
      join pg_catalog.pg_attribute as a
        on a.attrelid = con.conrelid and a.attnum = con.conkey[1]
     where con.contype = 'f'
       and con.confrelid = 'auth.users'::regclass
       and cardinality(con.conkey) = 1
       and n.nspname in ('public', 'private')
     order by 1, 2, 3
  loop
    table_schema := r.sch;
    table_name := r.tbl;
    column_name := r.col;
    on_delete := r.rule;
    execute format('select count(*) from %I.%I where %I = $1', r.sch, r.tbl, r.col)
      into remaining
      using p_user_id;
    return next;
  end loop;
end;
$$;

comment on function public.account_residue(uuid) is
  '탈퇴 점검(T6.27, PRD 11.4): auth.users 외래 키가 있는 모든 테이블의 남은 행 수와 삭제 규칙. service_role 전용';

revoke all on function public.account_residue(uuid) from public, anon, authenticated;
grant execute on function public.account_residue(uuid) to service_role;
