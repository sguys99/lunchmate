# G1 디자인 시스템 비교 자료 (T1.16)

> ⛔ T1.17 선택 게이트에서 사용자에게 보여 줄 자료입니다. 캡처는 `pnpm shots`(2026-10-28), 값은 `docs/design/candidates/{a,b,c}.DESIGN.md` 프런트매터 기준입니다.
> 시안 화면 라우트: `/design-lab/system/<a|b|c>/<home|sheet>?state=<loading|empty|error|offline>`, 스위처 `/design-lab/system`, 견본표 `/design-lab/system/tokens`.

## 1. 캡처

폴더: `docs/design/shots/2026-10-28/`

- 시안 화면 120장: 시안 3 × 화면 2(home, sheet) × 폭 2(390, 1280) × 테마 2 × 상태 5(정상, loading, empty, error, offline).
  - 화면형이라 **뷰포트 캡처**(`--full-page false`)입니다. fullPage 캡처는 sticky 하단 탭과 하단 액션이 화면 중간에 찍혀 실제 사용 화면과 달라집니다. 390은 844px 높이, 1280은 800px 높이입니다.
  - 다시 만들기: `pnpm shots /design-lab/system/a/home /design-lab/system/a/sheet /design-lab/system/b/home /design-lab/system/b/sheet /design-lab/system/c/home /design-lab/system/c/sheet --states --full-page false --wait 500`
- 견본표 4장(전체 페이지): `design-lab-system-tokens__{390,1280}__{light,dark}.png`. 다시 만들기: `pnpm shots /design-lab/system/tokens`
- 일러스트 확인 페이지 12장(`design-lab-illustrations-*`)은 T1.4~T1.6 때 캡처 그대로입니다.

### 시안별 대표 6장

| 시안 | 홈 390 라이트 | 홈 390 다크 | 홈 1280 라이트 | 시트 390 라이트 | 시트 1280 다크 | 홈 390 빈 상태 |
| --- | --- | --- | --- | --- | --- | --- |
| A | `design-lab-system-a-home__390__light.png` | `design-lab-system-a-home__390__dark.png` | `design-lab-system-a-home__1280__light.png` | `design-lab-system-a-sheet__390__light.png` | `design-lab-system-a-sheet__1280__dark.png` | `design-lab-system-a-home__390__light__empty.png` |
| B | `design-lab-system-b-home__390__light.png` | `design-lab-system-b-home__390__dark.png` | `design-lab-system-b-home__1280__light.png` | `design-lab-system-b-sheet__390__light.png` | `design-lab-system-b-sheet__1280__dark.png` | `design-lab-system-b-home__390__light__empty.png` |
| C | `design-lab-system-c-home__390__light.png` | `design-lab-system-c-home__390__dark.png` | `design-lab-system-c-home__1280__light.png` | `design-lab-system-c-sheet__390__light.png` | `design-lab-system-c-sheet__1280__dark.png` | `design-lab-system-c-home__390__light__empty.png` |

### 보조 자료: 견본표

`design-lab-system-tokens__1280__light.png`, `__1280__dark`, `__390__light`, `__390__dark`. 세 시안을 나란히 놓고 색 견본(oklch 값), 대비 쌍 13개(대비비 숫자), 카테고리 색면 12종(ink/surface 대비비), 타입 스케일 9단계(크기/행간/굵기, 한글 견본, 시안 B 제목은 세리프), 라운드, 그림자, 모션 값을 보여 줍니다. 값은 DESIGN.md 파싱 결과에서, 대비는 `src/lib/design/contrast.ts`로 계산합니다.

## 2. 핵심 토큰 요약

