# 모니터링 구성 (T8.16)

> PostHog 대시보드(PRD 2.3절 성공 지표, tasks T9.6, T9.7)와 Sentry 알림 규칙, 두 서비스의 개인정보 관련 콘솔 설정을 정리한다.
> 작성 2026-11-01. 대시보드와 알림은 콘솔에서 사용자가 만든다(5장, 6장 번호 단계). API 자동 구성은 7장 제안.
>
> 정본: 지표 정의는 `docs/prd.md` 2.3절, 이벤트 이름과 속성은 10.2절, 데이터 규칙은 `CLAUDE.md` 7장.
> 이벤트 타입은 `src/lib/analytics/events.ts`, 전송 필터는 `posthog.ts`(before_send), `sentry-options.ts`, `scrub.ts`.

## 0. 먼저 알아 둘 전제

| 항목 | 현재 구현 | 지표에 주는 영향 |
| --- | --- | --- |
| 사용자 식별 | `posthog.identify` 없음, `person_profiles: "identified_only"`. 서버 이벤트는 `$process_person_profile: false` | 모든 이벤트가 **익명 이벤트**다. "사용자"는 기기(브라우저)별 무작위 id다. 같은 사람이 폰과 PC를 쓰면 두 명으로 센다. 개인정보 처리방침 초안(T8.14)도 "기기별 무작위 식별자"로 적었으므로 의도된 설계다 |
| 익명 이벤트로 되는 것 | Trends, Funnels, Retention, SQL 인사이트 | 이 문서의 인사이트는 전부 이 네 종류만 쓴다 |
| 익명 이벤트로 안 되는 것 | Lifecycle, 코호트, 사람 속성 필터 | W4 리텐션은 Retention 인사이트(기기 기준)로 본다 |
| 세션 | posthog-js가 브라우저 이벤트마다 `$session_id`를 붙인다(30분 무활동이면 새 세션) | "세션당" 지표는 `$session_id`로 묶는다. 서버 이벤트(`login_started`, `login_completed`)에는 세션이 없다 |
| 페이지뷰 | 자동 수집 끔. `(app)` 레이아웃과 `/welcome/*` 레이아웃이 `$pageview`를 보내며 `$current_url`은 `origin + 경로`(쿼리 없음, `/poll/<코드>`는 `/poll/[code]`) | 홈 진입은 `$current_url`이 `/today`로 끝나는 `$pageview` |
| 시간대 | PostHog 프로젝트 시간대 기본값은 UTC | **콘솔에서 Asia/Seoul로 바꾼다**(5.1). 그래야 "하루", "주"가 KST 기준이 된다 |
| 테스트 계정 | `test_` 닉네임 계정은 이벤트에 닉네임이 없어 구분되지 않는다 | 내부 트래픽 필터(5.1의 4)로 localhost를 빼고, 프로덕션에서 테스트하는 개발자 기기는 PostHog 사람 목록 대신 기간을 메모해 두고 해석에서 감안한다(익명 id라 기기 제외 필터를 걸기 어렵다) |

## 1. 이벤트 발화 대조 (코드 grep, 2026-11-01)

PRD 10.2절 25개 이벤트 모두 `track()` 호출부가 있다(테스트 파일과 `src/lib/analytics` 제외).

| 이벤트 | 발화 위치 | 비고 |
| --- | --- | --- |
| `onboarding_step_completed` | `features/onboarding/onboarding-screen.tsx` (단계는 `use-onboarding.ts`) | step 3은 "마치기"를 누른 순간이다(저장 성공 전). 저장 실패율은 Sentry로 본다 |
| `recommendation_shown` | `features/rec/events.ts` | 같은 묶음은 한 번만(`firstShow`). `algo_version` 포함 |
| `recommendation_reshuffled` | `features/rec/events.ts` | `count_in_session` |
| `card_swiped` | `features/rec/events.ts` | D1 배치라 "대안을 큰 카드로 올림"에 보냄 |
| `directions_clicked` | `features/place/directions-flow.ts` | source rec/map/poll/detail |
| `feedback_submitted` | `feedback-band.tsx`, `review-sheet-drawer.tsx`, `me/history/history-panel.tsx` | 나 탭 늦은 답도 stage=tap |
| `feedback_prompt_shown` | `feedback/feedback-band.tsx` | 그날 처음 물을 때 한 번 |
| `poll_created` | `poll/create/create-drawer.tsx` | |
| `poll_link_shared` | `poll/share/share-invite.ts` | |
| `poll_invite_opened` | `poll/room/poll-entry.tsx` | 참여자가 아닌 사람이 열 때 한 번 |
| `poll_voted` | `poll/room/use-poll-room.ts` | is_first_vote |
| `poll_closed` | `use-poll-room.ts`, `poll/tab/poll-tab.tsx`(서버 claim으로 방마다 한 번), `create-drawer.tsx`(보내기 전 취소, reason `canceled`) | reason 값은 2.5 참고 |
| `poll_candidate_added` | `use-poll-room.ts`, `create-drawer.tsx` | |
| `poll_result_shared` | `poll/share/result-share-sheet.tsx` | |
| `party_searched` | `features/party/events.ts` | |
| `report_submitted`, `deal_reported` | `report/report-sheet-drawer.tsx` | |
| `wait_reported`, `deal_viewed` | `report/now-panel.tsx` | |
| `deal_checked` | `now-panel.tsx`, `report-sheet-drawer.tsx` | |
| `just_pick_clicked` | `features/rec/events.ts` | |
| `favorite_added` | `place/detail/use-place-actions.ts` | 홈 더 보기도 같은 훅(source rec) |
| `login_started` | `app/auth/sign-in/route.ts` (서버 캡처 API) | `in_app_browser` 포함 |
| `login_completed` | `app/auth/callback/route.ts` (서버 캡처 API) | 같은 익명 id(`lm_aid` 쿠키)로 시작과 이어짐 |
| `place_names_resolved` | `me/history/use-record-names.ts`, `poll/room/use-candidate-places.ts` | 운영 지표(이름 해석 실패율) |

### 1.1 지표별 계산 가능 여부

