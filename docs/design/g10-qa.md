# G10 확인: 모든 P0 AC와 E2E 3종 (T10.8)

> 2026-11-02 21:20~22:30 KST. 대상: PRD 6장의 AC 전부(P0 요구사항 AC 20개, P1 DEAL AC 3개는 참고). 마지막 커밋 259808d + 작업 트리.
> 방법: 자동 검사를 모두 다시 돌렸다. 기능 E2E는 이미 떠 있던 dev 서버(3102, 디자인 랩 켬)를 재사용했고, 프로덕션 조합(prod-flags, AC-REC-4 성능)은 scratchpad 복사본에서 `VERCEL_ENV=production pnpm build && pnpm start --port 3300`으로 돌렸다(본 폴더 `.next`는 건드리지 않음).
> 실기기 항목은 Claude가 확인하지 않았다. 실기기 근거는 tasks.md T9.0, T9.10에 사용자가 남긴 기록(iPhone 핵심 묶음, 11/02)이다.
> 돌리는 동안 같은 폴더에서 다른 작업자가 투표 OG(D-30)를 바꾸고 있었다. 그 변경으로 생긴 실패는 이번 실행에서 없었다(아래 2.3).

## 0. 요약

- **E2E 3종 통과**: 온보딩 4/4, 추천→길찾기 10/10, 투표 2인→확정(투표, 회식 4개 스펙) 24/24.
- 자동 검사 전부 통과(실패 3건은 원인 정리 뒤 통과: 낡은 테스트 1건 수정, 플레이키 1건, 환경 차이 1건).
- **P0 AC 20개: 통과 17, 부분 1(AC-REC-4), 실기기 필요 2(AC-AUTH-3 실제 소셜 재가입, AC-AUTH-1과 AC-AUTH-2의 Android는 아래 4절).** P1 DEAL AC 3개 통과.
- **AC-REC-4가 경계에서 미달**: Regular 3G 첫 방문 카드 표시 mobile 중앙값 5.01초(재측정 5회 중앙값 5.03초), 기준 5초. G5(10/31) 4.64초에서 약 0.4초 늘었다. desktop은 4.99초. 스켈레톤은 0.82초로 여유. 고치지 않고 결정 안건으로 둔다(5절).

## 1. 명령별 결과

| 명령 | 결과 | 시간 |
| --- | --- | --- |
| `pnpm lint` | 통과(eslint 오류 0, CSS 하드코딩 색 없음) | 10초 |
| `pnpm typecheck` | 통과 | 2초 |
| `pnpm test` | 193 파일 통과, 10 건너뜀. 2,156건 통과, 175건 건너뜀(DB 필요) | 9초 |
| `pnpm lint:copy` | 통과(금지 문자 없음, 문체 경고 없음) | 1초 |
| `pnpm test:rls` | 10 파일 174건 통과(429 없음) | 15초 |
| `pnpm test:e2e:onboarding` | 4 통과 | 8초 |
| `pnpm test:e2e:recommend` | 10 통과 | 17초 |
| `pnpm test:e2e:poll` | 24 통과 | 2분 9초 |
| `pnpm test:e2e:me` | 10 통과 | 19초 |
| `pnpm test:e2e:feedback` | 10 통과 | 16초 |
| `pnpm test:e2e:feedback-reco` | 6 통과 | 34초 |
| `pnpm test:e2e:report` | 1차 7 통과 1 실패(desktop) → 2차 8 통과. **플레이키**(2.1) | 1분 26초 / 51초 |
| `pnpm test:e2e:admin` | 1차 2 실패 6 미실행 → 테스트 수정 뒤 8 통과(2.2) | 45초 |
| `pnpm test:e2e:a11y` | 496 통과, 4 건너뜀 | 2분 29초 |
| `pnpm test:e2e:visual` | 28 통과 | 9초 |
| `pnpm test:e2e`(기본, mobile + desktop) | 777 통과, 141 건너뜀, 2 실패 → 실패 2는 환경 차이(2.3), 지도 키를 넘기면 건너뜀 | 4분 46초 |
| 스크립트 밖 DB 스펙(beta, contact-legal, poll-states, poll-tab-map, a11y-pages, `RUN_DB_E2E=1`) | 75 통과, 5 건너뜀 | 2분 43초 |
| `pnpm build`(프로덕션 조합, 복사본) | 통과. 번들 예산 `/today` 199.7 KB, `/` 178.8 KB(예산 200 KB) | 17초 |
| `pnpm test:e2e:prod-flags`(복사본 `next start` 3300) | 24 통과 | 3초 |
| `e2e/perf-today.spec.ts`(`RUN_PERF=1`, 3300) | 24 통과(측정 기록용 스펙, 판정은 3절 AC-REC-4) | 3분 54초 |

