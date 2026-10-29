# G3 홈과 랜딩 비교 자료 (T3.6)

> ⛔ T3.7 선택 게이트에서 사용자에게 보여 줄 자료입니다. 홈 시안 1개와 랜딩 시안 1개를 고르고, 아래 6절 안건을 함께 정합니다.
> 캡처는 2026-10-29 dev 서버(3100)에서 찍었습니다. 번들 수치는 같은 날 `pnpm build` + `next analyze --snapshot t36` 기준입니다(`docs/design/bundle-log.md` T3.6 항목).
> 시안 라우트: 홈 `/design-lab/home/<a|b|c|d>`(스위처 `/design-lab/home/compare`), 랜딩 `/design-lab/landing/<a|b|c>`.
> 함께 볼 기록: `docs/design/g3-card-rules.md`(T3.2 숫자 위계, 배지 규칙, 배지 색), `docs/design/g3-qa.md`(T3.5 점검과 남은 문제).

## 1. 캡처

폴더: `docs/design/shots/2026-10-29/` (70장). 경로는 아래에서 `shots/2026-10-29/`로 줄여 씁니다.

| 묶음 | 장수 | 파일 이름 | 찍는 방법 |
| --- | --- | --- | --- |
| 홈 4안 정상 | 16 | `design-lab-home-<a\|b\|c\|d>__<390\|1280>__<light\|dark>.png` | `pnpm shots /design-lab/home/a /design-lab/home/b /design-lab/home/c /design-lab/home/d --base-url http://localhost:3100 --full-page false --wait 600` (화면형이라 뷰포트 캡처, G1과 같음) |
| 랜딩 3안 정상 | 12 | `design-lab-landing-<a\|b\|c>__<390\|1280>__<light\|dark>.png` | `pnpm shots /design-lab/landing/a /design-lab/landing/b /design-lab/landing/c --base-url http://localhost:3100 --wait 800` (문서형이라 전체 페이지) |
| 홈 4상태 (390 라이트) | 16 | `design-lab-home-<id>__390__light__<loading\|empty\|error\|offline>.png` | 같은 캡처 조건의 보조 스크립트(아래) |
| 배지 색 current와 calm (390 라이트, `deck=overflow`) | 8 | `design-lab-home-<id>__390__light__overflow-<current\|calm>.png` | `?deck=overflow&badges=` |
| 그냥 골라줘 연출 (390 라이트, `seed=7`) | 9 | `design-lab-home-<id>__390__light__roulette-<r1\|r2\|r3>-<mid\|result>.png` | 모션 켬(`reducedMotion: no-preference`), 누른 뒤 r1 150~700ms, r2 800ms, r3 400ms에 중간 프레임, 2.2~2.6초에 결과 |
| 그냥 골라줘 결과 데스크톱 | 2 | `design-lab-home-<a\|d>__1280__light__roulette-<r2\|r1>-result.png` | 같음 |
| 랜딩 360 라이트 | 3 | `design-lab-landing-<id>__360__light.png` | 전체 페이지 |
| 랜딩 카카오톡 인앱 (390 라이트) | 3 | `design-lab-landing-<id>__390__light__inapp-kakao.png` | `?inapp=kakao`, 전체 페이지 |

- `pnpm shots`는 파일 이름에 쿼리를 남기지 않아 쿼리 캡처(상태, 배지, 연출, 인앱)는 같은 브라우저 조건(390 × 844 배율 2 터치, 1280 × 800, `ko-KR`, `Asia/Seoul`, 글꼴 대기, Next 표시기 숨김)의 일회성 스크립트로 찍고 이름 규칙에 접미사를 붙였습니다.
- 캡처 전 확인: 랜딩 B의 카카오(노란 면), 네이버(초록 면) 버튼 배경이 계산값으로 들어 있어(T3.5에서 본 dev CSS 문제 없음) `globals.css`는 건드리지 않았습니다.
- 몇 장씩 열어 빈 화면, 로딩 중 캡처, 글꼴 미로딩이 없는지 봤습니다. 처음 찍은 r1(C, D)과 r3 중간 프레임은 결과가 이미 나타난 뒤라 시간을 바꿔 다시 찍었습니다.