| 지표 (2.3절, T9.6, T9.7) | 필요한 이벤트 | 판정 |
| --- | --- | --- |
| North Star: 주간 결정 수 | `directions_clicked`, `poll_closed`, `feedback_submitted` | 가능 |
| 추천 수락률 | `recommendation_shown`, `directions_clicked`, `favorite_added`, `poll_candidate_added` | 가능 |
| 결정 소요 시간 | `$pageview`(/today), `directions_clicked` | 가능 |
| 다시 뽑기 횟수 | `recommendation_shown`, `recommendation_reshuffled` | 가능 |
| 피드백 응답률 | `feedback_prompt_shown`, `feedback_submitted` | 가능 |
| 투표 완료율 | `poll_created`, `poll_closed` | 가능(방 id가 이벤트에 없어 기간 합계 비율. 2.5) |
| 투표 초대 전환율 | `poll_invite_opened`, `login_completed`, `poll_voted` | 가능, 단 기기 이어짐 주의(2.6) |
| 온보딩 완료율 | `$pageview`(/welcome/terms), `onboarding_step_completed` | **이번 작업으로 가능해짐**(3장 수정 1). 그 전에는 `/welcome`에 페이지뷰가 없어 시작점이 없었고, 온보딩 도중 떠난 사람의 이벤트가 큐에서 사라졌다 |
| 인앱 로그인 전환율 (T9.7) | `login_started`, `login_completed` (in_app_browser) | 가능(서버 이벤트끼리 같은 id) |
| W4 리텐션 | 아무 이벤트 | 가능, 기기 기준(0장) |
| 가격, 태그, 후기 입력률 (10.2 보조) | `feedback_submitted` stage=detail | 가능 |

빠진 이벤트는 없다. 남은 한계는 2.6(초대 퍼널의 기기 이어짐)과 0장(기기 기준 사용자)이다.

## 2. PostHog 인사이트 정의

공통: 기간 기본 "최근 7일", 날짜 단위 Day(베타 매일 확인 T9.6), 필터 "Filter out internal and test users" 켬.
화면 조작이 헷갈리면 같은 내용을 SQL 인사이트로 만든다(각 항목의 SQL은 PostHog SQL 편집기(HogQL)에 그대로 붙인다).

### 2.1 North Star: 주간 결정 수 / 활성 사용자

- 종류: Trends, 단위 Week, 차트 Line, 목표선 2.0
- 시리즈
  - A `directions_clicked`, Total count
  - B `poll_closed`, Total count, 필터 `reason` is one of `deadline, host, tie_host, tie_roulette, tie_auto`(확정만, 취소 제외)
  - C `feedback_submitted`, Total count, 필터 `stage = tap`, `rating` is one of `up, down`("안 갔어요" 제외)
  - D `recommendation_shown`, Unique users (활성 사용자 정의: 그 주에 추천을 한 번 이상 본 기기)
- 수식: `(A + B + C) / D`
- 주의: B는 방마다 한 번(서버 claim)이라 "확정된 투표방 수"다. 참여자 수만큼 세고 싶으면 `participant_count` 합(Property value sum)으로 바꾼다. 기본안은 방 수.

### 2.2 추천 수락률 (목표 30% 이상)

정의: `recommendation_shown`이 있는 세션 중 `directions_clicked`, `favorite_added`, `poll_candidate_added`(모두 source=rec)가 하나라도 있는 세션 비율.
PRD 10.2 문장은 source=rec를 마지막 이벤트에만 붙여 읽을 수도 있다. 기본안은 세 이벤트 모두 source=rec(추천 카드에서 나온 행동만)이고, 지도에서 고른 길찾기까지 넣으려면 아래 SQL의 첫 조건에서 source 필터를 뺀다.

- 종류: SQL 인사이트, 차트 Line(일별)

```sql
SELECT day,
       round(countIf(accepted) / count(), 3) AS acceptance_rate,
       count() AS rec_sessions
FROM (
  SELECT toDate(timestamp) AS day,
         properties.$session_id AS sid,
         max(event = 'recommendation_shown') AS shown,
         max(event IN ('directions_clicked', 'favorite_added', 'poll_candidate_added')
             AND properties.source = 'rec') AS accepted
  FROM events
  WHERE timestamp >= now() - INTERVAL 14 DAY
    AND event IN ('recommendation_shown', 'directions_clicked', 'favorite_added', 'poll_candidate_added')
    AND properties.$session_id IS NOT NULL
  GROUP BY day, sid
)
WHERE shown
GROUP BY day
ORDER BY day
```

- 화면 방식 대안: Funnels, 단계 1 `recommendation_shown` → 단계 2 `directions_clicked`(source=rec) 또는 같은 단계에 `favorite_added`, `poll_candidate_added`를 "OR"로 추가, Aggregating by `Unique sessions`(지원하지 않는 화면이면 SQL 사용), 전환 창 30분.

### 2.3 결정 소요 시간 (중앙값 20초 이하)

정의: 세션에서 처음 홈(`/today`) 페이지뷰부터 처음 `directions_clicked`(source=rec)까지 초. 30분을 넘는 세션은 결정이 아닌 재방문으로 보고 뺀다.

- 종류: SQL 인사이트, 차트 Line(일별 중앙값), 목표선 20

```sql
SELECT day,
       quantile(0.5)(sec) AS median_sec,
       quantile(0.9)(sec) AS p90_sec,
       count() AS sessions
FROM (
  SELECT toDate(min(timestamp)) AS day,
         minIf(timestamp, event = '$pageview' AND properties.$current_url LIKE '%/today') AS t_home,
         minIf(timestamp, event = 'directions_clicked' AND properties.source = 'rec') AS t_dir,
         dateDiff('second', t_home, t_dir) AS sec
  FROM events
  WHERE timestamp >= now() - INTERVAL 14 DAY
    AND event IN ('$pageview', 'directions_clicked')
    AND properties.$session_id IS NOT NULL
  GROUP BY properties.$session_id
)
WHERE t_home > toDateTime('2020-01-01') AND t_dir >= t_home AND sec <= 1800
GROUP BY day
ORDER BY day
```

- 화면 방식 대안: Funnels, `$pageview`(Current URL ends with `/today`) → `directions_clicked`(source=rec), Funnel type "Time to convert", 전환 창 30분. 화면에 평균과 분포가 나오며 중앙값은 분포에서 읽는다.
- 주의: PostHog 로딩 전(첫 상호작용이나 유휴 시점) 이벤트는 큐에 쌓였다가 보내지지만 `timestamp`는 posthog-js가 큐를 비울 때 찍힌다. 홈 페이지뷰가 실제보다 늦게 찍혀 소요 시간이 짧게 나올 수 있다. 베타 첫날 개발자 기기로 스톱워치와 한 번 대조한다. 차이가 크면 `track()`에서 `timestamp`를 넘기도록 고친다(작은 수정, 미구현).

### 2.4 다시 뽑기 횟수 (결정 세션당 평균 2회 이하)

- 종류: SQL 인사이트, 차트 Line

```sql
SELECT day, round(avg(reshuffles), 2) AS avg_reshuffles, count() AS sessions
FROM (
  SELECT toDate(min(timestamp)) AS day,
         countIf(event = 'recommendation_reshuffled') AS reshuffles,
         countIf(event = 'recommendation_shown') AS shown
  FROM events
  WHERE timestamp >= now() - INTERVAL 14 DAY
    AND event IN ('recommendation_shown', 'recommendation_reshuffled')
    AND properties.$session_id IS NOT NULL
  GROUP BY properties.$session_id
)
WHERE shown > 0
GROUP BY day
ORDER BY day
```