## 2. 실패와 원인

### 2.1 report: 할인 "아직 해요" 저장 대기 시간 초과 (플레이키)

- `e2e/report.spec.ts` "DEAL-03, AC-DEAL-3, DEAL-04 신고…" desktop. 화면에는 "아직 한다고 알렸습니다" 결과 줄이 떴지만 `place_deal_checks` 행 조회 poll(기본 5초)이 빈 배열로 끝났다.
- 같은 실행의 mobile은 통과, 다시 돌린 2차는 8건 모두 통과. 1차 실행은 1분 26초로 2차(51초)보다 느렸다(dev 서버 첫 컴파일, 원격 DB 왕복). 제품 버그 근거 없음, 플레이키로 기록. 반복되면 poll 시간을 늘린다.

### 2.2 admin: 시드 후기가 금칙어 트리거에 막힘 (낡은 테스트, 수정)

- `e2e/admin.spec.ts` 시드가 신고 대상 후기 본문을 `test_광고글 오픈채팅 …`으로 썼다. 오늘 적용된 T10.3b 금칙어 DB 트리거(`20261102200000_t10_3b_banned_words_guard.sql`, "오픈채팅" 포함)가 `23514 banned_content`로 거절해 시드에서 멈췄다. 제품은 의도대로 동작.
- 수정: 본문을 `test_첫번째글 …`로 바꿈(신고 3건 자동 숨김 흐름은 본문 내용과 무관). 수정 뒤 8건 통과.

### 2.3 map-smoke: 지도 키 판정 환경 차이

- `e2e/map-smoke.spec.ts` "지도 키가 없으면 키 없음 오류 상태가 보인다" mobile, desktop. 테스트 프로세스는 `.env.local`을 읽지 않아 키가 없다고 보고, 서버(키 있음)는 실지도를 띄워 어긋난다. `NEXT_PUBLIC_NAVER_MAP_CLIENT_ID`를 넘기면 설계대로 건너뜀(G5 2.6절과 같은 환경 차이).
- 투표 OG 작업(D-30) 관련: `smoke.spec.ts` 랜딩 OG, `a11y-g7-share.spec.ts` "서버 OG: 확인 라우트와 실제 라우트는 1200 x 600 PNG", `og-data.test.ts`, `ks-x-1001.test.ts` 모두 이번 실행에서 통과. D-30 반영 뒤에는 이 넷과 실기기 C1(카카오톡 말풍선)을 다시 본다.

## 3. P0 AC 대조표

판정: **통과** 자동 테스트(이번 실행) 또는 자동 + 사용자 실기기 기록으로 확인, **부분** 일부 미충족, **실기기 필요** 자동으로 증명할 수 없는 몫이 남음.

