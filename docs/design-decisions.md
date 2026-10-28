# 디자인 결정 기록 (design-decisions.md)

> 선택 게이트(⛔)에서 사용자가 고른 시안과 그 이유를 남기는 기록입니다. 절차는 `docs/tasks.md` 2.3절, CLAUDE.md 6.1절을 따릅니다.
> 이 파일에 기록된 결정이 있어야 해당 화면을 구현할 수 있습니다. 새 항목은 아래에 날짜순으로 추가하고, 기존 항목은 고치지 않습니다(바뀌면 새 항목으로 "변경" 기록).

## 기록 양식

복사해서 쓰십시오.

```markdown
### D-NN. <게이트> <화면 또는 컴포넌트>

- 게이트/화면: G1 디자인 시스템 | G3 오늘(홈) | T4.0 온보딩 ... (작업 ID 함께)
- 날짜: YYYY-MM-DD
- 비교한 시안: A <한 줄 의도> / B <한 줄 의도> / C <한 줄 의도>
- 선택안: A | B | C
- 조합 지시: (예: "B 배치 + A의 카드 스와이프 모션", 없으면 "없음")
- 이유: 사용자가 말한 선택 이유 (원문에 가깝게)
- Claude 추천과 차이: 추천안, 추천과 다르게 고른 경우 그 점
- 캡처 경로: docs/design/shots/<화면>/ (390px, 1280px, 라이트, 다크)
- 비교표: tasks.md 2.3절 양식 표를 붙이거나 위치를 링크
- 후속 작업: 구현 작업 ID, 미선택 시안 코드 삭제 여부 (삭제 커밋)
```

## 기록

### D-01. G1 디자인 시스템

- 게이트/화면: G1 디자인 시스템 (T1.17, T1.18)
- 날짜: 2026-10-28
- 비교한 시안: A Terracotta Table <크림 + 테라코타, 큰 채색 일러스트, 스프링 스와이프> / B Quiet Stone <샌드 + 짙은 올리브, 제목 세리프, 선화, 느린 페이드> / C Clay Grid <오프화이트 + 클레이, 플랫 아이콘, 헤어라인 격자, 빠른 전환과 숫자 롤링>
- 선택안: B
- 조합 지시: 없음
- 추가 확정: 라이트 우선, 다크는 시스템 설정을 따르고 설정(SET-04)에서 바꿀 수 있음. 모서리는 B의 둥근 편(카드 24px) 그대로
- 이유: 사용자가 비교 화면과 캡처를 보고 B를 선택 (별도 이유 언급 없음)
- Claude 추천과 차이: Claude는 A를 추천(일러스트가 시각적 주인공, 폰트 추가 전송 없음). 사용자는 B를 선택. B의 위험(세리프 약 272KB가 홈 제목 서체에 걸림, 정보가 적어 보일 수 있음)은 T1.19 폰트 로딩 최적화와 G3 홈 카드 배치에서 다룸
- 캡처 경로: docs/design/shots/2026-10-28/ (design-lab-system-{a,b,c}-*, design-lab-system-tokens__*, design-lab-illustrations-*)
- 비교표: docs/design/g1-comparison.md 6절
- 후속 작업: 루트 DESIGN.md(T1.18), tokens.css 생성과 테마 연결(T1.19), 미선택 시안 A/C design-lab 코드 삭제(T1.20), G1 확인(T1.21). 일러스트 12종은 B 선화를 T2.8의 출발점으로 씀

### D-02. T2.13 동적 컴포넌트 PoC

- 게이트/화면: 선택 게이트 아님. T2.13 PoC 결과 기록 (T2.15), 관련 PRD REC-04(카드 스와이프), POLL 확정 축하
- 날짜: 2026-10-29
- 결정 주체: PoC 에이전트 권고를 오케스트레이터가 코드와 대조해 확정. 사용자가 바꾸면 새 항목으로 "변경" 기록
- 확인 위치: `/design-lab/poc` (6종, `src/features/design-lab/poc/*`). 별도 캡처는 없음
- 재사용 코드: `src/features/rec/swipe-stack.ts`(순수 규칙) + `use-swipe-stack.ts`, `src/lib/motion/celebrate.ts`, `src/lib/motion/dom-max.ts`, `src/components/numbers`(RollingNumber, DeadlineCountdown), `src/components/effects`(WordFade, BlurFade, Marquee)
- 번들 수치: `docs/design/bundle-log.md` 2026-10-29 항목(커밋 4ba580b, `next analyze --snapshot t213`). 모두 gzip