- 화면 방식 대안: Trends, A `recommendation_reshuffled` Total count, B `recommendation_shown` Unique sessions, 수식 `A / B`.

### 2.5 투표 완료율 (60% 이상)

`poll_closed.reason` 값(`claim_poll_closed_report`, `create-drawer.tsx`):

| reason | 뜻 | 완료로 셈 |
| --- | --- | --- |
| `deadline` | 마감 시각 도래(크론 포함) | 예 |
| `host` | 방장이 마감 | 예 |
| `tie_host`, `tie_roulette`, `tie_auto` | 동점을 방장 선택, 룰렛, 30분 자동으로 해결 | 예 |
| `cancel`, `host_left` | 방장 취소, 방장 탈퇴 | 아니오 |
| `canceled` | 링크를 보내기 전 "만들기 취소"(방이 지워짐) | 분모에서 뺀다 |

- 종류: Trends, 단위 Week(방이 24시간 안에 끝나므로 일 단위는 흔들림이 크다), 차트 Bar
- 시리즈: A `poll_closed`(reason is one of deadline, host, tie_host, tie_roulette, tie_auto) Total count, B `poll_created` Total count, C `poll_closed`(reason = canceled) Total count
- 수식: `A / (B - C)`
- 한계: 이벤트에 방 id가 없어 같은 방끼리 잇지 않고 기간 합계로 나눈다. 아무도 다시 열지 않은 방은 `poll_closed`가 빠질 수 있다(T7.30 주석). 정확한 값은 DB에서 `select status, closed_reason, count(*) from polls where created_at > now() - interval '7 days' group by 1, 2`로 대조한다(Supabase SQL 편집기, 읽기만).

### 2.6 투표 초대 전환율 (50% 이상)

- 종류: Funnels, 전환 창 1시간, Aggregating by Unique users
  1. `poll_invite_opened`, 필터 `logged_in = false`
  2. `login_completed`
  3. `poll_voted`, 필터 `is_first_vote = true`
- Breakdown: `in_app_browser`(1단계 속성)
- 보조 퍼널: `poll_invite_opened`(전체) → `poll_voted`(is_first_vote=true). 이미 로그인한 사람까지 포함한 "링크 연 사람 중 투표한 비율".
- 주의: 세 단계가 같은 익명 id여야 이어진다. `login_started`는 브라우저 PostHog 쿠키를 읽어 같은 id를 쓰지만, 카카오톡 인앱에서 구글 로그인을 외부 브라우저로 넘기면(AUTH-04) 다른 기기 취급이 된다. 베타 첫날 테스트 계정으로 인앱 1회, 일반 브라우저 1회 실제로 따라가 퍼널에 이어지는지 확인한다(실기기 필요).

### 2.7 피드백 응답률 (40% 이상)

- 종류: Trends, 단위 Day, 차트 Line, 목표선 0.4
- A `feedback_submitted`, 필터 `stage = tap`, Total count / B `feedback_prompt_shown`, Total count / 수식 `A / B`
- Breakdown 보조: B의 `visit_source`(rec/poll/map/detail)로 나눠 보려면 A와 B를 따로 차트에 둔다(A에는 visit_source가 없다).
- 보조(10.2): 세부 입력률 = `feedback_submitted`(stage=detail) 중 `has_price = true` 비율, `tag_count > 0` 비율, `has_review = true` 비율.

### 2.8 온보딩 완료율 (80% 이상)

첫 로그인은 반드시 약관 화면(`/welcome/terms`)을 지나므로 이를 시작점으로 쓴다.

- 종류: Funnels, 전환 창 1일, Aggregating by Unique users
  1. `$pageview`, Current URL ends with `/welcome/terms`
  2. `$pageview`, Current URL ends with `/welcome/onboarding`
  3. `onboarding_step_completed`, `step = 1`
  4. `onboarding_step_completed`, `step = 3`
- 완료율 = 4단계 / 1단계. 단계별 이탈이 2, 3에서 크면 약관, 사무실 핀이 문제다.
- 보조: `onboarding_step_completed`를 `step`, `skipped`로 Breakdown한 Trends(건너뛰기 비율, ONB-04).
- 3장 수정 1 배포 이후 데이터부터 유효하다.

### 2.9 인앱 브라우저 로그인 전환율 (T9.7, 50% 미만이면 게스트 투표 재검토)

- 종류: Funnels, 전환 창 15분
  1. `login_started`, 필터 `in_app_browser = true`
  2. `login_completed`
- Breakdown: `provider`(kakao/google/naver)
- 비교용으로 `in_app_browser = false` 퍼널을 같은 대시보드에 하나 더 둔다.

### 2.10 W4 리텐션 (30% 이상)

- 종류: Retention, 기준 이벤트 `recommendation_shown`(First time), 재방문 이벤트 `recommendation_shown`, 기간 Week, 8주
- 읽는 값: Week 4 열. 기기 기준이다(0장).

### 2.11 `algo_version` 비교 (T9.8)

- 현재 값: `src/lib/reco/version.ts`의 `ALGO_VERSION`(`2026-11-01.1`). 가중치를 바꿀 때마다 올린다.
- `recommendation_shown`에만 `algo_version`이 있으므로 세션 단위로 버전을 붙여 비교한다.

```sql
SELECT version,
       count() AS rec_sessions,
       round(countIf(accepted) / count(), 3) AS acceptance_rate,
       round(avg(reshuffles), 2) AS avg_reshuffles
FROM (
  SELECT properties.$session_id AS sid,
         argMinIf(properties.algo_version, timestamp, event = 'recommendation_shown') AS version,
         max(event = 'recommendation_shown') AS shown,
         max(event IN ('directions_clicked', 'favorite_added', 'poll_candidate_added')
             AND properties.source = 'rec') AS accepted,
         countIf(event = 'recommendation_reshuffled') AS reshuffles
  FROM events
  WHERE timestamp >= now() - INTERVAL 28 DAY
    AND event IN ('recommendation_shown', 'recommendation_reshuffled', 'directions_clicked',
                  'favorite_added', 'poll_candidate_added')
    AND properties.$session_id IS NOT NULL
  GROUP BY sid
)
WHERE shown
GROUP BY version
ORDER BY version
```

- 해석 규칙: 버전마다 추천 세션 200개 이상 모인 뒤 비교한다(베타 20명이면 1~2주). 버전 전환일 앞뒤 요일 효과(월요일, 금요일)가 섞이므로 같은 요일 수를 맞춰 본다. 무작위 배정(A/B)은 하지 않는다(MVP는 순차 비교).
- 화면 방식 대안: 2.2 퍼널에 Breakdown `algo_version`(1단계 속성).

### 2.12 운영 보조 인사이트 (선택)