| 항목 | A Terracotta Table | B Quiet Stone | C Clay Grid |
| --- | --- | --- | --- |
| 컨셉 | 크림 바탕에 테라코타 한 색, 손맛 있는 그림이 먼저 보이는 식탁 | 석회빛 샌드 위 짙은 올리브 한 색, 가는 세리프와 선화가 여백 속에서 조용히 고르게 돕는 화면 | 오프화이트 위 클레이 한 색과 헤어라인 격자, 숫자가 표처럼 정렬된 단정한 카드 |
| 무드 | 따뜻한, 손맛, 활기 | 고요한, 단정한, 여유로운 | 정돈된, 따뜻한, 명료한 |
| 배경 (라이트 / 다크) | `oklch(0.972 0.016 82)` / `oklch(0.215 0.011 52)` | `oklch(0.952 0.012 78)` / `oklch(0.205 0.006 70)` | `oklch(0.983 0.004 70)` / `oklch(0.205 0.008 55)` |
| 포인트 (라이트 / 다크) | 테라코타 `oklch(0.53 0.135 40)` / `oklch(0.7 0.12 45)` | 올리브 `oklch(0.43 0.055 118)` / `oklch(0.76 0.07 118)` | 클레이 `oklch(0.5 0.105 47)` / `oklch(0.72 0.105 55)` |
| 제목 서체 | Pretendard 700, title 24px | 마루 부리 세리프 300, title 30px | Pretendard 600, title 26px |
| 본문 | 15px | 16px | 15px |
| 카드 라운드 / 버튼 | 20px / 알약 | 24px / 알약 | 16px / 16px |
| 그림자 | 얕은 2겹 (0.5px 윤곽 + 짧은 낙하) | 없음 (1px 선과 면 톤) | 아주 옅은 1겹 |
| 모션 duration (fast/base/slow) | 160 / 220 / 260ms | 180 / 260 / 300ms (오버슈트 없음) | 150 / 175 / 200ms |
| 일러스트 | painted, 카드 위쪽 48% | line 1.4px, 모서리 28% | flat, 옆 칸 36% |
| 데스크톱 열 비율 / 탭 높이 | 2:3 / 64px | 2:3 / 64px | 5:7 / 56px |

## 3. 대비 (`pnpm contrast` 요약)

세 시안 모두 contrastPairs 전부 통과(A 98건, B 80건, C 82건).

| 시안 | 전체 최저 (라이트 / 다크) | 본문 글자(기준 4.5) 최저 (라이트 / 다크) |
| --- | --- | --- |
| A | 3.97 warning on card (기준 3) / 4.70 primary on accent (기준 3) | 5.44 primary-foreground on primary / 5.72 destructive on card |
| B | 4.29 warning on card (기준 3) / 6.12 muted-foreground on secondary | 5.44 muted-foreground on secondary / 6.12 muted-foreground on secondary |
| C | 4.02 warning on card (기준 3) / 5.35 vote-bar on vote-bar-track (기준 3) | 5.38 primary on accent / 5.38 primary on accent |

카테고리 ink/surface 12쌍 최저: A 6.77(양식, 라이트), B 6.41(아시안, 라이트), C 6.66(패스트푸드, 라이트). 다크는 세 시안 모두 8.2 이상.

## 4. 번들 추정 (`pnpm build` + `pnpm bundle:report`, 2026-10-28)

- 홈(`/`) 첫 로드 현재 **133.1KB gzip** (예산 200KB). design-lab 라이브러리는 홈에 들어가지 않습니다(라우트 한정).
- design-lab/system 단독 화면 첫 로드 255.6KB gzip. 그중 측정값:
  - Motion(`m` + LazyMotion domAnimation + AnimatePresence): 약 37KB gzip
  - domMax 비동기 청크(drag): 14.1KB gzip, 첫 로드 밖
  - @number-flow/react: 약 5.6KB gzip
  - Base UI Drawer(시트): 약 27KB gzip, 확정 시 지도 탭과 상세 시트에만
- 시안 B 마루 부리 세리프: woff2 2개 278,892바이트(약 272KB, JS 아님). `preload: false`라 첫 화면 이후 받지만 제목 서체라 확정 시 홈 LCP 요소에 걸립니다.

| 시안 | 확정 시 홈 첫 로드에 더해질 JS (gzip, 추정) | 홈 누적 (추정) | 그 밖 |
| --- | --- | --- | --- |
| A | Motion 약 37KB | 약 170KB | domMax 14KB 비동기(카드 스와이프) |
| B | Motion 약 37KB | 약 170KB | domMax 14KB 비동기(스와이프), 세리프 폰트 약 272KB 전송 |
| C | Motion 약 37KB + NumberFlow 약 5.6KB | 약 176KB | 드래그 없음 |