## 2. 번들 요약 (gzip)

- 지금: `/today` 168.5 KB, `/` 140.0 KB. 예산 200 KB 안. 시안은 design-lab에만 있어 영향 0.
- **홈은 안끼리 차이가 거의 없습니다.** 안 고유 모듈은 2.3~2.8 KB이고 나머지는 공용 틀입니다. 시안 코드를 그대로 옮기면 네 안 모두 `/today`가 약 307 KB로 넘칩니다. 원인은 Motion을 동기로 부르는 것(56 KB)과 공용 배지가 Tooltip을 늘 불러오는 것(약 46 KB)입니다. D-04대로 Motion을 상호작용 뒤로 미루고 배지 Tooltip을 지연 로딩하면 네 안 모두 첫 로드 약 +33 KB, `/today` 약 202 KB로 **예산 경계**입니다. 어떤 안을 고르든 T5 구현 전에 배지 Tooltip 분리가 필요합니다.
- 홈의 차이는 상호작용 뒤 비동기에서 납니다. A만 스와이프용 domMax 17 KB를 더 받습니다(B는 CSS scroll-snap).
- 랜딩은 A가 가장 가볍고(첫 로드 +26.7), B는 다시 뽑기 뒤 Motion 약 73 KB를 받습니다.

| 안 | 첫 로드 (시안 코드 그대로) | 첫 로드 (D-04 방식 추정) | 상호작용 뒤 비동기 |
| --- | --- | --- | --- |
| 홈 A | +139.2 | 약 +34 → `/today` 약 202 | Motion 약 56(첫 셔플, 스와이프) + domMax 17.0 + 결과 패널 2.6 |
| 홈 B | +138.8 | 약 +33 → 약 202 | Motion 약 56(첫 셔플) + 결과 패널 2.6 |
| 홈 C | +138.5 | 약 +33 → 약 201 | 같음 |
| 홈 D | +138.6 | 약 +33 → 약 201 | 같음 |
| 랜딩 A | +26.7 → `/` 166.7 | 같음 | sonner 10.9(로그인 오류 토스트) |
| 랜딩 B | +38.9 → 178.9 | 같음 | Motion 약 73(다시 뽑기) + sonner |
| 랜딩 C | +39.4 → 179.4 | 같음 | sonner 10.9 |

## 3. 홈 비교표

원칙 부합도 순서: 10초 / 3개 이하 / 설명 / 한 탭 / 미니멀. 한 손 조작은 390 × 844에서 길찾기 버튼 윗변 ÷ 화면 높이(T3.5 실측, 0.67 이상이면 하단 1/3 안).

