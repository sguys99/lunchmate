# G6 확인 (T6.30, T6.32, T6.33)

> 2026-11-01. 대상: 6단계 식후 피드백(FB), 나 탭 기록(HIS), 신고와 남용 방지(MOD, 관리자 화면 MOD-06 제외), 할인 정보(DEAL), 같은 단계에서 만든 식당 제보와 웨이팅(PLACE-05, PLACE-07, PLACE-08), 그리고 "피드백이 다음 추천에 반영".
> 방법: dev 서버 `http://localhost:3102`(디자인 랩 켬)에서 E2E, 같은 작업 트리에서 `pnpm build` 1회. DB가 필요한 스펙은 클라우드 개발 프로젝트에 `test_rls_` 사용자를 만들어 **한 작업자로 하나씩** 돌렸다(Auth 로그인 속도 제한). 끝난 뒤 `pnpm test:rls:cleanup --yes` → "지울 테스트 사용자가 없습니다".

## 0. 요약

- **G6 판정: 통과(관리자 화면과 실기기 항목 제외).** 6단계 범위 P0, P1 요구사항과 AC 30행 중 **통과 27, 부분 1, 범위 밖 2**(MOD-06 관리자 화면, DEAL-05 투표방 배지). 부분 1건은 MOD-05의 "투표방 생성 하루 10개"(투표방이 7단계)다.
- **피드백 → 다음 추천(T6.30)**: 새 스펙 `e2e/feedback-reco.spec.ts` 3건 x 2뷰포트 = **6건 통과**. 👎는 그 식당을 다음 묶음에서 빼고, 👍는 큰 카드로 올리며 이유 줄에 "최근 👍한 샐러드"가 붙고, "안 갔어요"는 부정 신호로 쓰지 않는다(반복 창 밖이면 묶음이 그대로, 어제 방문이면 반복 감점이 풀려 후보로 돌아온다).
- **재실행(T6.32)**: 지난번 테스트 사용자 로그인(Email provider 꺼짐)에서만 멈췄던 `me.spec` 10건, `report.spec` 8건 + PLACE-05 다크 2건 + 360 1건이 **모두 통과**. 제품 버그 없음. 나 탭 캡처 32장을 `docs/design/shots/2026-11-01/me-live__*.png`로 남겼다.
- 자동 검사 lint, typecheck, test(1784건), lint:copy(금지 문자 0), test:rls(99건), a11y(468건), build(`/today` 199.8 KB, 예산 통과) 모두 통과.
- **실기기 항목은 Claude가 확인하지 않았다**(9절). 카카오톡 인앱, iOS Safari에서 중첩 시트 스와이프, `field-sizing`, 길찾기.

## 1. 피드백 → 다음 추천 E2E (T6.30)

스펙 `e2e/feedback-reco.spec.ts`, 전제 단위 테스트 `src/features/rec/feedback-reco.test.ts`.

```bash
PLAYWRIGHT_BASE_URL=http://localhost:3102 pnpm test:e2e:feedback-reco   # RUN_DB_E2E=1, --workers=1을 스크립트가 켬
```

### 1.1 결정성을 만든 방법