## 5. 시안 에이전트가 보고한 약점

- **A**: 이름이 한 줄일 때 카드 정보 영역 세로 여백이 남음. 시트가 Base UI CSS 전환이라 sheet 스프링 토큰을 쓰지 않음. 모바일 시트 스냅이 높아 지도가 140px만 보임. 국밥/일식 색면이 가장 차가움. 일러스트 구도가 반복됨.
- **B**: 목차와 카드에 도보 분이 중복됨. 낮은 화면(높이 640px)에서 카드가 밀림. 시트에서 득표가 먼저라 상세가 첫 화면 밖. 세리프 272KB(LCP 서체). 작은 선화의 세부가 뭉개짐.
- **C**: 시트 390 첫 화면에 득표 2곳만 보임. 1280x800에서 세 번째 카드가 하단 액션에 반쯤 가림. 다크 일러스트가 음화 느낌(완화했으나 국밥/아시안 그릇이 밝음). 중식 짜장면 형태가 모호함.

## 6. 비교표 (tasks.md 2.3 양식, 초안)

원칙 부합도 순서: 10초 / 3개 이하 / 설명 / 한 탭 / 미니멀.

| 항목 | A Terracotta Table | B Quiet Stone | C Clay Grid |
| --- | --- | --- | --- |
| 의도 (한 줄) | 큰 채색 일러스트가 먼저 보이는 카드 스택으로 "한 장씩 넘기며 고르는" 따뜻한 식탁 | 세리프 목차와 큰 여백으로 한 곳을 차분히 권하는 조용한 화면 | 세 곳을 표처럼 정렬해 숫자로 한눈에 비교하는 단정한 카드 |
| 장점 | 일러스트가 시각적 주인공이라 첫인상이 가장 강함. 카드 숫자 3개 위계가 큼. 데스크톱 2단에서 지도와 카드가 균형 있음 | 정보 밀도가 가장 낮고 여백이 넓어 미니멀 원칙에 가장 가까움. 그림자 없이 선과 면으로 깊이. 모션이 오버슈트 없이 차분함 | 세 곳이 한 화면에 다 보여 비교가 가장 빠름. 하단 액션에 "식당명 길찾기"가 붙어 결정까지 한 탭. 모션이 가장 짧고 경쾌함 |
| 약점 | 5절 A 항목. 한 번에 한 곳만 보여 세 곳 비교에 넘기기가 필요 | 5절 B 항목. 세리프 폰트 전송량, 목차와 카드 중복 | 5절 C 항목. 일러스트가 작아 카드 표정이 약하고 표 같은 인상 |
| 원칙 부합도 (10초, 3개 이하, 설명, 한 탭, 미니멀) | △ / ○ / ○ / ○ / △ | △ / ○ / ○ / ○ / ○ | ○ / ○ / ○ / ○ / △ |
| 사용한 동적 컴포넌트 | Motion(스와이프 스택, domMax drag), NumberFlow(득표), Base UI Drawer, 쉬머 스켈레톤 | Motion(목차 전환, 스와이프 domMax), NumberFlow(득표), Base UI Drawer | Motion(선택, 셔플), NumberFlow(홈 숫자, 득표), Base UI Drawer |
| 번들 증가량 (gzip) | 홈 +약 37KB (+14KB 비동기) | 홈 +약 37KB (+14KB 비동기) + 폰트 약 272KB | 홈 +약 43KB |
| 접근성 위험 | 스와이프에 이전/다음 버튼 있음. 일러스트 위 배지 대비는 검사 통과. 시트 스냅이 높아 지도 조작 영역이 좁음 | 세리프 300 가는 획(대비 수치는 통과, 작은 크기 가독성 확인 필요). 시트 상세가 첫 화면 밖이라 스크린리더 순서상 득표가 먼저 | 1280x800에서 세 번째 카드가 하단 액션에 일부 가림(포커스 시 가려질 위험). 다크 일러스트 밝기 |
| Claude 추천과 이유 | **추천 (기본안)**. PRD 8.3 "카드의 시각적 주인공은 카테고리 일러스트"와 preferences의 "스타벅스의 따뜻한 색과 일러스트"를 가장 직접 구현합니다. 모션 성격(스프링 스와이프, 셔플)이 "보통" 강도에 맞고, 폰트 추가 전송이 없습니다. 보완: 국밥/일식 색면을 흙빛 쪽으로 데우고, 시트 스냅을 낮춤 | 비추천. 가장 세련되지만 세리프 272KB가 홈 LCP 서체에 걸리고, 정보가 적어 보이는 위험이 10초 원칙과 부딪칩니다. 세리프 없이 B의 여백과 1px 선 규칙만 A에 빌려 오는 조합은 검토할 만합니다 | 차순위. 비교 속도는 가장 빠르나 일러스트가 작아 "일러스트가 주인공" 결정과 어긋나고 표 같은 인상이 남습니다. 숫자 열 정렬과 빠른 duration은 G3 카드 배치에서 다시 쓸 만합니다 |