| 항목 | A 스와이프 스택 | B 피크 캐러셀 | C 세로 3단 비교 | D 오늘의 한 곳 + 대안 2곳 |
| --- | --- | --- | --- | --- |
| 대표 캡처 | [390 라이트](shots/2026-10-29/design-lab-home-a__390__light.png), [390 다크](shots/2026-10-29/design-lab-home-a__390__dark.png), [1280](shots/2026-10-29/design-lab-home-a__1280__light.png), [로딩](shots/2026-10-29/design-lab-home-a__390__light__loading.png) | [390 라이트](shots/2026-10-29/design-lab-home-b__390__light.png), [390 다크](shots/2026-10-29/design-lab-home-b__390__dark.png), [1280](shots/2026-10-29/design-lab-home-b__1280__light.png), [로딩](shots/2026-10-29/design-lab-home-b__390__light__loading.png) | [390 라이트](shots/2026-10-29/design-lab-home-c__390__light.png), [390 다크](shots/2026-10-29/design-lab-home-c__390__dark.png), [1280](shots/2026-10-29/design-lab-home-c__1280__light.png), [로딩](shots/2026-10-29/design-lab-home-c__390__light__loading.png) | [390 라이트](shots/2026-10-29/design-lab-home-d__390__light.png), [390 다크](shots/2026-10-29/design-lab-home-d__390__dark.png), [1280](shots/2026-10-29/design-lab-home-d__1280__light.png), [로딩](shots/2026-10-29/design-lab-home-d__390__light__loading.png) |
| 의도 (한 줄) | 한 장씩 크게 보고 넘기며 고른다. 숫자(도보 28px)를 먼저 읽어 "지금 갈 수 있나"를 판정 | 그림과 이름을 먼저 본다. 옆 카드가 살짝 보여 더 있음을 알리고 가로로 넘긴다 | 세 곳을 위아래 열로 놓고 도보, 1인, 만족을 바로 견준다. 열마다 최선만 진하게 | 앱이 고른 1순위를 크게, 이유를 이름 바로 아래에. 대안 2곳은 아래 한 줄씩 |
| 장점 | 카드 한 장의 위계가 가장 분명(숫자 28px). 길찾기가 하단 1/3 안. 이전/다음, 1/3, 그냥 골라줘가 한 줄. PRD REC-04 모바일 "스와이프" 그대로, D-02 PoC 재사용 | 일러스트(112px)가 가장 커서 "일러스트가 시각적 주인공"에 가장 가깝다. 스와이프가 CSS라 비동기 0. 길찾기 0.84로 가장 아래 | 넘기지 않고 세 곳이 한 화면. 비교가 가장 빠르다. 열 최선 표시로 숫자가 바로 결정 근거가 된다. 1280에서도 세 곳이 다 보인다 | 결정 자체를 앱이 대신해 10초 원칙에 가장 직접적. 이름 30px + 이유 16px로 "왜 이 집인지"가 가장 크게 읽힌다. 대안 두 곳도 첫 화면에 보여 세 곳을 놓치지 않는다. 1280에서 큰 카드와 대안이 모두 첫 화면 |
| 약점 | 세 곳을 보려면 두 번 넘겨야 한다. 도보가 가장 크지만 추천은 이미 허용 도보 안이라 차이가 2~4분이다(T3.2 판단). 1280 × 800에서 이전/다음 줄이 하단 탭에 걸린다 | 390 첫 화면에 페이저와 그냥 골라줘가 없다(아래로 스크롤). 1280에서 460px 칸에 옆 카드가 잘려 보이고 길찾기가 첫 화면 밖. 옆 카드는 inert라 눌러 넘길 수 없다. 숫자 18px로 작음. 360px 배지 넘침 덱에서 배지 두 줄 | 길찾기가 0.45로 하단 1/3 밖. 일러스트가 작아 표처럼 보인다. 2, 3위는 펼친 뒤에 길찾기. 정보 밀도가 가장 높다. 360px에서 열이 좁고 배지 넘침 덱 두 줄 | 길찾기가 0.62로 하단 1/3 밖. 일러스트 폭 44%로 DESIGN.md 9장(30% 이하) 초과. 이유 문장 "도보 약 4분"이 숫자 칸과 겹친다. 이미 한 곳을 골라 준 화면이라 그냥 골라줘와 역할이 겹친다. 대안 줄은 만족 숫자가 없다 |
| 원칙 부합도 (10초, 3개 이하, 설명, 한 탭, 미니멀) | △ / ○ / ○ / ○ / ○ | △ / ○ / ○ / ○ / ○ | ○ / ○ / ○ / △ / △ | ○ / ○ / ○ / ○ / ○ |
| 한 손 조작 (길찾기 위치) | 0.73 (안) | 0.84 (안) | 0.45 (밖) | 0.62 (밖) |
| 데스크톱 배치 (1280) | 좌 460px 칸에 카드 1장 + 이전/다음, 우 지도 | 좌 칸 가로 캐러셀(옆 카드 잘림), 우 지도 | 좌 칸 세로 3줄, 우 지도 | 좌 칸 큰 카드 + 대안 2줄, 우 지도(1순위 핀 강조) |
| 사용한 동적 컴포넌트 | Motion drag(domMax 비동기, 이전/다음 버튼 함께), 셔플 AnimatePresence, 그냥 골라줘 기본 R2(CSS) | CSS scroll-snap, 셔플, 그냥 골라줘 기본 R2 | 펼침 전환(CSS), 셔플, 그냥 골라줘 기본 R1(줄 순회) | 셔플, 그냥 골라줘 기본 R1(큰 카드와 대안 줄 순회) |
| 번들 증가량 (gzip) | 첫 로드 약 +34(D-04 방식), 상호작용 뒤 Motion 약 56 + domMax 17 | 약 +33, 상호작용 뒤 Motion 약 56 | 약 +33, 상호작용 뒤 Motion 약 56 | 약 +33, 상호작용 뒤 Motion 약 56 |
| 접근성 위험 | 스와이프 대체 조작 있음(버튼, 화살표 키, aria-live). [실기기] 가로 끌기와 세로 스크롤 충돌, iOS 가장자리 뒤로 가기 | 옆 카드 inert(보조 기술에는 지금 카드만). [실기기] iOS snap-mandatory와 세로 스크롤 | 펼침 버튼 44px로 고침. 열 최선 표시는 굵기로만 구분(낭독 시 "가장 가까움" 같은 말이 필요할 수 있음) | 대안 줄 접근성 이름 고침(보이는 글자 + "크게 보기"). 큰 일러스트가 장식이라 낭독 대상 아님 |
| 배지 넘침 (`deck=overflow`, calm) | [캡처](shots/2026-10-29/design-lab-home-a__390__light__overflow-calm.png) | [캡처](shots/2026-10-29/design-lab-home-b__390__light__overflow-calm.png) | [캡처](shots/2026-10-29/design-lab-home-c__390__light__overflow-calm.png) | [캡처](shots/2026-10-29/design-lab-home-d__390__light__overflow-calm.png) |
| Claude 추천과 이유 | 차순위. 한 장 위계는 가장 좋지만 세 곳 비교에 넘김이 필요하고 스와이프 비용(domMax 17 KB, 실기기 위험)이 있습니다 | 비추천. 첫 화면에 그냥 골라줘가 없고 데스크톱 460px 칸에서 캐러셀이 잘립니다 | 비추천. 비교는 가장 빠르나 길찾기가 하단 1/3 밖(0.45)이고 Quiet Stone의 고요함보다 표에 가깝습니다 | **추천.** "결정 앱"이라는 제품 정체성과 가장 맞고(앱이 한 곳을 권하고 이유를 크게), 세 곳이 한 화면에 다 보이며, 데스크톱에서도 그대로 통합니다. 번들은 네 안이 같아 판단 요소가 아닙니다. 조건: 이유 문장에서 도보 분 빼기, 일러스트 44% 예외 기록(6절 6번), 길찾기 0.62는 하단 고정 줄로 내릴지 T3.8에서 결정 |