| 인사이트 | 정의 | 용도 |
| --- | --- | --- |
| 이름 해석 실패율 | `place_names_resolved`의 `sum(unresolved) / sum(total)`, `screen` Breakdown | 카카오 FD6 매칭 실패 감시(T5.12a) |
| 그냥 골라 줘 비율 | `just_pick_clicked` / `recommendation_shown` 세션 | 카드 3장이 결정을 돕는지 |
| 공유 채널 | `poll_link_shared`, `poll_result_shared`를 `channel` Breakdown | 카카오톡 공유 의존도 |

## 3. 이번 작업의 코드 수정

1. **`/welcome` 레이아웃에 분석 시작과 페이지뷰 추가** (`src/app/welcome/layout.tsx`, 테스트 `layout.test.tsx`)
   - 문제: 약관과 온보딩은 `(app)` 레이아웃 밖이라 `AnalyticsPageviews`가 없었다. PostHog가 초기화되지 않아 `onboarding_step_completed`는 큐에만 쌓였다. 온보딩을 마치고 `/today`로 가면 그때 보내지지만, **도중에 떠난 사람의 이벤트는 사라져** 완료율이 실제보다 높게 나왔다. 퍼널 시작점(첫 로그인) 페이지뷰도 없었다.
   - 수정: `(app)` 레이아웃과 같은 `AnalyticsPageviews`를 `src/app/welcome/layout.tsx`에 둔다. PostHog는 여전히 첫 상호작용이나 유휴 시점에 동적 import되어 첫 렌더 비용이 늘지 않는다. 페이지뷰는 경로만 보내므로 `?next=` 쿼리는 나가지 않는다.
2. **Sentry 소음 필터** (`src/lib/analytics/sentry-options.ts`, 테스트 `sentry-options.test.ts`)
   - `ignoreErrors`: ResizeObserver 경고 두 문장만. `denyUrls`: 브라우저 확장 프로그램 스킴(chrome, moz, safari, safari-web, ms-browser). 앱 오류(TypeError, ChunkLoadError)는 거르지 않는 것을 테스트로 고정했다.

좌표 필터 확인 결과(수정 불필요):

| 경로 | 필터 | 위치 |
| --- | --- | --- |
| Sentry 오류 이벤트 | `beforeSend` → `scrubCoordinates`(request url, query_string, data, headers, extra, contexts, tags, transaction, 브레드크럼, 예외 메시지) | `sentry-options.ts`, 테스트 있음 |
| Sentry 브레드크럼 | `beforeBreadcrumb`(fetch url, navigation from/to, console) | 같음 |
| Sentry span | `beforeSendSpan`(url.full, url.query) | 같음 |
| Sentry IP, 쿠키 | `dataCollection`(`SENTRY_DATA_COLLECTION`: userInfo, 쿠키, 본문 끔, 요청 헤더는 User-Agent만, T10.10. SDK 11에서 `sendDefaultPii`는 무효) | 같음 |
| 세 런타임 | 브라우저(`sentry-client.ts`), Node(`sentry.server.config.ts`), Edge(`sentry.edge.config.ts`) 모두 `sentryBaseOptions` 사용 | |
| PostHog 모든 이벤트 | `before_send` → 좌표 스크럽, 요소 정보 제거, `$geoip_disable` | `posthog.ts` |
| PostHog 이벤트 속성 | 타입(금지 키 never) + `sanitizeEventProperties` | `events.ts` |
| PostHog 서버 이벤트 | `sanitizeEventProperties`, `$geoip_disable`, `$process_person_profile: false` | `server-capture.ts` |
| 페이지뷰 | 쿼리 제거, 초대 코드 가림 | `pageview.ts` |

## 4. 개인정보 관련 콘솔 설정 (T8.14 [확인 필요] 해소용)

| 항목 | 설정 위치 | 할 일 | 처리방침에 적을 값 |
| --- | --- | --- | --- |
| PostHog IP 폐기 | Settings > Project > General > **IP data capture configuration** | "Discard client IP data" 켬. SDK 옵션으로는 못 막는다(T0.35) | "IP 주소는 저장하지 않음" |
| PostHog 조직 기본값 | Settings > Organization > General > IP data capture default | 폐기로 둠(새 프로젝트도 같게) | |
| PostHog GeoIP | Data pipelines > Transformations > GeoIP | 꺼져 있는지 확인(코드에서 `$geoip_disable`로 이미 막음) | |
| PostHog 보관 기간 | Settings > Organization > Billing(플랜) | 무료 플랜 1년(PostHog 요금 페이지 기준, 2026-11-01 확인). 콘솔 표시값으로 확정 | "수집일로부터 1년" |
| PostHog 리전 | 가입 시 고른 US/EU | setup-guide 7장에 기록 | 국외 이전 국가 |
| Sentry IP 저장 끄기 | Settings > Projects > (프로젝트) > **Security & Privacy** > "Prevent Storing of IP Addresses" | 켬. SDK가 `infer_ip: "never"`를 보내도(`dataCollection.userInfo: false`, T10.10) 서버 쪽에서 한 번 더 막는다 | "IP 주소는 저장하지 않음" |
| Sentry 서버 스크러빙 | 같은 화면 "Data Scrubber", "Use Default Scrubbers" | 둘 다 켬. Additional Sensitive Fields에 `lat`, `lng`, `latitude`, `longitude`, `x`, `y`, `provider_token` 추가 | |
| Sentry 보관 기간 | Settings > Subscription(플랜 표) | 무료(Developer) 플랜은 오류 이벤트 30일(요금 페이지 기준, 콘솔에서 확정) | "수집일로부터 30일" |
| Sentry 데이터 위치 | Settings > Organization > General > Data Storage Location | US/EU 확인 | 국외 이전 국가 |

**설정 결과 (2026-11-02, 사용자, T9.0)**: PostHog 리전 US Cloud, 시간대 Asia/Seoul, Discard client IP data 켬, 내부 필터 `$host` does not contain `localhost` + 새 인사이트 기본 적용. 조직 기본값 항목은 화면에서 찾지 못해 건너뜀(프로젝트 1개라 프로젝트 설정으로 충분). GeoIP 변환은 목록에 없음(코드 `$geoip_disable`). 이벤트 보관 1년(무료 플랜 요금 페이지 기준, Settings의 Retention 항목은 Logs 제품용이라 손대지 않음). Sentry IP 저장 끔, Data Scrubber와 Default Scrubbers 켬, 추가 필드 7개, Inbound Filters 4개 켬(hydration 끔), 데이터 위치 US, 보관 30일(Developer 플랜). 처리방침 3절과 6절에 숫자로 반영.

확정한 값은 `src/copy/legal.ts`의 "보관 기간이 지나면 삭제" 자리에 숫자로 넣는다(문구 담당 작업, 이 문서에서는 고치지 않음).

## 5. PostHog 콘솔 단계 (사용자)

### 5.1 프로젝트 설정 먼저