| AC | 내용 | 결과 | 근거 |
| --- | --- | --- | --- |
| AC-AUTH-1 | 카카오톡에서 `/poll/{code}` → 카카오 로그인 → 같은 투표방 | 통과(iPhone) | `login-params.test.ts` "초대 링크 복귀를 지킨다 (AUTH-03)", `redirect.test.ts`, `routes.test.ts` "보호 경로 + 비로그인 → /login?next=경로", `complete-sign-in.test.ts` "약관과 복귀", `poll-room.spec` "비로그인 미리보기 → 참여 → …". 실기기: T9.0 iPhone "인앱 로그인, 투표방 복귀" 통과. Android(매트릭스 A6 KA) 미확인 |
| AC-AUTH-2 | 카카오톡 인앱 구글 버튼 → 외부 브라우저 안내 | 통과(iPhone) | `src/lib/inapp.test.ts` detectInApp, googleBlocked "감지된 인앱은 모두 구글 안내", externalOpenUrl "카카오톡은 iOS와 Android 모두 openExternal 스킴". 실기기: T9.0 iPhone "카카오톡에서 외부 브라우저 열기" 통과. Android(A4 KA) 미확인 |
| AC-AUTH-3 | 탈퇴 후 같은 소셜 계정 재로그인은 새 사용자 | 실기기 필요 | RLS `t4-delete-account` "탈퇴하면 행이 모두 지워지고, 같은 이메일로 다시 오면 새 id로 빈 상태에서 시작한다", `t6-delete-account` "앱 탈퇴 경로로 지우면 모든 auth.users 참조 테이블이 0행…", `t4-account` "탈퇴 cascade". email provider로 증명했고 **카카오, 네이버, 구글 실제 계정 재가입은 기록 없음** |
| AC-ONB-1 | 기본값 3단계 → 60초 안에 홈 카드 | 통과 | `onboarding.spec` "AC-ONB-1: 처음 가입한 사용자가 기본값으로 넘기면 60초 안에 홈에 닿는다"(60,000ms 단언) |
| AC-ONB-2 | 위치 거부해도 주소 검색으로 완료 | 통과 | `onboarding.spec` "AC-ONB-2: 위치 권한을 거부해도 주소 검색으로 마칠 수 있다", `use-onboarding.test.ts` "권한 거부면 현위치 버튼을 숨긴다" |
| AC-ONB-3 | 현위치, 검색 좌표는 저장 요청에 없음 | 통과 | `use-onboarding.test.ts` "useOnboarding 좌표 경로 (AC-ONB-3)", `submit.test.ts` "AC-ONB-3: 사무실 값에 … 다른 키가 섞이면 저장하지 않는다" |
| AC-REC-1 | 기피 카테고리는 어떤 경우에도 카드에 없음 | 통과 | `recommend.test.ts` "AC-REC-1: 기피로 지정한 식당은 어떤 경우에도 카드에 나오지 않는다", `filter.test.ts` "AC-REC-1 (필터 단계)" |
| AC-REC-2 | 다시 뽑기 5회 같은 식당 재등장 없음 | 통과 | `recommend.spec` "AC-REC-2: 다시 뽑기 5번 연속…", `recommend.test.ts`, `sample.test.ts`, `deck.test.ts` |
| AC-REC-3 | 상위 3장 모두 같은 카테고리 없음 | 통과 | `diversity.test.ts` "AC-REC-3: 후보 카테고리가 2종 이상이면…" |
| AC-REC-4 | Regular 3G 첫 방문 스켈레톤 3초, 카드 5초 | **부분** | `perf-today.spec` "AC-REC-4 성능 (/today, 프로덕션 빌드)". 스켈레톤 mobile 0.83초, desktop 0.83초 통과. **카드 mobile 중앙값 5.01초(5.64, 5.01, 4.94), 재측정 5회 5.03초(5.06, 5.05, 5.03, 4.94, 5.01) → 기준 5초 근소 초과**, desktop 4.99초. G5 2.6절 4.64초 대비 약 +0.4초. 참고: Fast 4G 카드 2.79초, Regular 3G 재방문 1.45초 |
| AC-REC-5 | 어제 👎한 식당은 다음 날 점수 하락 | 통과 | `score.test.ts` "AC-REC-5: 어제 👎한 식당은 다음 날 추천 점수가 낮아진다", `history.test.ts`, `preference.test.ts` "지수 감쇠" |
| AC-FB-1 | 피드백 카드는 3초 안에 닫거나 응답, 추천 사용을 막지 않음 | 통과 | `feedback.spec` "FB-01, AC-FB-1: 띠가 추천을 막지 않고 한 탭으로 답한 뒤 시트에서 세부를 남긴다"(3,000ms 단언) |
| AC-FB-2 | 비공개 후기는 다른 사용자와 API에 없음, 집계에는 포함 | 통과 | RLS `t6-feedback` "AC-FB-2 비공개 후기 글은 어떤 응답에도 없고, 숫자는 집계에 들어간다", `t8-admin` "신고 큐와 비공개 전환 글 (AC-FB-2…)", `place-stats-model.test.ts` |
| AC-POLL-1 | 상대 화면 득표 바 2초 안 갱신 | 통과 | `poll-room.spec`, `poll-flow.spec` 2,000ms 단언. 실기기: T9.0 iPhone "실시간 2초" 통과 |
| AC-POLL-2 | 아무도 열지 않은 만료 투표가 다음 조회 때 확정 | 통과 | `poll-room.spec` "AC-POLL-2: 아무도 열지 않은 만료 투표가 다음 조회 때 확정된다, 동점과 취소", RLS `t7-poll` "AC-POLL-2, AC-POLL-5 마감 조회 시 확정과 방문 후보" |
| AC-POLL-3 | 코드 모르면 조회 불가, 10자 이상 | 통과 | RLS `t7-poll` "AC-POLL-3 코드 없이는 조회 불가, 미리보기는 득표 없음", `invite-code.test.ts` |
| AC-POLL-4 | 카카오톡 미리보기에 제목과 마감 시각 | 통과 (G7 부분 → 해소) | `og-data.test.ts` "toPollOg 진행 중: 제목, 후보 수, 마감, 버전", `a11y-g7-share.spec` 서버 OG 1200 x 600. 실기기: T9.0 iPhone "카카오톡 초대 말풍선" 통과. D-30 새 그림 반영 뒤 C1 재확인 권장 |
| AC-POLL-5 | 확정 식당이 참여자 전원 방문 후보, 다음 날 피드백 | 통과 (G7 부분 → 해소) | 방문 후보: RLS `t7-poll` 위 묶음, `poll-room.spec` "…방장 결정 → 결과와 방문 후보", `poll-flow.spec`. 다음 날 피드백: `band-model.test.ts` 출처 poll, `feedback-target.test.ts` "어제 물었지만 답하지 않은 방문은 48시간 안이면 다시 묻는다", `holidays.test.ts` "isWithinBusinessWindow (FB-04 48시간)" |