## 4. 랜딩 비교표

| 항목 | A 한 화면 에디토리얼 | B 바로 해 보는 데모 | C 스크롤 3장면 |
| --- | --- | --- | --- |
| 대표 캡처 | [390 라이트](shots/2026-10-29/design-lab-landing-a__390__light.png), [390 다크](shots/2026-10-29/design-lab-landing-a__390__dark.png), [1280](shots/2026-10-29/design-lab-landing-a__1280__light.png), [360](shots/2026-10-29/design-lab-landing-a__360__light.png), [인앱](shots/2026-10-29/design-lab-landing-a__390__light__inapp-kakao.png) | [390 라이트](shots/2026-10-29/design-lab-landing-b__390__light.png), [390 다크](shots/2026-10-29/design-lab-landing-b__390__dark.png), [1280](shots/2026-10-29/design-lab-landing-b__1280__light.png), [360](shots/2026-10-29/design-lab-landing-b__360__light.png), [인앱](shots/2026-10-29/design-lab-landing-b__390__light__inapp-kakao.png) | [390 라이트](shots/2026-10-29/design-lab-landing-c__390__light.png), [390 다크](shots/2026-10-29/design-lab-landing-c__390__dark.png), [1280](shots/2026-10-29/design-lab-landing-c__1280__light.png), [360](shots/2026-10-29/design-lab-landing-c__360__light.png), [인앱](shots/2026-10-29/design-lab-landing-c__390__light__inapp-kakao.png) |
| 의도 (한 줄) | 스크롤 없는 한 화면. 큰 세리프 가치 제안 "오늘 뭐 먹지, 10초면 정합니다." + 체험 버튼 + 로그인 | 예시 카드 3장을 첫 화면에 바로 보여 주고 다시 뽑기로 직접 해 보게 한다 | 고민 → 세 곳 뽑기 → 같이 정하기(투표)를 세 장면으로 보여 주고 마지막에 시작 |
| 장점 | 가치 제안, 체험, 로그인이 첫 화면에 다 있어 가장 빠르다. 가장 가볍다(+26.7). 효과가 CSS뿐(잉크 번짐, 선 그리기). 1280에서도 포스터처럼 정돈 | 제품의 핵심(카드 3장, 숫자, 이유 한 줄)이 첫 화면이라 "무엇을 주는지"가 가장 분명. 데스크톱 2단(좌 설명과 로그인, 우 카드) 균형이 좋다 | 투표까지 기능 전체를 소개한다. 랜딩답게 동적 효과가 가장 풍부(장면 등장, 득표 바, 고민 지우기 선). 첫 장면 체험 버튼이 하단 1/3 |
| 약점 | 제품 화면(카드)을 보여 주지 않아 "설명 가능한 추천"이 말로만 전달된다. 투표 소개 없음. [실기기] iOS 100dvh | 모바일에서 로그인 버튼이 데모 아래 둘째 화면(머리 "로그인" 바로가기로 보완). 다시 뽑기 뒤 Motion 약 73 KB. 예시 카드를 실제 추천으로 오해할 수 있다("예시 식당입니다" 표기로 완화) | 가장 길다. 로그인이 맨 아래(머리 링크로 보완). 1280에서 장면이 작고 여백이 많다 |
| 원칙 부합도 (10초, 3개 이하, 설명, 한 탭, 미니멀) | ○ / △ / △ / ○ / ○ | ○ / △ / ○ / ○ / ○ | △ / △ / ○ / ○ / △ |
| 한 손 조작 | 체험 버튼 화면 중간, 로그인 하단 | 체험 버튼은 데모 아래(390 첫 화면 밖), 다시 뽑기 하단 | 첫 장면 체험 버튼 하단 1/3 |
| 데스크톱 배치 (1280) | 좌 제목과 그림, 우 체험과 로그인 | 좌 제목, 체험, 로그인 / 우 예시 카드 3장 | 세로 장면 반복, 좌 글 우 그림 |
| 사용한 동적 컴포넌트 | CSS(제목 잉크 번짐, 선화 한 획씩) | 다시 뽑기 셔플(첫 상호작용 뒤 React.lazy로 Motion) | IntersectionObserver + CSS 등장, 득표 바 채움, 취소선 |
| 번들 증가량 (gzip, `/` 140.0 기준) | 첫 로드 +26.7, 비동기 +10.9 | 첫 로드 +38.9, 비동기 +84.6 | 첫 로드 +39.4, 비동기 +10.9 |
| 접근성 위험 | 네이버 버튼 대비 약 2.3:1(세 안 공통, 6절 7번). 약관 링크 44px 고침 | 같음. 데모 카드의 상태 전환 낭독(다시 뽑기 결과)은 role=status 확인 필요 | 같음. 스크롤 등장은 축소 모드에서 즉시 표시(T3.5 확인) |
| Claude 추천과 이유 | 차순위. 가장 빠르고 가볍지만 제품을 보여 주지 않습니다 | **추천.** 랜딩의 일은 "이 앱이 무엇을 주는지"를 한눈에 보이는 것이고, 카드 3장과 이유 한 줄이 그 답입니다. 첫 로드 +38.9로 예산 여유가 크고, Motion 73 KB는 다시 뽑기를 누른 뒤에만 받습니다. 조합 제안: 셔플을 CSS 페이드로 바꾸면 비동기 Motion도 0으로 줄일 수 있습니다(D-04 취지) | 비추천. 소개는 가장 풍부하지만 길어서 10초 원칙과 멀고, 첫 화면에서 앱이 실제로 주는 것이 보이지 않습니다 |