1. https://us.posthog.com (EU면 eu.posthog.com) 로그인 → 왼쪽 아래 **Settings** → **Project** → **General**.
2. **Time zone**을 `Asia/Seoul`로 바꾸고 저장.
3. 같은 화면 **IP data capture configuration**에서 "Discard client IP data" 켬.
4. **Product analytics** 탭 → "Filter out internal and test users" 아래 필터 추가: 이벤트 속성 `$host`가 `localhost`를 포함하면 제외. (Vercel 미리보기 주소를 쓰게 되면 그 호스트도 추가)
5. Settings → **Organization** → **General** → IP data capture default를 "Discard"로.

### 5.2 인사이트 만들기

각 인사이트: 왼쪽 **Product analytics** → **+ New insight** → 종류 탭 선택 → 2장 정의대로 입력 → 오른쪽 위 **Save** → 이름 입력.
SQL 인사이트는 **+ New insight** → **SQL** 탭 → 2장 SQL 붙여넣기 → 결과 아래 **Visualization**에서 Line 선택 → Save.

| 순서 | 이름 | 종류 | 정의 |
| --- | --- | --- | --- |
| 1 | NS 주간 결정 수 | Trends | 2.1 |
| 2 | 추천 수락률 | SQL | 2.2 |
| 3 | 결정 소요 시간 중앙값 | SQL | 2.3 |
| 4 | 다시 뽑기 평균 | SQL | 2.4 |
| 5 | 피드백 응답률 | Trends | 2.7 |
| 6 | 투표 완료율 | Trends | 2.5 |
| 7 | 투표 초대 전환 | Funnels | 2.6 |
| 8 | 온보딩 완료 | Funnels | 2.8 |
| 9 | 인앱 로그인 전환 | Funnels | 2.9 (in_app_browser true, false 두 개) |
| 10 | W4 리텐션 | Retention | 2.10 |
| 11 | algo_version 비교 | SQL (Table) | 2.11 |

### 5.3 대시보드 구성

1. 왼쪽 **Dashboards** → **+ New dashboard** → Blank → 이름 `베타 매일 지표`.
2. **Add insight**로 5.2의 1~9를 아래 순서로 붙인다. 첫 줄(결정 흐름): 2, 3, 4. 둘째 줄(피드백, 투표): 5, 6, 7. 셋째 줄(가입): 8, 9. 맨 위에 1.
3. 대시보드 오른쪽 위 기간을 "Last 7 days"로 두고 **Save**.
4. 두 번째 대시보드 `주간 검토`: 1, 10, 11과 2.12 보조 인사이트.
5. (선택) 대시보드 **Subscribe** → 매일 09:00 이메일 구독. 베타 매일 확인(T9.6)을 놓치지 않게.

## 6. Sentry 콘솔 단계 (사용자)

메뉴 이름은 Sentry 개편에 따라 "Alerts" 또는 "Monitors & Alerts"로 보인다. 아래는 같은 화면을 가리킨다.

### 6.1 프로젝트 설정과 소음 필터

1. https://sentry.io 로그인 → **Settings** → **Projects** → 런치메이트 프로젝트.
2. **Security & Privacy**: "Prevent Storing of IP Addresses" 켬, "Data Scrubber"와 "Use Default Scrubbers" 켬, Additional Sensitive Fields에 `lat`, `lng`, `latitude`, `longitude`, `x`, `y`, `provider_token` 입력 → Save.
3. **Inbound Filters**: 아래 켬.

| 필터 | 설정 |
| --- | --- |
| Filter out errors known to be caused by browser extensions | 켬 |
| Filter out events coming from localhost | 켬 |
| Filter out known web crawlers | 켬 |
| Filter out legacy browsers | 켬(iOS Safari 15 이하 등) |
| Filter out hydration errors | 끔(cacheComponents 사용 중이라 실제 버그일 수 있음) |

4. 카카오톡 인앱 브라우저 소음: 베타 첫 주에 Issues를 `browser.name`(KakaoTalk 포함) 태그로 보고, 앱 코드와 무관한 것만 그때 Inbound Filters의 오류 메시지 필터(플랜에 따라 제공) 또는 코드의 `SENTRY_IGNORE_ERRORS`에 추가한다. 인앱 웹뷰에서 흔한 후보: `Java exception was raised during method invocation`(안드로이드 웹뷰 브리지), `Can't find variable: _AutofillCallbackHandler`, `Can't find variable: webkit`. 미리 넣지 않는다(실제 버그를 가릴 수 있음).

### 6.2 알림 규칙

**Alerts → Create Alert**. 액션은 모두 "Send a notification to: Member, 본인 이메일"(Slack 연동 시 채널). Environment는 `production`.

| 이름 | 종류 | 조건 | 필터 | 빈도 |
| --- | --- | --- | --- | --- |
| 새 이슈 | Issue alert | A new issue is created | 레벨 error 이상 | 이슈마다 30분에 한 번 |
| 회귀 | Issue alert | A resolved issue regresses | | 30분 |
| 급증 | Issue alert | The issue is seen more than **20** times in **1 hour** | | 1시간 |
| 많은 사용자 영향 | Issue alert | The issue is seen by more than **5** users in **1 hour** | | 1시간 |
| 핵심 경로 오류 | Issue alert | An event is captured | Tagged event `transaction` is one of `/auth/callback`, `/auth/sign-in`, `/poll/[code]`, `/today`, `/welcome/onboarding` | 15분 |
| 투표 링크 미리보기 이미지 | Issue alert | An event is captured | `transaction` starts with `/api/og` | 1시간 |
| 오류량 급증(전체) | Metric alert | Number of errors(`count()`, `level:error`) > **50** in **10분** | | Critical 50, Warning 20 |
| 홈 LCP 저하 | Metric alert (Performance) | `p75(measurements.lcp)` > **2500ms**, 1시간 창 | `transaction:/today` | Warning 2500, Critical 4000 |
| 서버 응답 저하 | Metric alert (Performance) | `p95(transaction.duration)` > **3000ms**, 1시간 창 | `transaction.op:http.server` | |

- 수치는 베타 20명 기준 초안이다. 첫 주 실제 양을 보고 조정한다.
- 트레이스는 10%만 샘플링(`SENTRY_TRACES_SAMPLE_RATE = 0.1`)이라 베타 규모에서 LCP 알림은 표본이 적다. 표본이 부족하면 Vercel Speed Insights나 `pnpm build`의 bundle-report로 대신 본다.
- 투표 마감 크론(pg_cron)은 DB 안에서 돌아 Sentry에 잡히지 않는다. Supabase 대시보드 Database > Cron Jobs의 실패 기록을 주 1회 확인한다.

### 6.3 릴리스 추적

