-- 서울에서 운영 주소 깨워 두기 (T10.9, 11/03 콜드 스타트 조사)
--
-- 왜
--   한국 사용자의 요청은 서울 엣지(icn1)에서 proxy 함수를 거친다. proxy는 사용자 가까운 지역에서 돌아(측정: 미국 러너가 부른
--   같은 화면의 첫 바이트 0.05초, 한국은 proxy 몫 약 40ms), GitHub Actions(미국)로 배포 뒤 깨워도 서울 proxy는 깨지 않았다.
--   배포 직후와 식은 뒤 한국 첫 요청은 첫 바이트만 1.0~1.5초였다. DB가 서울(ap-northeast-2)에 있으니 여기서 1분마다
--   /today를 불러 서울 proxy와 페이지 함수를 깨워 둔다.
--
-- 무엇을
--   - pg_net 확장(비동기 HTTP)을 켠다. 응답은 net._http_response에 남고 pg_net이 6시간 뒤 스스로 지운다.
--   - 07:00~21:59 KST(UTC 22:00~12:59) 매분 GET /today. 쿠키 없는 비로그인 요청이라 서버는 DB를 부르지 않고,
--     화면 JS를 실행하지 않으므로 분석 이벤트도 생기지 않는다. 하루 약 900회.
--   - 주소는 운영 주소(NEXT_PUBLIC_SITE_URL과 같은 값)다. SQL에서 환경변수를 읽을 수 없어 적어 둔다.
--     자체 도메인으로 바꾸면(T10.0) 같은 이름으로 cron.schedule을 다시 불러 덮어쓴다.
--   - 끄기: select cron.unschedule('lunchmate_keep_warm');
--
-- 데이터: 개인 정보, 카카오와 네이버 값, 좌표를 보내거나 저장하지 않는다. 새 테이블이 없어 RLS 대상이 없다.
-- 출처: Supabase 문서 "pg_net: Async Networking", "Cron"(cron.schedule 같은 이름이면 덮어씀)

create extension if not exists pg_net with schema extensions;

select cron.schedule(
  'lunchmate_keep_warm',
  '* 22-23,0-12 * * *',
  $$
  select net.http_get(
    url := 'https://lunchmate-kr.vercel.app/today',
    headers := jsonb_build_object('user-agent', 'lunchmate-warmup'),
    timeout_milliseconds := 10000
  );
  $$
);