## 5. 그냥 골라줘 연출 캡처 (REC-12)

| 연출 | 중간 프레임 | 결과 |
| --- | --- | --- |
| R1 하이라이트 순회 (C, D 기본) | [A 시트 안](shots/2026-10-29/design-lab-home-a__390__light__roulette-r1-mid.png), [B 시트 안](shots/2026-10-29/design-lab-home-b__390__light__roulette-r1-mid.png), [C 화면 위](shots/2026-10-29/design-lab-home-c__390__light__roulette-r1-mid.png), [D 화면 위](shots/2026-10-29/design-lab-home-d__390__light__roulette-r1-mid.png) | [C](shots/2026-10-29/design-lab-home-c__390__light__roulette-r1-result.png), [D](shots/2026-10-29/design-lab-home-d__390__light__roulette-r1-result.png), [D 1280](shots/2026-10-29/design-lab-home-d__1280__light__roulette-r1-result.png) |
| R2 이름 롤링 (A, B 기본) | [A](shots/2026-10-29/design-lab-home-a__390__light__roulette-r2-mid.png) | [A](shots/2026-10-29/design-lab-home-a__390__light__roulette-r2-result.png), [A 1280](shots/2026-10-29/design-lab-home-a__1280__light__roulette-r2-result.png) |
| R3 조용한 확정 | [D](shots/2026-10-29/design-lab-home-d__390__light__roulette-r3-mid.png) | [D](shots/2026-10-29/design-lab-home-d__390__light__roulette-r3-result.png) |