- 릴리스 이름: `@sentry/nextjs` 11.9가 빌드 때 Vercel 커밋 SHA(`VERCEL_GIT_COMMIT_SHA`)를 릴리스로 넣는다(`withSentryConfig`의 기본, 코드 확인).
- 환경: 브라우저는 `NEXT_PUBLIC_VERCEL_ENV`, 서버는 `VERCEL_ENV`를 environment로 쓴다. 로컬 `pnpm dev`는 `enabled: false`라 보내지 않는다. 로컬 `pnpm build && pnpm start`는 environment가 `production`으로 찍히므로 그때는 DSN을 비우고 실행한다.
- Sentry에 릴리스를 만들고 소스맵을 올리려면 `SENTRY_AUTH_TOKEN`이 필요하다(지금 `.env.local`에는 없음, Vercel 등록 여부는 사용자 확인). 토큰은 **Settings → Developer Settings → Organization Tokens**에서 만들며 권한은 `org:ci`(릴리스와 소스맵 전용)다. Vercel 환경변수 Production에만 등록한다.
- 토큰을 넣은 뒤: 배포 1회 → Sentry **Releases**에 커밋 SHA가 보이는지 → 이슈 스택에 원본 파일명(`src/...`)이 보이는지 확인.
- 이슈 화면의 "Resolve in next release"를 써서 다음 배포에서 다시 나면 회귀 알림(6.2)이 오게 한다.

## 7. API 자동 구성 가능 여부

`.env.local`의 키 이름만 확인했다(값은 보지 않음).

| 서비스 | 있는 키 | 자동 구성 | 이유 |
| --- | --- | --- | --- |
| PostHog | `NEXT_PUBLIC_POSTHOG_KEY`, `NEXT_PUBLIC_POSTHOG_HOST` | **지금은 불가** | 프로젝트 토큰(`phc_`)은 이벤트 수집 전용이다. 인사이트, 대시보드 API는 개인 API 키(`phx_`)가 필요하다 |
| Sentry | `NEXT_PUBLIC_SENTRY_DSN` | **지금은 불가** | DSN은 이벤트 전송 전용. `SENTRY_AUTH_TOKEN`은 `.env.local`에 없고, 있더라도 조직 토큰은 `org:ci` 범위라 알림 규칙을 만들 수 없다 |

제안(사용자가 원하고 승인하면, 생성만 하고 삭제와 수정은 하지 않는다):

- PostHog: Settings → User → Personal API keys에서 범위 `insight:write`, `dashboard:write`, `query:read`, 프로젝트 하나로 제한한 키를 만들어 **세션 동안만** 셸 환경변수로 준다(`.env.local`에 저장하지 않음). 그러면 5.2의 인사이트 11개와 5.3 대시보드 2개를 `POST /api/projects/<id>/insights/`, `/dashboards/`로 만들 수 있다. 프로젝트 설정(시간대, IP 폐기)은 사용자가 콘솔에서 직접 한다.
- Sentry: 개인 토큰(User Auth Token) 범위 `alerts:write`, `project:read`로 6.2 알림 9개를 `POST /api/0/projects/<org>/<project>/rules/`(이슈 알림)와 `/organizations/<org>/alert-rules/`(메트릭 알림)로 만들 수 있다. 보안 설정(IP 저장 끄기, 스크러버, Inbound Filters)은 콘솔에서 직접 하는 편이 안전하다.
- 만든 뒤 키는 바로 폐기한다.

## 8. 베타 매일 확인 순서 (T9.6, 5분)

1. PostHog `베타 매일 지표` 대시보드: 어제 값과 목표선 비교(수락률 30%, 결정 20초, 다시 뽑기 2, 응답률 40%, 투표 완료 60%, 초대 50%, 온보딩 80%, 인앱 로그인 50%).
2. 표본 수(rec_sessions, sessions)가 20 미만인 날은 판단하지 않고 주간으로 본다.
3. Sentry Issues: 새 이슈, 사용자 수 많은 순. KakaoTalk 브라우저 비중 확인.
4. 이상 신호는 `docs/beta-retro.md`(T9.11) 메모에 날짜와 함께 적는다.

## 9. T10.10 출시 전 동작 확인 (2026-11-02)

> 요청은 "5장"이었으나 5장(PostHog 콘솔 단계)이 이미 있어 9장으로 붙였다. 프로덕션 `https://lunchmate-kr.vercel.app`(배포 커밋 `849051f`)을
> curl과 로컬 Playwright(Chromium)로 열어 확인했다. 비밀값(DSN 키, 프로젝트 토큰)은 기록하지 않는다. 코드는 고치지 않았다(9.3은 보고만).

### 9.1 확인 결과

| 항목 | 방법 | 결과 |
| --- | --- | --- |
| Sentry 켜지는 조건 | 코드: `instrumentation-client.ts`(load 뒤 3초 + 유휴 시 동적 import), `sentry-client.ts`(`enabled: NODE_ENV === "production"`), Vercel Production 환경변수 이름(`vercel env ls`) | `NEXT_PUBLIC_SENTRY_DSN` 등록됨, 빌드 청크에 `*.ingest.us.sentry.io` DSN이 들어 있음. 브라우저에서 SDK 11.9.0 클라이언트 생성, `enabled: true` |
| PostHog 켜지는 조건 | 코드: `scheduleAnalytics()`(첫 상호작용 또는 load 뒤 3초 + 유휴), `(app)`과 `/welcome` 레이아웃에서만 시작 | `NEXT_PUBLIC_POSTHOG_KEY`, `HOST` 등록됨. `/today`, `/poll/[code]`에서 `config.js` 로드 후 `us.i.posthog.com/e/`, `/i/v0/e/`로 전송. 랜딩 `/`와 약관 화면은 PostHog를 싣지 않음(의도대로) |
| 브라우저 Sentry 요청 | Playwright 네트워크 목록(`/`, `/today`, `/poll/<임의 코드>`) | 페이지마다 `envelope` POST: session 1건(모든 방문), span(10% 샘플링된 방문만, pageload와 리소스, LCP). 응답 200 |
| release, environment | 클라이언트 옵션과 envelope 헤더 | release = 커밋 SHA `849051fe...`(배포 커밋과 일치), environment = `production` |
| 테스트 이벤트 1건 | 프로덕션 페이지의 SDK 클라이언트로 `captureEvent`. environment `t10_10_test`, 태그 `t10_10_test:true`, `task:T10.10`, fingerprint `t10_10_test`, 레벨 error | 수집 서버 200, event id `7e64d71c06de4c7982f60a2620c0b350`. environment가 production이 아니라 6.2 알림 규칙(Environment production)은 울리지 않는다 |
| beforeSend 좌표 스크러버(실제 전송 본문) | 테스트 이벤트에 가짜 좌표(서울시청 공개 좌표)를 URL 쿼리, `extra.lat`, `extra.office_lng`, 문자열 "37.566535, 126.977969", `/map?lat=..&lng=..`로 섞음 | 전송 본문에서 모두 `[Filtered]`. 원문 숫자(`37.5665`, `126.97`) 0건. `request.url`도 `?lat=[Filtered]&lng=[Filtered]` |
| Sentry IP | 전송 본문 | 이벤트에 `user.ip_address` 없음. 단 `sdk.settings.infer_ip: "auto"`, session `ip_address: "{{auto}}"`, span `ingest_settings.infer_ip: "auto"`로 **수집 서버가 접속 IP를 추론하도록 요청함**(9.3의 1). 저장은 4장 "Prevent Storing of IP Addresses"(T9.0 켬)로 막힌다 |
| PostHog 좌표, IP | 전송 요청을 가로채 본문만 읽고 끊음(운영 데이터에 들어가지 않음). `/today?lat=..&lng=..`로 열기 | `$pageview`, `$web_vitals` 모두 `$geoip_disable: true`, `$ip` 속성 없음, 좌표 숫자 0건, 쿼리 좌표는 `[Filtered]`, `$elements` 없음. IP 폐기는 4장 콘솔 설정(Discard client IP data, T9.0)이 맡는다 |
| PostHog 초대 코드 | 같은 방법, `/poll/<임의 코드>` | `$pageview`의 `$current_url`은 `/poll/[code]`로 가려지지만 `$pathname`에는 **코드 원문**, `$web_vitals`는 `$current_url`과 `$pathname` 모두 원문(9.3의 2) |
| 소스맵 | `withSentryConfig` 설정, Vercel 환경변수, `.map` 요청 | `SENTRY_AUTH_TOKEN`이 Vercel에 없어 업로드 꺼짐(`sourcemaps.disable`). 공개 `.map`은 403(노출 없음). 프로덕션 스택은 압축된 파일명으로 보인다(9.3의 3) |
| 서버(Node, Edge) Sentry | 코드: `instrumentation.ts` → `sentry.server.config.ts`, `sentry.edge.config.ts`, `onRequestError` | 같은 `sentryBaseOptions`(beforeSend 스크러버) 사용. 서버 오류를 일부러 내는 시험은 운영 영향 때문에 하지 않았다 |
| 알림 메일 | Sentry, PostHog 대시보드 권한 없음 | 사용자 확인(9.2) |