- 카드 묶음은 `drawDeck(입력, seed)`이고 seed는 `today-store.randomSeed()` = `floor(Math.random() x 2^31)`이다. 앱에 테스트 훅을 두지 않고, 첫 스크립트에서 **호출 스택에 `randomSeed`가 있을 때만** `Math.random`이 상수를 돌려주게 해 seed를 고정했다. 다른 호출은 원래 난수를 쓴다(모든 호출을 상수로 두면 나 탭 답 저장이 멈춘다. 첫 시도에서 확인).
- 후보는 가짜 카카오 45곳(거리 30~500m, 업종 10종 순환), 설정은 기본값(점심 1만, 저녁 2만, 도보 10분)이라 입력이 매번 같다. 각 테스트는 **기준 묶음을 두 번 읽어 같음을 먼저 확인**한다(전제가 깨지면 여기서 바로 실패).
- seed 두 개(2^30 + 2, 2^30 + 5)는 엔진을 직접 돌려 골랐고, `feedback-reco.test.ts`가 점심과 저녁, 하루 다섯 시각에서 같은 결과임을 묶어 둔다(가중치나 가짜 후보를 바꾸면 이 테스트가 먼저 실패한다).
- 반영 경로: 나 탭 기록의 "○○, 다녀오셨나요?"(HIS-01 늦은 답, 14일)와 홈 어제 띠(FB-01). 홈 띠가 묻는 어제 방문은 이미 최근 3일 반복 감점(R = 1)으로 묶음 밖이라 👍와 👎가 그 식당의 순위로는 드러나지 않는다. 그래서 순위 변화는 반복 창 밖(4일 전) 방문의 늦은 답으로 보고, 띠는 "안 갔어요"로 본다.

### 1.2 결과

| 테스트 | 확인 내용 | mobile 390 | desktop 1280 |
| --- | --- | --- | --- |
| 나 탭 늦은 답: 안 갔어요는 묶음을 바꾸지 않고(FB-05), 👎 뒤에는 그곳이 첫 묶음에서 빠진다 | 4일 전 방문 2곳(테스트식당8 샐러드, 테스트식당4 양식), 답 없음. 기준 묶음에 테스트식당8 있음 → 테스트식당4 "안 갔어요"(`visits.status = not_visited`) → 다음 묶음이 기준과 **같음** → 테스트식당8 "별로였어요"(`reviews.rating = down`) → 다음 묶음에 **없음**, 다시 뽑기 뒤에도 없음. 엔진 기준: P 0.5 → 약 0.27, 점수 7위 → 17위(추첨은 상위 10곳)라 seed와 무관하게 빠진다 | 통과 | 통과 |
| 나 탭 늦은 답: 👍 뒤에는 그곳이 큰 카드로 올라오고 이유에 👍가 보인다 | 기준 묶음에 테스트식당8 없음 → "좋았어요"(`rating = up`) → 다음 묶음 **큰 카드가 테스트식당8**, 이유 줄 "최근 👍한 샐러드", "왜 추천했나요?"에 "최근 이 집에 👍를 남겼습니다." | 통과 | 통과 |
| 홈 띠: 어제 간 곳에 안 갔어요라고 답하면 반복 감점이 풀려 다음 묶음 후보로 돌아온다(FB-01, FB-05) | 어제 방문(답 없음)은 반복 감점으로 기준 묶음에 없음 → 띠 "안 갔어요" → 띠에 "추천 점수에는 쓰지 않습니다." → 다음 묶음에 테스트식당8 **있음**(기록 없는 사용자와 같은 점수, 👎처럼 내려가지 않음) | 통과 | 통과 |

- 결과: **6건 통과**(mobile 3, desktop 3), 전제 단위 테스트 10건 통과. 정리 확인 0명.
- 화면과 단언은 사용자 세션(RLS), secret 키는 방문일을 지난 날로 옮기는 준비에만 썼다(CLAUDE.md 7.1).

## 2. 재실행 (T6.32 남은 일)

| 스펙 | 변형 | 결과 | 캡처 |
| --- | --- | --- | --- |
| `e2e/me.spec.ts` | mobile 390, desktop 1280(각 5건: 설정과 화면 모드, 사무실, 예산과 기피와 땡겨요, 기록 3탭과 늦은 답, 빈 상태 360과 오프라인). 다크는 스펙 안에서(`me-dark`, `me-history-dark`), 360은 빈 상태와 오프라인 | **10건 통과** | `me-live__*` 32장(`ME_SHOTS_DIR`) |
| `e2e/report.spec.ts` | mobile, desktop 라이트(DEAL-01/02/04, DEAL-03 + AC-DEAL-3 + 할인 신고, PLACE-07, PLACE-05 + MOD-01) | **8건 통과**(DEAL-03 desktop 포함) | `report-live__*` 라이트 다시 찍음 |
| `e2e/report.spec.ts` PLACE-05 | `REPORT_DARK=1` mobile, desktop | **2건 통과** | `flag-review-hidden__390-dark`, `__1280-dark` 새로 생김 |
| `e2e/report.spec.ts` PLACE-05 | `REPORT_360=1` mobile | **1건 통과**(가로 넘침 0) | `flag-review-hidden__360-light` 새로 생김 |
| `e2e/feedback.spec.ts` | mobile, desktop 라이트 | **10건 통과** | 다크와 360 캡처는 같은 날 앞선 실행(`feedback-live__*` 65장) |