결과 카드는 네 안 모두 같은 바닥 시트("오늘은 여기로 가요." + 카드 + 길찾기 + 다시 고르기)이고, 1280에서는 화면 가운데 대화상자로 뜹니다.

## 6. G3에서 함께 정할 안건

| # | 안건 | 선택지 | Claude 추천 |
| --- | --- | --- | --- |
| 1 | 배지 색 current와 calm ([current](shots/2026-10-29/design-lab-home-d__390__light__overflow-current.png) / [calm](shots/2026-10-29/design-lab-home-d__390__light__overflow-calm.png)) | current: 웨이팅 주황, 바로 입장 초록, 할인 파랑 / calm: 기피 경고만 주황, 나머지 중립 선 + 아이콘 | **calm.** 올리브 단일 포인트의 고요함을 지키고 주황을 "같이 못 먹는 사람이 있음" 하나에만 남깁니다(대비 전부 4.5:1 이상, `g3-card-rules.md` 3절) |
| 2 | 그냥 골라줘 R1, R2, R3와 시안별 기본값 | 지금 기본값 A, B는 R2, C, D는 R1. R1은 위치가 안마다 다름: 카드가 한 장만 보이는 A, B에서는 바닥 시트 안 목록을 순회하고, 세 곳이 화면에 있는 C, D에서는 화면 위 줄을 직접 순회 | **고른 홈 안의 기본값을 따름(D면 R1).** 세 곳이 이미 보이는 화면에서는 그 자리를 짚는 R1이 "세 곳 중에서 고른다"를 가장 정직하게 보여 줍니다. R3는 가장 짧지만(약 1.2초) 고르는 느낌이 약합니다 |
| 3 | "다시 고르기"에서 직전 곳 제외 (PRD에 없음) | 제외 / 포함(같은 곳이 다시 나올 수 있음) | **제외.** 다시 누른 뜻은 "다른 곳"이므로 남은 두 곳에서 점수 비례로 고르고, PRD REC-12에 한 줄 추가합니다 |
| 4 | 데스크톱 결과 패널 위치 | 지금: 화면 가운데 대화상자(리스트와 지도 경계에 걸침) / 좌 리스트 칸 안 / 지도 위 핀 옆 | **좌 리스트 칸 안 + 지도에서 해당 핀 강조.** 결과와 길찾기가 리스트 흐름 안에 남고, 위치는 지도가 보여 줍니다 |
| 5 | PRD REC-04 "데스크톱은 3장 가로 배치"와 DESIGN.md 4장 좌 리스트 칸(최대 460px) 충돌. 네 안 모두 데스크톱 세로 배치 | (가) PRD를 DESIGN.md에 맞춰 "세로 3장 + 지도"로 고침 / (나) 데스크톱 좌 칸을 넓혀 가로 3장 / (다) 데스크톱 홈은 지도를 숨기고 가로 3장 | **(가).** 지도 탭과 같은 2단 틀을 유지해 위치 맥락을 계속 보여 주고, 선택한 D는 세로에서 세 곳이 모두 첫 화면에 들어옵니다. 하위 문서(PRD) 수정은 오케스트레이터가 반영 |
| 6 | D 선택 시: 일러스트 폭 44%(DESIGN.md 9장 30% 이하 초과), 이유 문장에서 도보 분 빼기 | 예외로 기록 / 30%로 줄임. 이유 문장 그대로 / 도보 분 제외 | **"오늘의 한 곳" 큰 카드에만 예외로 기록(대안 줄과 다른 화면은 30% 규칙 유지), 이유 문장에서 도보 분 제외.** 큰 카드 한 장이라 그림이 주인공이어도 위계가 무너지지 않고, 도보는 바로 아래 숫자 칸이 이미 말합니다 |
| 7 | 랜딩 로그인 브랜드 버튼 | (a) 브랜드 색 토큰: T3.4에서 DESIGN.md `color.*.brand`(선택 항목)로 추가됨, 확정 여부 (b) 레이블: 카카오 가이드 허용 문구 "카카오 로그인" vs copy-guide 4.6 "카카오로 시작하기" (c) 네이버 초록 면 + 흰 글자 대비 약 2.3:1: 브랜드 예외로 기록 vs 다른 버튼 유형 (d) 심볼 SVG는 직접 그린 것 | (a) **확정.** (b) **각 사 가이드 문구를 따르고 copy-guide 4.6을 고침**(가이드 위반은 검수 반려 위험). (c) **브랜드 예외로 기록하되 4단계 로그인 구현 전 네이버 BI 원문을 확인**해 대비가 높은 공식 유형이 있으면 교체. (d) **출시 전 공식 에셋으로 교체**(작업 목록에 추가) |
| 8 | 홈 B 옆 카드 inert로 눌러 넘기기 없음 | 그대로 / 옆 카드 바깥 면에 "다음 카드" 버튼 역할 | **B를 고르지 않으면 해당 없음.** B를 고르면 옆 카드 바깥 면을 레이블 있는 "다음" 버튼으로 둡니다 |

## 7. 게이트 페이지용 대표 캡처

웹 비교 페이지에는 아래 27장을 씁니다(모두 `docs/design/shots/2026-10-29/`).

- 홈 (12): `design-lab-home-{a,b,c,d}__390__light.png`, `design-lab-home-{a,b,c,d}__390__dark.png`, `design-lab-home-{a,b,c,d}__1280__light.png`
- 랜딩 (9): `design-lab-landing-{a,b,c}__390__light.png`, `design-lab-landing-{a,b,c}__390__dark.png`, `design-lab-landing-{a,b,c}__1280__light.png`
- 배지 색 (2): `design-lab-home-d__390__light__overflow-current.png`, `design-lab-home-d__390__light__overflow-calm.png`
- 그냥 골라줘 (4): `design-lab-home-d__390__light__roulette-r1-mid.png`, `design-lab-home-a__390__light__roulette-r2-mid.png`, `design-lab-home-d__390__light__roulette-r3-mid.png`, `design-lab-home-d__390__light__roulette-r1-result.png`