참고: PostHog는 헤드리스 브라우저(User-Agent와 `navigator.webdriver`)를 봇으로 보고 이벤트를 보내지 않는다. Playwright 자동 시험(e2e)이 PostHog 지표를 더럽히지 않는 이유이기도 하다.

### 9.2 사용자 확인 단계

Sentry

1. https://sentry.io → **Issues** → 상단 Environment를 `t10_10_test`로 바꾸거나 검색창에 `t10_10_test:true` 입력.
2. "T10.10 출시 전 동작 확인 테스트 이벤트" 이슈가 있는지 봅니다(event id `7e64d71c06de4c7982f60a2620c0b350`). 없으면 **Stats > Usage**에서 2026-11-02 Filtered, Dropped 이유를 확인해 Claude에게 알려 주십시오.
3. 이벤트 화면에서 확인: Release가 `849051fe...`, **Additional Data**의 `lat`, `office_lng`, `note`, `url` 값이 `[Filtered]`, **User** 칸에 IP 주소가 없음.
4. **Alerts** → 6.2의 "새 이슈" 규칙 열기 → 편집 화면 아래 **Send Test Notification** → 본인 메일함에 Sentry 테스트 알림이 오는지 확인(스팸함 포함). 나머지 규칙도 액션이 같은 메일인지 목록에서 확인합니다.
5. 확인이 끝나면 테스트 이슈를 **Resolve** 또는 **Delete**(Environment가 달라 운영 화면에는 섞이지 않지만 정리합니다).

PostHog

6. https://us.posthog.com → **Activity**(또는 Events)에서 본인 휴대폰으로 `/today`를 연 뒤 1분 안에 `$pageview`가 들어오는지 확인합니다. 이벤트를 열어 `$ip`가 비어 있는지(Discard client IP data 동작) 확인합니다. 이 방문은 개발자 기기 방문이므로 0장 "테스트 계정" 규칙대로 날짜를 메모합니다.
7. **Settings > Project > Web analytics**(또는 Autocapture 묶음)의 **Web vitals autocapture**가 켜져 있습니다(전송에서 `$web_vitals` 확인). 9.3의 2를 고치기 전까지 끌지 정합니다.
8. 무료 할당량 80%, 100% 메일 수신자는 launch-ops 1.4의 3단계로 확인합니다.

### 9.3 찾은 문제와 조치

> 1, 2는 같은 날 별도 작업으로 고쳤다(아래 "조치"). 프로덕션 반영은 다음 배포부터이며, 배포 뒤 9.1의 PostHog 초대 코드 행과 Sentry IP 행을 다시 확인한다.

1. **[중간] `sendDefaultPii: false`가 Sentry SDK 11에서 아무 효과가 없다.** SDK 11은 이 옵션을 없애고 `dataCollection`으로 바꿨고, 미지정 시 기본값이 허용 쪽이다(userInfo true로 IP 추론, 쿠키, 요청과 응답 헤더, 요청과 응답 본문 전부, DB 쿼리 데이터). `node_modules/@sentry/*` 11.9 빌드에 `sendDefaultPii`를 읽는 코드가 0건이고, 전송 본문에서 `infer_ip: "auto"`를 확인했다. 좌표는 beforeSend가 키와 패턴으로 가리고, 쿠키와 토큰은 SDK 민감 키 필터(`sb-`, `token`, `cookie` 등)가, IP 저장은 콘솔 설정이 막아 현재 실제 유출은 확인되지 않았다. 그래도 처리방침과 `sentry-options.ts` 주석의 전제가 틀렸다. 제안: `sentryBaseOptions`에 `dataCollection: { userInfo: false, cookies: false, httpBodies: [], databaseQueryData: false }`를 넣고 `sentry-options.test.ts`의 `sendDefaultPii` 단언을 이것으로 바꾼다. 출처: sentry-javascript MIGRATION.md "sendDefaultPii is replaced by dataCollection"(Context7, 2026-11-02 확인).
   - **조치(2026-11-02)**: `sentry-options.ts`에서 `sendDefaultPii`를 지우고 `SENTRY_DATA_COLLECTION`을 `dataCollection`으로 넣었다. 브라우저, Node, Edge가 같은 `sentryBaseOptions`를 쓰므로 세 곳에 모두 적용된다. 값: `userInfo: false`(user.* 자동 채움, IP 추론, 서버 span의 `client.address` 끔), `cookies: false`, `httpHeaders: { request: { allow: ["user-agent"] }, response: false }`, `httpBodies: []`, `urlQueryParams: { deny: [IP 계열 키] }`, `databaseQueryData: false`, `queues`, `graphQL`, `genAI`, `mcp` 끔. 요청 헤더는 User-Agent 하나만 남겼다: 처리방침의 "브라우저 정보"이고, 인앱 브라우저 오류 구분과 Sentry 콘솔의 구형 브라우저, 크롤러 필터가 이 값을 쓴다. 브라우저 SDK가 모으는 헤더는 Referer와 User-Agent뿐이라 Referer는 빠진다.
   - **확인**: `@sentry/core` 11.9.0 `resolveDataCollectionOptions.js`(기본값 전부 허용), `@sentry/browser` `client.js`(`infer_ip: userInfo ? "auto" : "never"`, userInfo가 참일 때만 세션에 `ip_address: "{{auto}}"`), `tracing/spans/envelope.js`(span `ingest_settings.infer_ip` 같은 판정). 단위 시험 `sentry-options.test.ts`는 옵션 값과 함께 실제 SDK Client(`NodeClient`)가 이 값으로 풀리는지 본다. 로컬 전송 가로채기(브라우저 SDK 11.9.0 + 이 옵션을 묶어 Chromium에서 오류 1건과 pageload span 전송, 수집 서버 요청은 가로채고 끊음): 조치 전 `infer_ip: "auto"`, 조치 뒤 이벤트 `sdk.settings`와 span `ingest_settings` 모두 `"never"`, `ip_address`, 쿠키 0건, User-Agent는 남음.