- 지난 실패 원인은 dev 프로젝트 Email provider가 꺼져 테스트 사용자 로그인이 안 된 것뿐이었다. 다시 켠 뒤 고칠 제품 버그는 없었다.
- `me.spec`의 캡처 이름을 6단계 다른 캡처와 같은 꼴(`me-live__<화면>__<프로젝트>.png`)로 바꿨다. `empty-360`, `offline-360`은 두 프로젝트 모두 360 x 780이라 같은 화면이다.
- 데스크톱 `fullPage` 캡처는 고정 하단 탭과 dev 배지가 긴 페이지 중간에 찍힌다(Playwright fullPage의 고정 요소 표시 방식, 실제 화면 문제 아님).

## 3. 자동 검사 결과

| 명령 | 결과 |
| --- | --- |
| `pnpm lint` | 통과 (CSS 하드코딩 색 없음, 9개 CSS 파일) |
| `pnpm typecheck` | 통과 |
| `pnpm test` | 통과, 154 파일 1784건 (5 파일 100건은 DB 필요라 건너뜀, 아래 test:rls) |
| `pnpm lint:copy` | 통과, 금지 문자 0 (512 파일). 문체 경고 2건은 5단계부터 있던 `landing.ts` 22%, `rec.ts` 22%(경고만) |
| `pnpm test:rls` | 5 파일 99건 통과 (오늘, AC-FB-2, AC-DEAL-1, AC-DEAL-3, 병합과 교체, 웨이팅 30분과 2분, 14일 경계, 한도, 탈퇴 cascade 포함) |
| `pnpm test:e2e:a11y` (3102, 디자인 랩 켬) | 468건 통과 (라이트와 다크, 390과 1280) |
| `pnpm test:e2e:feedback-reco` | 6건 통과 (1절) |
| `pnpm test:e2e:feedback` | 10건 통과 |
| `pnpm test:e2e:me` | 10건 통과 |
| `pnpm test:e2e:report` | 8건 + PLACE-05 다크 2건 + 360 1건 통과 |
| `pnpm build` | 통과 (postbuild 비밀값 검사, 번들 예산) |

## 4. 번들

| 라우트 | 첫 로드 JS (gzip) | 예산 | 비고 |
| --- | --- | --- | --- |
| `/today` | **199.8 KB** (19개 청크, raw 631.2 KB) | 200 KB | 여유 0.2 KB. bundle-log 마지막 값과 같음 |
| `/` | 178.0 KB | 200 KB | 같음 |
| `/map` | 297.3 KB | 참고값 | `node scripts/bundle-report.mjs --route /map`, 같음 |

- 6단계 홈 기능(어제 띠, 후기 시트, 제보 시트)은 모두 지연 로딩이다. 여유가 0.2 KB라 7단계 홈 변경은 첫 로드 감량을 먼저 해야 한다(8절).

## 5. AC 매트릭스 (FB, HIS, MOD, DEAL과 같은 단계 PLACE)

판정: 통과 = 자동 검사나 캡처로 확인, 부분 = 일부가 다른 단계, 범위 밖 = 다른 단계 작업.