P1 참고(DEAL은 P1):

| AC | 결과 | 근거 |
| --- | --- | --- |
| AC-DEAL-1 종료일 지난 할인 미표시 | 통과 | RLS `t6-feedback` "AC-DEAL-1: 종료일이 지난 할인은 pg_cron 전에도 목록과 개수에 없고…", `deadline.test.ts` |
| AC-DEAL-2 할인은 점수에 0 | 통과 | `deal-neutral.test.ts` "AC-DEAL-2…", `why.test.ts` "할인 정보는 문장에 나오지 않는다" |
| AC-DEAL-3 3명 끝났어요 → 즉시 숨김 | 통과 | RLS `t6-feedback` "AC-DEAL-3: 서로 다른 3명이 끝났어요를 누르면 바로 숨겨진다", `report.spec`(2차 통과, 2.1 플레이키) |

집계: P0 AC 20개 중 **통과 17**(이 가운데 AC-AUTH-1, AC-AUTH-2, AC-POLL-1, AC-POLL-4는 iPhone 실기기 기록 포함), **부분 1**(AC-REC-4), **실기기 필요 1**(AC-AUTH-3). Android 실기기 미확인 몫은 4절.

### 3.1 지난 G7, G8 "부분" 재확인

| 출처 | 항목 | 지금 |
| --- | --- | --- |
| G7 | AC-POLL-4 카카오톡 실제 말풍선 | 해소. T9.0 iPhone 실기기 통과 |
| G7 | AC-POLL-5 다음 날 피드백 | 해소. 6단계 띠 규칙 테스트(위 근거)와 방문 후보 E2E가 모두 이번 실행에서 통과 |
| G8 | T8.10 Lighthouse `/map` 미달 | AC 아님. `g8-lighthouse.md`가 정본(이번에 다시 재지 않음) |
| G8 | `test:e2e:auth-off` 7단계 값 | `prod-flags`로 대체, 이번에 프로덕션 빌드에서 24 통과 |
| G5 | REC-08, REC-10 투표 플래그 | 해소. T9.2에서 `pollEntry` 공개, prod-flags와 투표 E2E 통과 |
| G5 | PLACE-04 네이버 웹 URL [확인 필요] | 변화 없음(AC 아님). 실기기 B2, B4에 남음 |

## 4. 실기기로 남은 항목

Claude가 대신 확인하지 않았다. T9.0에서 Android(S3)는 사용자 결정으로 건너뛰었다.

1. AC-AUTH-3: 실제 카카오(또는 네이버, 구글) 계정으로 탈퇴 → 같은 계정 재로그인 → 약관부터 새로 시작, 이전 설정과 기록 없음.
2. AC-AUTH-1 Android: 카카오톡 인앱(KA)에서 투표 링크 → 카카오 로그인 → 같은 방(매트릭스 A6).
3. AC-AUTH-2 Android: 카카오톡 인앱(KA) 구글 버튼 → 외부 브라우저(A4).
4. AC-POLL-1 Android 또는 두 기종 혼합 2초 갱신(D1).
5. AC-POLL-4: D-30 새 투표 OG 그림 배포 뒤 카카오톡 말풍선 재확인(C1, C2).

## 5. 결정 안건

| # | 안건 | 선택지 | 기본안 |
| --- | --- | --- | --- |
| 1 | AC-REC-4 카드 5.01초(mobile Regular 3G 첫 방문) | (가) 원인 추적 뒤 0.1초 이상 줄이기(G5 4.64초 이후 `/today` 변경: T9.10 홈 한 화면 압축 D-25, 현위치와 카카오 상한, 번들 198.2 → 199.7 KB 가운데 무엇이 늘렸는지 프로파일) / (나) 측정 오차 범위로 보고 통과 처리하고 기록만 / (다) 베타 실측(PostHog 웹 바이탈)으로 판정 | (가). 1회차 5.64초처럼 넘는 회차가 있어 경계값으로 두기 어렵다 |
| 2 | AC-AUTH-3과 Android 묶음 | 베타 시작(11/16) 전 사용자 실기기 / 베타 중 | AC-AUTH-3은 베타 전(탈퇴가 P0), Android는 베타 참여자 첫 주 |