| 후보 | 판정 | 로딩, 크기 | 근거와 조건 | 남은 확인 (G3 이후 작업) |
| --- | --- | --- | --- | --- |
| 스와이프 카드 스택 (Motion drag) | 채택 | `domMax` 동적 import 17.0KB, 홈 첫 로드 0 | 끌기 56px 또는 420px/s. 대체 조작 ←/→/Home/End 키와 이전/다음 버튼, 위치는 `aria-live`로 안내. 끝에서 멈춤(3장이라 순환 없음). 축소 모드는 하이드레이션 뒤 `dragListener`만 끔 | G3 구현 주의: `drag` 속성 자체를 조건부로 바꾸면 하이드레이션 불일치. [실기기] 가로 끌기와 세로 스크롤 충돌, iOS 가장자리 뒤로 가기 제스처 |
| 바텀시트 스냅 (Base UI Drawer) | 조건부 채택 (실기기 확인 전) | 시트 쓰는 화면만(지도 탭), Base UI Drawer 묶음 약 27KB | 스냅 3단계 12rem / 0.55 / 1, 빠르게 튕겨도 한 단계씩. 전체 높이가 아니면 본문 스크롤을 잠가 끌기 충돌 방지. 높이 버튼 3개로 대체 조작. 예비안(Motion 직접 구현)은 지금은 불필요 | [실기기] iOS Safari, 카카오톡 인앱의 스크롤 잠금 전환 끊김, 키보드가 입력칸을 가림, Android WebView 키보드, 홈 인디케이터, 터치 끌기와 본문 스크롤 전환. 살짝 높이 12rem은 지도 시안(T5.1)에서 다시 정함 |
| 다시 뽑기 셔플 | 채택 | 기존 Motion `domAnimation`, 추가 0 | exit(fast) 뒤 reveal(slow) + `revealDelay` 순차 등장. `AnimatePresence mode="wait"`로 한 순간 효과 1개. 뒤집기, 섞기 연출 없음(Quiet Stone 느린 페이드) | 없음 |
| 결정 축하 (canvas-confetti) | 보류 (D-04에서 정정) | 동적 import 4.1KB(커밋 실측), 확정 버튼 hover, focus 때 preload | 입자 28, ticks 110, scalar 0.75, 색은 토큰(`--primary`, `--chart-2/3/5`)을 읽어 씀. 축소 모드면 모듈을 받지 않고 문장 전환만. 확정 문장은 `role="status"` | 다크에서 `--chart-5` 대비가 낮음 → 다크 색 조합 재검토(T7 투표 확정 화면) |
| NumberFlow (RollingNumber, DeadlineCountdown) | 채택, 투표방과 시트에만 | 라우트 한정, 라이브러리 6.3KB + 공용 컴포넌트 1.1KB | 득표 수, 마감 시분초(`role=timer`), 👍 비율. 홈 카드에는 쓰지 않음(정적 숫자 + `tabular-nums`) | 없음 |
| 랜딩 A 단어 페이드 (Motion Primitives TextEffect, MIT) | 채택 | 소스 복사, 자체 0.44KB | 제목에 사용 | SSR에서 opacity 0으로 시작해 LCP 요소면 늦어짐 → LCP 요소에는 CSS 키프레임 버전 검토(G3 랜딩) |
| 랜딩 B 블러 페이드 (Magic UI BlurFade, MIT) | 조건부 채택 | 소스 복사, 자체 0.29KB | 흐림 없이 opacity + 8px 이동으로 쓰기를 권장(`blur={false}`). 흐림은 "장식만을 위한 효과"에 가까움 | G3 랜딩 시안에서 확정 |
| 랜딩 C 느린 마퀴 (Magic UI Marquee, MIT) | 보류 | 소스 복사, 자체 0.65KB | 계속 움직여 Quiet Stone의 고요함과 맞지 않고, 화면 동시 효과 규칙에 부담 | 랜딩 시안에서 다시 제안할 때만 검토 |
| React Bits | 제외 | 해당 없음 | 위 후보와 중복, Commons Clause 라이선스 | 없음 |
| 햅틱 연결 (T2.14 `src/lib/haptics`) | 연결 지점 제안 | 의존성 없음 | 스와이프 확정 `select`, 다시 뽑기 `tap`, 투표 확정 `success`, 되돌릴 수 없는 확인 `warning`. 실제 연결은 각 화면 구현 때 | 미정: 축소 모드에서 햅틱도 끌지, 설정에서 "모션 줄이기"와 "진동"을 나눌지(SET 단계에서 결정). Android 실기기 확인 |
| PostHog (posthog-js) | 현행 유지 | 동적 import 101.5KB, 홈 첫 로드 0 | 첫 렌더 후 지연 로딩(T0.35) | `clientEnv()`가 zod 전체(약 17KB)를 첫 로드에 끌고 옴. 아래 번들 예산 참고 |