| ID | 등급 | 내용(요약) | 판정 | 근거 |
| --- | --- | --- | --- | --- |
| FB-01 | P0 | 홈 머리 아래 한 줄 띠 👍/👎/안 갔어요, 답하면 고마움 줄, 길찾기 뒤 한 줄로 접힘 | 통과 | `feedback.spec` "FB-01, AC-FB-1", "D-11 안건 2", `band-model.test.ts`, 캡처 `feedback-live__home-*` |
| FB-02 | P0 | 한 탭 뒤 시트 한 장: 500원 스테퍼 + 칩 3, 태그 8종, 한 줄 100자, 서버 1천~10만 | 통과 | `feedback.spec`(시트 입력), `review-draft.test.ts`, RLS "범위 밖 가격, 목록 밖 태그, 100자" |
| FB-03 | P0 | 공개 토글(기본 공개) + 집계 고지 문장 늘 보임 | 통과 | `feedback.spec` 고지 문장, 390 x 844 스크롤 없이 고지까지(`expectNoticeAboveFold`) |
| FB-04 | P0 | 하루 1회, 영업일 48시간(주말, 공휴일 제외), 지나면 나 탭 14일 | 통과 | `feedback-target.test.ts`, `holidays.test.ts`, `feedback-requests.test.ts`, RLS "14일까지, 15일 거절" |
| FB-05 | P0 | 안 갔어요는 부정 신호가 아님 | 통과 | **`feedback-reco.spec` 1건, 3건**(묶음 그대로, 반복 감점 해제), `history.test.ts`, `score.test.ts` |
| FB-06 | P1 | 상세에서 직접 쓰기(한 탭 답 필수), 오늘 후기 쓰기 | 통과 | `feedback.spec` "FB-06, FB-07", "오늘 후기 쓰기", RLS "상세에서 쓴 후기: source detail" |
| FB-07 | P0 | 내 후기 항목 줄 4개 → 그 항목 시트, 삭제 확인 | 통과 | `feedback.spec` "FB-06, FB-07", `detail-reviews.test.tsx`, `me.spec` 후기 삭제 |
| AC-FB-1 | AC | 3초 안 응답 또는 닫기, 추천 사용을 막지 않음 | 통과 | `feedback.spec` 3초 측정, 띠 실패, 오프라인은 띠만 숨김 |
| AC-FB-2 | AC | 비공개 후기 글은 어떤 응답에도 없고 숫자는 집계에 | 통과 | RLS `t6-feedback` "AC-FB-2" 5건 |
| HIS-01 | P0 | 주 단위 기록, 확인 전 방문 14일 답, 답은 선호와 집계에 반영 | 통과 | `me.spec` "기록: 주 묶음, 이번 달 숫자, 늦은 답", **`feedback-reco.spec` 1, 2건**(늦은 답이 다음 추천에 반영), `history/model.test.ts` |
| HIS-02 | P0 | 즐겨찾기, 다시 안 갈 곳(해제 가능) | 통과 | `me.spec` 장소 탭 해제와 되돌리기, 캡처 `me-live__places__*` |
| HIS-03 | P0 | 내 후기 목록 | 통과 | `me.spec` 후기 탭(나만 보기 글 본인에게 보임), 캡처 `me-live__reviews__*` |
| MOD-01 | P0 | 후기 신고 5사유, 남의 후기 ⋯ 메뉴, 신고한 사람에게 바로 가림 | 통과 | `report.spec` "PLACE-05, MOD-01"(라이트, 다크, 360), RLS "review_reports" 4건 |
| MOD-02 | P0 | 3건 자동 숨김, 관리자 검토 대기 | 통과 | RLS "서로 다른 3명이 신고하면 숨겨져". 검토 화면은 MOD-06(8단계) |
| MOD-03 | P0 | 폐업 3명이면 추천 제외, 관리자 확인 | 통과 | RLS "문 닫았어요 서로 다른 3명이면 closed", `filter.test.ts` 하드 필터. 관리자 확인은 MOD-06 |
| MOD-04 | P0 | 금칙어 서버 검증 | 통과 | `moderation.test.ts`(정규화, 오탐), 후기, 할인, 신고 글, 닉네임 서버 적용. 첫 로그인 닉네임은 점심손님 NNNN 대체(T6.27) |
| MOD-05 | P0 | 후기 20, 투표방 생성 10, 신고+정보 제보 30 | **부분** | RLS "후기 하루 20건", "신고와 정보 제보는 합쳐 하루 30건". **투표방 생성 10은 7단계** |
| MOD-06 | P0 | 관리자 화면 | 범위 밖 | 8단계 |
| DEAL-01 | P1 | 제보 등록 5유형, 60자, 요일, 시간대, 종료일 7일(최대 30) | 통과 | `report.spec` "DEAL-01, DEAL-02, DEAL-04", RLS "등록은 함수로만", "30일 초과 거절", `flow.test.ts` |
| DEAL-02 | P1 | 카드 배지, 지도 마커 점, 상세 목록과 출처 배지, 안내 문구 | 통과 | `report.spec` 상세 목록과 배지, `card-model.test.ts`, 캡처 `map-deal-dot`(D-09 보강) |
| DEAL-03 | P1 | 아직 해요/끝났어요, 3명이면 숨김, 종료일 만료 | 통과 | `report.spec` "DEAL-03, AC-DEAL-3"(mobile, desktop), RLS "1인 1응답" |
| DEAL-04 | P1 | 하루 10건, 병합과 바꿔 넣기, 금칙어, 광고성/허위 사유 | 통과 | `report.spec` 중복 단계와 바꿔 넣기, RLS "병합", "superseded", "할인 제보 하루 10건", "할인 신고" |
| DEAL-05 | P1 | 투표방 후보 카드 배지 | 범위 밖 | 7단계(투표방) |
| AC-DEAL-1 | AC | 종료일 지난 할인은 어디에도 안 보임 | 통과 | RLS "AC-DEAL-1: pg_cron 전에도 목록과 개수에 없고", pg_cron 정리(T6.26) |
| AC-DEAL-2 | AC | 할인 유무와 무관한 같은 점수 | 통과 | `deal-neutral.test.ts` 4건(시드 50개, place_stats 할인 수까지) |
| AC-DEAL-3 | AC | 서로 다른 3명 끝났어요 → 즉시 숨김 | 통과 | `report.spec`(E2E), RLS "AC-DEAL-3" |
| PLACE-05 | P0 | 제보 3종, 칩과 숫자만, 하루 1회, 가격 숫자는 집계 제외 | 통과 | `report.spec` "PLACE-05, MOD-01"(라이트, 다크, 360), RLS "place_reports" 4건 |
| PLACE-07 | P1 | 웨이팅 한 탭, 30분 유효, 30분 1회, 2분 되돌리기, 그 자리 결과 줄 | 통과 | `report.spec` "PLACE-07", RLS "wait_reports" 5건 |
| PLACE-08 | P1 | 점심 피크 "줄 길어요" 감점 | 통과 | `score.test.ts` "웨이팅 W (PLACE-08)", `meal.test.ts` "isLunchPeak" 경계 |
| G6 | 게이트 | 피드백이 다음 추천에 반영 | 통과 | `feedback-reco.spec` 6건, `preference.test.ts`, `reshuffle.test.ts`(AC-REC-5) |
| 이벤트 | 10.2 | feedback_prompt_shown 외 7종 PRD 이름과 속성 | 통과 | `prd-events.test.ts`, `feedback.spec` stage tap/detail |