2. **[중간] 투표 초대 코드 원문이 PostHog로 간다.** `capturePageview`는 `$current_url`만 `/poll/[code]`로 바꾸고, posthog-js가 자동으로 붙이는 `$pathname`(모든 이벤트)과 Web vitals 자동 수집 이벤트의 `$current_url`은 원문이다. 초대 코드는 방 조회 권한이라(CLAUDE.md 7장) 분석 도구에 남기지 않는 편이 맞고, 3장 표의 "초대 코드 가림"과도 어긋난다. 제안: `posthogBeforeSend`에서 `$current_url`, `$pathname`, `$referrer`, `$initial_*` 속성에 `pageviewPath` 규칙을 적용하고 테스트 추가. 임시로는 9.2의 7단계에서 Web vitals autocapture를 끄면 `$web_vitals` 경로는 막히지만 `$pathname`은 남는다. Sentry span의 `url.full`에도 같은 경로가 들어갈 수 있다(접근은 소유자뿐이라 낮음).
   - **조치(2026-11-02)**: `posthogBeforeSend`가 이벤트 종류와 상관없이 `properties`, `$set`, `$set_once`를 깊이 훑는다. (1) 이름이 `url`, `pathname`, `referrer`, `href`로 끝나는 속성(`$current_url`, `$pathname`, `$referrer`, `$initial_current_url`, `$initial_pathname`, `$initial_referrer`, `$session_entry_url`, `$session_entry_pathname`, `$session_entry_referrer`, `$prev_pageview_pathname` 등, 중첩된 `$web_vitals_*_event` 안의 `$current_url` 포함)은 `pageviewPath` 규칙을 적용하고 **쿼리와 해시를 버린다**(절대 URL은 origin + 가린 경로, `$direct`는 그대로). (2) 그 밖의 모든 문자열도 `/poll/<코드>`와 퍼센트 인코딩된 `%2Fpoll%2F<코드>`를 `[code]`로 바꾼다(`$initial_person_info`의 `u`, 로그인 복귀 `next` 파라미터 등). 비밀 세그먼트 목록은 `pageview.ts`의 `SECRET_SEGMENTS` 하나를 함께 쓴다. `$host`, `$referring_domain`은 그대로.
   - **확인**: `track.test.ts`의 "초대 코드 가림" 묶음이 `$pageview`, `$web_vitals`, `$pageleave`, 직접 보낸 이벤트, `$set` 다섯 종류에 대해 결과 JSON 전체에 코드 원문이 0건임을 단언한다. 9.2의 7단계(Web vitals autocapture 끄기)는 더 이상 필요 없다.
   - **남은 것(낮음)**: Sentry 이벤트의 `request.url`과 span 이름, `url.full`에는 `/poll/<코드>`가 남는다(로컬 전송 가로채기로 확인). Sentry 접근은 소유자뿐이고 pageload 트랜잭션 이름은 `/poll/[code]`로 파라미터화된다. 막으려면 `scrub.ts`의 Sentry 훅에 같은 세그먼트 규칙을 더하면 된다(별도 판단).
3. **[낮음] 소스맵 미업로드.** 프로덕션 오류 스택이 압축 코드로 보여 원인 파악이 늦다. 6.3의 `SENTRY_AUTH_TOKEN`(`org:ci`) Vercel Production 등록이 남아 있다.
4. **[낮음] 캐시된 HTML에 서버 트레이스 메타가 박힌다.** `x-vercel-cache: HIT`인 `/today`, `/poll/[code]` HTML에 `sentry-trace`, `baggage`(`sentry-transaction=POST`, 고정 `sample_rand`)가 들어 있어 캐시 수명 동안 방문자들이 같은 trace id와 샘플링 결정을 공유한다. 오류 수집에는 영향이 없고 성능 지표 표본(6.2 LCP 알림)이 치우칠 수 있다.
   - **판단(2026-11-02, 고치지 않음)**: trace id는 무작위 값이고 baggage에는 공개 키, release, environment, `sentry-transaction=POST`, `sample_rand`만 있어 개인 정보가 아니다. 오류 이벤트는 같은 trace에 묶일 뿐 따로 수집, 그룹화되므로 오류 수집에는 해가 없다. 메타는 `withSentryConfig`가 Next.js `experimental.clientTraceMetadata`에 `baggage`, `sentry-trace`를 넣어서 생긴다(`@sentry/nextjs` `getFinalConfigObjectUtils.js`). 간단한 해결 후보: `next.config.ts`에서 `withSentryConfig(...)` 결과의 `experimental.clientTraceMetadata`를 빈 배열로 덮어쓰면 캐시된 HTML에 메타가 실리지 않고, 브라우저는 pageload마다 새 trace를 시작한다(서버 렌더링 span과의 연결만 잃는다). LCP 알림 표본이 실제로 치우친 것이 보일 때 적용을 검토한다.
5. **[참고] SDK 지연 로딩 트레이드오프.** Sentry와 PostHog 모두 load 뒤 약 3~7초에 시작하므로 그 전에 난 오류와 바로 떠난 방문은 잡히지 않는다(T8.10 결정, 의도된 동작).

### 9.4 판단

- 수집 경로(브라우저 Sentry, PostHog), release와 environment 태그, 좌표 스크러버, PostHog IP와 GeoIP 차단은 프로덕션에서 동작한다.
- 남은 것: 9.2의 1~5(Sentry 이슈 생성과 알림 메일 수신), 6(PostHog 수신과 IP 폐기 확인). 9.3의 1, 2는 코드 수정 완료(배포 뒤 재확인), 3은 G10 전 사용자 작업.