- 번들 예산: PoC 2차 빌드에서 `/today`(실제 홈) 첫 로드 251.6KB로 예산 200KB 초과를 발견(원인은 zod, tailwind-merge, Motion domAnimation 등). 회복 작업 진행 중이며 결과는 `docs/design/bundle-log.md` 참조. `bundle:report` 기본 라우트가 `/`라 pre-push에서 `/today` 초과를 못 잡는 점도 함께 다룸
- 후속 작업: G3 홈 시안(T3)에서 스와이프와 셔플 사용, 지도 시안(T5.1)에서 시트 높이 재결정, T7 투표 확정 화면은 DESIGN.md 7장대로 세리프 페이드 + 1위 바 채움(confetti는 D-04로 보류). PoC 페이지(`/design-lab/poc`)는 해당 화면 구현 후 정리

### D-03. 2단계 기타 결정 모음

- 날짜: 2026-10-29
- 게이트/화면: 선택 게이트 아님. 2단계 공통 기반 작업 중 내려진 결정

| 항목 | 결정 | 결정 주체 | 작업 ID | 비고 |
| --- | --- | --- | --- | --- |
| 카테고리 일러스트 채우기 | DESIGN.md 6장 "채우기 없음"을 "음식 한 곳에 선 색 16% 톤 면"으로 변경 | 사용자 확정 | T2.8 | `src/features/place/illustrations`, 64px 미만은 icon 변형 |
| 데스크톱 탭 위치 | 1024px 이상 2단(좌 리스트 + 우 지도)에서 하단 탭은 좌 리스트 칸 아래 | 사용자 확정 | T2.6 | `src/components/app-shell` |
| 앱 탭 경로 | `/today` `/map` `/poll` `/me` | T2.6 기본안 | T2.6 | |
| Button 기본 variant | 기본은 secondary, 올리브 primary는 명시할 때만(한 화면 포인트 버튼 1개 규칙) | 오케스트레이터 | T2.5 | |
| 떠 있는 층 그림자 | 토스트와 툴팁에 `shadow-lg` 허용(과한 그림자 금지의 예외) | 오케스트레이터 | T2.5 | 카드 등 바닥 층은 그대로 금지 |
| 추정 배지 색 | warning과 중립 중 G3에서 재검토 | 보류 | T2.9 | 지금은 기본안 유지 |
| 페이지뷰 경로 | 초대 코드를 지우고 `/poll/[code]`로 보냄(쿼리도 제거) | 오케스트레이터 | T2.20 후속 | `src/lib/analytics/pageview.test.ts` |

### D-04. 2단계 마무리 결정 (사용자 승인)

- 게이트/화면: 선택 게이트 아님. 2단계 완료 보고의 제안 4건을 사용자가 "제안대로" 승인
- 날짜: 2026-10-29

| 항목 | 결정 | 반영 위치 | 후속 |
| --- | --- | --- | --- |
| 홈 번들과 모션 | 첫 화면 카드 등장은 CSS 전환으로, Motion(`m`, LazyMotion)은 스와이프, 셔플처럼 상호작용 뒤에만 비동기로 씀. 홈 첫 로드 예산 200KB, 현재 168.4KB | DESIGN.md 7장, CLAUDE.md 13장 | G3 시안마다 `pnpm build` 예산 수치를 비교표에 적음 |
| 배지 색 | 의미 색 4가지(초록, 주황, 파랑, 빨강)가 나란히 보여 단일 포인트 톤보다 화려함. 의미 색을 2~3개로 줄이는 안과 "추정" 배지 색(D-03)을 G3 안건으로 | 이 기록 | T3 홈 카드 시안 비교표 |
| 다크 떠 있는 층 | 다크 `popover` 면을 oklch 0.25 → 0.27로 한 단계 밝힘(대화상자, 시트, 드로어, 툴팁 공통, 대비 12.08:1). 툴팁은 다크에서 테두리를 `input`(16%)으로 | DESIGN.md 프런트매터, `tooltip.tsx` | 시각 회귀 다크 스냅샷 갱신 |
| 모션 줄이기와 진동 | 설정(SET) 단계에서 두 토글로 분리. 그때 `haptic()`이 축소 모드를 따라 꺼지는 연동을 풀고 진동 설정만 따름 | `src/lib/haptics` 주석 | SET 설정 화면 작업 |
| 결정 축하 정정 | DESIGN.md 7장은 확정 축하에 canvas-confetti를 쓰지 않고 세리프 한 줄 페이드 + 1위 바 채움으로 정했으므로 D-02의 "채택"을 "보류"로 정정. `src/lib/motion/celebrate.ts`와 PoC는 보존하되 화면에 쓰지 않음 | D-02 표 | T7 투표 확정 화면은 DESIGN.md 7장대로 |