집계: 이벤트 행을 뺀 30행 중 **통과 27**(FB 7, AC-FB 2, HIS 3, MOD 4, DEAL 4, AC-DEAL 3, PLACE 3, G6 1), **부분 1**(MOD-05), **범위 밖 2**(MOD-06, DEAL-05). MOD-02, MOD-03의 "관리자 검토, 확인" 몫은 MOD-06에서 보므로 자동 숨김과 추천 제외만으로 통과로 판정했다.

## 6. 문구 비율과 4상태, 다크

### 6.1 문구 (`pnpm lint:copy`, 해요체 비율 허용 25~40%)

| 파일 | 해요체 | 비고 |
| --- | --- | --- |
| `feedback.ts` | 26% | |
| `history.ts` | 27% | |
| `report.ts` | 30% | |
| `moderation.ts` | 26% | |
| `place.ts` | 29% | 6단계에 상세 후기, 지금 행 문구 추가 |
| `badges.ts`, `badge-descriptions.ts` | 표본 부족 | 5문장 미만, 경고 제외 |
| `auth.ts` | 25% | |
| `legal.ts` | 0% | 약관은 습니다체 100% |
| `me.ts` | 27% | |
| 금지 문자(Em dash, en dash, 가로줄, 중간점) | 0 | 512 파일 |