## 7. G1 확인 (T1.21)

2026-10-29. 루트 `DESIGN.md`의 값 4곳을 임시로 바꾸고 `pnpm tokens`를 실행한 뒤, 실행 중인 dev 서버(3000)를 Playwright로 390px에서 열어 `getComputedStyle`로 확인했습니다. 대비 검사는 바꾼 값에서도 통과(final 80건)했습니다.

| 바꾼 키 | 전 | 후 | `tokens.css` | 확인한 요소 (전 → 후) |
| --- | --- | --- | --- | --- |
| `color.light.shadcn.primary` | `oklch(0.43 0.055 118)` 올리브 | `oklch(0.43 0.12 25)` 적갈 | `:root --primary` | `/` 가격 글자색, `/design-lab/system/b/home` 길찾기 버튼 배경 `lab(34.4 -7.8 19.8)` → `lab(32.7 37.8 22.3)` |
| `color.dark.shadcn.primary` | `oklch(0.76 0.07 118)` | `oklch(0.76 0.1 25)` | `.dark`, 시스템 다크 블록 둘 다 | 시스템 다크 에뮬레이션(b/home)과 스위처 `?theme=dark`(`<html class="dark">`, 시스템 라이트)에서 버튼 배경 `lab(71.2 31.0 17.2)` |
| `radius.components.card` | `xl` | `sm` | `--lm-radius-card: var(--lm-radius-sm)` | 추천 카드 `border-radius` 24px → 8px |
| `type.title.size` | `1.875` | `2.5` | `--lm-type-title-size: 2.5rem` | "오늘의 추천" 제목 `font-size` 30px → 40px |

- 전/후 캡처(라이트, 시스템 다크, `.dark` 강제)를 나란히 놓고 눈으로도 확인했습니다. 캡처는 저장소에 넣지 않았습니다.
- 생성물 diff는 바꾼 키에 해당하는 5줄(`--primary`는 `:root`, `.dark`, 시스템 다크 3곳)뿐이었습니다. `@theme inline`과 `type-*` 유틸리티가 값을 쓰지 않고 `var()`만 가리키므로 새로고침만으로 반영됩니다.
- JS로 읽는 토큰(모션, 레이아웃, 일러스트, `tokens.server.ts`)은 프로세스 안에 캐시되어 dev 서버를 다시 띄워야 반영됩니다. CSS 토큰은 해당 없습니다.
- 되돌림: `git checkout -- DESIGN.md src/styles/tokens.css` 후 `pnpm tokens --check` "최신", `git status`에 두 파일 변경 없음, 화면 값도 원래대로(`--primary` 올리브, 카드 24px, 제목 30px) 돌아온 것을 확인했습니다.
- 회귀 방지: `src/lib/design/edit-flow.test.ts`. 루트 `DESIGN.md` 사본을 임시 폴더에서 같은 4곳만 바꿔 실제 CLI(`build-tokens.ts --root`)로 생성하고, `:root`, `.dark`, 시스템 다크 블록의 값과 diff 범위를 검사합니다. `globals.css`의 `@theme inline` 선언이 모두 `var()` 하나인지도 검사합니다.