### 6.2 4상태와 다크

| 화면 | 로딩 | 빈 상태 | 오류 | 오프라인 | 다크 | 근거(오늘 재실행) |
| --- | --- | --- | --- | --- | --- | --- |
| 홈 어제 띠 | 구현(빈 틀 64 + 본체 뼈대) | 구현(물을 방문 없으면 없음) | 구현(이름 실패 띠, 저장 실패 다시 보내기, 띠 데이터 실패는 띠만 숨김) | 구현(띠만 숨김) | 구현 | `feedback.spec` 10건, 캡처 `feedback-live__home-*` 라이트, 다크, 360 |
| 후기 시트 | 구현 | 구현(빈 시트, 남기기 비활성) | 구현 | 구현 | 구현 | `feedback.spec`, 캡처 `feedback-live__sheet-*` |
| 상세 후기 목록 | 구현 | 구현(`detail-empty`) | 구현 | 구현 | 구현 | `feedback.spec`, `detail-reviews.test.tsx`, 캡처 `feedback-live__detail-*` |
| 상세 지금 행과 할인 | 구현 | 구현(`detail-now-empty`) | 구현 | 구현 | 구현 | `report.spec` 8건, 캡처 `report-live__detail-*` |
| 제보/신고 시트 | 구현 | 해당 없음(질문 시트) | 구현(가격 범위 밖 등) | 구현 | 구현 | `report.spec` 라이트 8건 + PLACE-05 다크 2건, 360 1건 |
| 나 탭 기록/장소/후기 | 구현 | 구현(`me-live__empty-360`) | 구현 | 구현(`me-live__offline-360`) | 구현(`me-live__history-dark`) | `me.spec` 10건, `me-live__*` 32장 |
| 설정/화면 설정 | 구현 | 해당 없음 | 구현 | 구현 | 구현(`me-live__dark`) | `me.spec` "설정 화면, 화면 모드(첫 페인트 적용)" |

## 7. 6단계에서 정한 것

게이트 결정(design-decisions): **D-11** 식후 피드백 B 한 장 시트 + C 내 후기 항목 줄 + A 머리줄 ⋯ 신고, 무시한 띠는 길찾기 뒤 한 줄로 접힘. **D-12** 나 탭 A 기록 일지 + C 이번 달 숫자 3칸. **D-13** 제보 C 한 질문씩(할인 3단계) + B 그 자리 결과 줄 + C 끝났어요 점 3개.

구현 중 결정(사용자 결정 또는 기본안으로 진행):

| 결정 | 내용 | 작업 |
| --- | --- | --- |
| 금칙어 자체 목록 | 외부 서비스 없이 `src/lib/moderation` 193개 + 정규화, 걸린 낱말은 알리지 않음 | T6.17 |
| 영업일 48시간 | 주말, 공휴일(대체공휴일) 빼고 셈, 판정은 서버 액션 | T6.8 |
| 늦은 답 14일 | 띠가 묻지 않게 된 방문은 나 탭에서 방문 후 14일까지 | T6.9, T6.13 |
| 중복 할인 바꿔 넣기 | "다른 내용이라 새로 남기기"는 기존을 superseded로 숨기고 새 제보 | T6.22 |
| 신고와 정보 제보 합쳐 30 | 후기 신고, 할인 신고, PLACE-05 합산 하루 30 | T6.18 |
| 고지 "만족 여부" | 집계 고지 문장에 👍 대신 "만족 여부" | T6.9, T6.28 |
| 공개 후기는 로그인만 | `place_reviews`는 비로그인 호출 불가(닉네임 노출 기준) | T6.6 |
| 집계는 사람당 최신 하나 | 한 사람이 같은 식당에 여러 번 남겨도 최신 값 하나만 집계 | T6.6 |
| `visits.source` detail | 나 탭에서 연 상세의 길찾기와 후기 출처 | T6.5 |
| `feedback_submitted` stage | tap(한 탭) / detail(시트)로 지표 계산 분리 | T6.29 |
| 오늘 후기 쓰기 | 내 후기가 있어도 다시 다녀왔으면 새 후기 | FB-06 보강 |
| 지도 할인 점 | 지도 마커 오른쪽 위 점, 목록 `할인` 배지(D-09 보강) | T6.20 후속 |
| 신고자 탈퇴해도 숨김 유지 | 3건으로 숨긴 후기는 신고자가 탈퇴해도 숨김 유지 | T6.27 |
| 점심손님 NNNN | 첫 로그인 닉네임이 금칙어면 대체 | T6.27 |
| 점심 피크 11:00~13:30 유지 | 기존 `isLunchPeak` 그대로 | T6.25 |

## 8. 남은 일과 후속

- **홈 첫 로드 여유 0.2 KB**: 7단계에서 홈에 무엇이든 더하기 전에 첫 로드 감량이 먼저다.
- **집계 읽기 중복**: `src/features/rec/stats-source.ts`와 `src/features/place/stats-actions.ts`가 같은 place_stats 읽기를 두 곳에 둔다. 하나로 합칠 후보.
- **비로그인 "후기 N건"이 평가 수와 같다**: 비로그인은 `place_reviews`를 못 부르므로 place_stats의 👍👎 수를 후기 수로 보인다(글 없는 평가 포함).
- **폐업 제보는 누적**: 닫은 뒤 다시 연 식당을 풀어 주는 일은 관리자 화면(MOD-06, 8단계).
- **미해결 이름 문구 위치**: 이름을 못 찾은 항목 문구가 `history.ts`에 있는데 상세와 공용이라 `place.ts`로 옮길 후보.
- **지도 필터가 실제 집계를 쓴다**: 6단계 마무리에서 지도가 홈과 같은 place_stats 쿼리를 쓰게 됐다. 7단계 지도 작업 때 필터 기준(MAP-03)이 집계 값으로 맞는지 다시 본다.
- **T6.27 탈퇴 RLS**: `t6-delete-account.rls.test.ts`가 오늘 test:rls 99건에 포함되어 돌았는지 체크박스 전에 확인.
- **T6.30 seed**: 엔진 가중치나 가짜 후보를 바꾸면 `feedback-reco.test.ts`가 먼저 실패한다. 그때 seed를 다시 고른다.

## 9. 실기기 확인 필요 [실기기] (Claude가 확인하지 않음)

| 항목 | 기기 | 볼 것 |
| --- | --- | --- |
| 카카오톡 인앱 브라우저 | Android, iOS 카카오톡 | 홈 띠 한 탭, 후기 시트 열고 닫기, 제보 시트, 로그인 유지 |
| 중첩 시트 스와이프 | iOS Safari | 상세 시트 위에 후기 시트, 제보 시트를 연 상태에서 아래로 끌어 닫기, 뒤 시트가 같이 움직이지 않는지 |
| `field-sizing` | iOS Safari | 한 줄 후기, 할인 내용, 신고 기타 글 칸이 글자 수에 따라 늘어나는지(미지원이면 고정 높이로 보이는지) |
| 길찾기 | iOS Safari, Android Chrome, 카카오톡 인앱 | 나 탭에서 연 상세의 길찾기(출처 detail), 네이버 지도 앱 실행과 웹 폴백 |
