---
# 시안 C "Clay Grid" (형식: docs/design/candidates/FORMAT.md, 검증: src/lib/design/schema.ts)
# 주 레퍼런스 Mintlify. 오프화이트, 클레이 한 색, 헤어라인과 4px 그리드, 작은 라운드, 플랫 아이콘형 일러스트.
schema: 1

meta:
  id: c
  name: Clay Grid
  concept: 오프화이트 위 클레이 한 색과 헤어라인 격자, 숫자가 표처럼 정렬된 단정한 카드
  mood: [정돈된, 따뜻한, 명료한]
  version: 0.1.0
  status: candidate
  basedOn: []

color:
  light:
    shadcn:
      background: "oklch(0.983 0.004 70)"
      foreground: "oklch(0.225 0.012 50)"
      card: "oklch(0.996 0.002 70)"
      card-foreground: "oklch(0.225 0.012 50)"
      popover: "oklch(0.996 0.002 70)"
      popover-foreground: "oklch(0.225 0.012 50)"
      primary: "oklch(0.5 0.105 47)"
      primary-foreground: "oklch(0.99 0.004 70)"
      secondary: "oklch(0.955 0.007 65)"
      secondary-foreground: "oklch(0.27 0.012 50)"
      muted: "oklch(0.958 0.006 65)"
      muted-foreground: "oklch(0.475 0.014 55)"
      accent: "oklch(0.95 0.026 68)"
      accent-foreground: "oklch(0.36 0.07 50)"
      destructive: "oklch(0.5 0.17 27)"
      border: "oklch(0.225 0.012 50 / 9%)"
      input: "oklch(0.225 0.012 50 / 14%)"
      ring: "oklch(0.56 0.105 50)"
      chart-1: "oklch(0.5 0.105 47)"
      chart-2: "oklch(0.64 0.095 60)"
      chart-3: "oklch(0.75 0.07 72)"
      chart-4: "oklch(0.42 0.06 45)"
      chart-5: "oklch(0.33 0.03 50)"
      sidebar: "oklch(0.972 0.005 68)"
      sidebar-foreground: "oklch(0.225 0.012 50)"
      sidebar-primary: "oklch(0.5 0.105 47)"
      sidebar-primary-foreground: "oklch(0.99 0.004 70)"
      sidebar-accent: "oklch(0.95 0.026 68)"
      sidebar-accent-foreground: "oklch(0.36 0.07 50)"
      sidebar-border: "oklch(0.225 0.012 50 / 9%)"
      sidebar-ring: "oklch(0.56 0.105 50)"
    app:
      success: "oklch(0.52 0.1 152)"
      success-surface: "oklch(0.955 0.025 150)"
      success-foreground: "oklch(0.37 0.075 152)"
      warning: "oklch(0.6 0.13 68)"
      warning-surface: "oklch(0.955 0.04 80)"
      warning-foreground: "oklch(0.41 0.085 60)"
      info: "oklch(0.52 0.075 240)"
      info-surface: "oklch(0.955 0.018 240)"
      info-foreground: "oklch(0.38 0.065 240)"
      vote-bar: "oklch(0.5 0.105 47)"
      vote-bar-track: "oklch(0.935 0.012 65)"
      vote-bar-foreground: "oklch(0.99 0.004 70)"
      skeleton: "oklch(0.945 0.006 65)"
      skeleton-highlight: "oklch(0.972 0.004 70)"
      overlay: "oklch(0.2 0.01 50 / 36%)"
    category:
      hansik: { surface: "oklch(0.935 0.035 55)", ink: "oklch(0.43 0.085 52)" }
      jungsik: { surface: "oklch(0.935 0.035 32)", ink: "oklch(0.43 0.1 30)" }
      ilsik: { surface: "oklch(0.94 0.02 230)", ink: "oklch(0.42 0.06 235)" }
      yangsik: { surface: "oklch(0.945 0.04 85)", ink: "oklch(0.44 0.08 75)" }
      bunsik: { surface: "oklch(0.935 0.03 10)", ink: "oklch(0.43 0.095 12)" }
      gukbap: { surface: "oklch(0.935 0.03 70)", ink: "oklch(0.42 0.065 65)" }
      gogi: { surface: "oklch(0.93 0.035 20)", ink: "oklch(0.42 0.1 22)" }
      asian: { surface: "oklch(0.94 0.025 165)", ink: "oklch(0.42 0.06 168)" }
      fastfood: { surface: "oklch(0.945 0.045 95)", ink: "oklch(0.44 0.08 85)" }
      salad: { surface: "oklch(0.94 0.035 132)", ink: "oklch(0.42 0.075 135)" }
      cafe: { surface: "oklch(0.93 0.022 60)", ink: "oklch(0.4 0.05 55)" }
      pub: { surface: "oklch(0.935 0.022 320)", ink: "oklch(0.42 0.065 330)" }
  dark:
    shadcn:
      background: "oklch(0.205 0.008 55)"
      foreground: "oklch(0.94 0.008 75)"
      card: "oklch(0.232 0.009 55)"
      card-foreground: "oklch(0.94 0.008 75)"
      popover: "oklch(0.25 0.01 55)"
      popover-foreground: "oklch(0.94 0.008 75)"
      primary: "oklch(0.72 0.105 55)"
      primary-foreground: "oklch(0.2 0.012 50)"
      secondary: "oklch(0.285 0.01 55)"
      secondary-foreground: "oklch(0.93 0.008 75)"
      muted: "oklch(0.27 0.009 55)"
      muted-foreground: "oklch(0.74 0.012 70)"
      accent: "oklch(0.3 0.03 55)"
      accent-foreground: "oklch(0.88 0.06 65)"
      destructive: "oklch(0.7 0.16 25)"
      border: "oklch(0.95 0.01 75 / 8%)"
      input: "oklch(0.95 0.01 75 / 13%)"
      ring: "oklch(0.66 0.1 55)"
      chart-1: "oklch(0.72 0.105 55)"
      chart-2: "oklch(0.62 0.09 55)"
      chart-3: "oklch(0.52 0.07 55)"
      chart-4: "oklch(0.82 0.07 68)"
      chart-5: "oklch(0.88 0.04 75)"
      sidebar: "oklch(0.218 0.008 55)"
      sidebar-foreground: "oklch(0.94 0.008 75)"
      sidebar-primary: "oklch(0.72 0.105 55)"
      sidebar-primary-foreground: "oklch(0.2 0.012 50)"
      sidebar-accent: "oklch(0.3 0.03 55)"
      sidebar-accent-foreground: "oklch(0.88 0.06 65)"
      sidebar-border: "oklch(0.95 0.01 75 / 8%)"
      sidebar-ring: "oklch(0.66 0.1 55)"
    app:
      success: "oklch(0.72 0.11 152)"
      success-surface: "oklch(0.29 0.035 152)"
      success-foreground: "oklch(0.87 0.07 152)"
      warning: "oklch(0.78 0.12 75)"
      warning-surface: "oklch(0.3 0.04 70)"
      warning-foreground: "oklch(0.89 0.08 80)"
      info: "oklch(0.72 0.075 240)"
      info-surface: "oklch(0.29 0.03 240)"
      info-foreground: "oklch(0.87 0.05 240)"
      vote-bar: "oklch(0.72 0.105 55)"
      vote-bar-track: "oklch(0.3 0.01 55)"
      vote-bar-foreground: "oklch(0.2 0.012 50)"
      skeleton: "oklch(0.265 0.009 55)"
      skeleton-highlight: "oklch(0.3 0.01 55)"
      overlay: "oklch(0.1 0.005 50 / 60%)"
    category:
      hansik: { surface: "oklch(0.3 0.03 55)", ink: "oklch(0.84 0.07 58)" }
      jungsik: { surface: "oklch(0.3 0.032 32)", ink: "oklch(0.84 0.075 32)" }
      ilsik: { surface: "oklch(0.3 0.022 232)", ink: "oklch(0.85 0.05 232)" }
      yangsik: { surface: "oklch(0.31 0.03 80)", ink: "oklch(0.86 0.075 82)" }
      bunsik: { surface: "oklch(0.3 0.03 10)", ink: "oklch(0.84 0.07 12)" }
      gukbap: { surface: "oklch(0.3 0.026 68)", ink: "oklch(0.85 0.055 70)" }
      gogi: { surface: "oklch(0.3 0.032 22)", ink: "oklch(0.84 0.075 24)" }
      asian: { surface: "oklch(0.3 0.025 168)", ink: "oklch(0.85 0.055 168)" }
      fastfood: { surface: "oklch(0.31 0.03 92)", ink: "oklch(0.87 0.08 92)" }
      salad: { surface: "oklch(0.3 0.03 135)", ink: "oklch(0.85 0.07 135)" }
      cafe: { surface: "oklch(0.3 0.02 58)", ink: "oklch(0.84 0.045 62)" }
      pub: { surface: "oklch(0.3 0.025 325)", ink: "oklch(0.84 0.055 328)" }

# 대비 검사(T1.15) 대상. 필수 쌍 36개 + 시안 C가 실제로 겹쳐 쓰는 조합 추가.
contrastPairs:
  - { fg: foreground, bg: background, min: 4.5 }
  - { fg: card-foreground, bg: card, min: 4.5 }
  - { fg: popover-foreground, bg: popover, min: 4.5 }
  - { fg: primary-foreground, bg: primary, min: 4.5 }
  - { fg: secondary-foreground, bg: secondary, min: 4.5 }
  - { fg: muted-foreground, bg: background, min: 4.5 }
  - { fg: muted-foreground, bg: card, min: 4.5 }
  - { fg: muted-foreground, bg: muted, min: 4.5 }
  - { fg: accent-foreground, bg: accent, min: 4.5 }
  - { fg: destructive, bg: background, min: 4.5 }
  - { fg: destructive, bg: card, min: 4.5 }
  - { fg: primary, bg: background, min: 3, note: 포인트 컬러 아이콘과 선택 테두리 }
  - { fg: ring, bg: background, min: 3, note: 포커스 링 }
  - { fg: sidebar-foreground, bg: sidebar, min: 4.5 }
  - { fg: sidebar-primary-foreground, bg: sidebar-primary, min: 4.5 }
  - { fg: sidebar-accent-foreground, bg: sidebar-accent, min: 4.5 }
  - { fg: success-foreground, bg: success-surface, min: 4.5 }
  - { fg: warning-foreground, bg: warning-surface, min: 4.5 }
  - { fg: info-foreground, bg: info-surface, min: 4.5 }
  - { fg: success, bg: card, min: 3 }
  - { fg: warning, bg: card, min: 3 }
  - { fg: info, bg: card, min: 3 }
  - { fg: vote-bar, bg: vote-bar-track, min: 3, note: 득표 바 채움과 트랙 }
  - { fg: vote-bar-foreground, bg: vote-bar, min: 4.5, note: 바 안 득표 수 }
  - { fg: cat-hansik-ink, bg: cat-hansik-surface, min: 4.5 }
  - { fg: cat-jungsik-ink, bg: cat-jungsik-surface, min: 4.5 }
  - { fg: cat-ilsik-ink, bg: cat-ilsik-surface, min: 4.5 }
  - { fg: cat-yangsik-ink, bg: cat-yangsik-surface, min: 4.5 }
  - { fg: cat-bunsik-ink, bg: cat-bunsik-surface, min: 4.5 }
  - { fg: cat-gukbap-ink, bg: cat-gukbap-surface, min: 4.5 }
  - { fg: cat-gogi-ink, bg: cat-gogi-surface, min: 4.5 }
  - { fg: cat-asian-ink, bg: cat-asian-surface, min: 4.5 }
  - { fg: cat-fastfood-ink, bg: cat-fastfood-surface, min: 4.5 }
  - { fg: cat-salad-ink, bg: cat-salad-surface, min: 4.5 }
  - { fg: cat-cafe-ink, bg: cat-cafe-surface, min: 4.5 }
  - { fg: cat-pub-ink, bg: cat-pub-surface, min: 4.5 }
  - { fg: accent-foreground, bg: card, min: 4.5, note: 선택 칩 글자가 카드 위로 이어질 때 }
  - { fg: primary, bg: card, min: 4.5, note: 텍스트 링크와 선택 탭 라벨 (카드 위 클레이 글자) }
  - { fg: primary, bg: accent, min: 4.5, note: 선택 칩 안 클레이 글자 }
  - { fg: foreground, bg: muted, min: 4.5, note: 세그먼트 컨트롤 선택 면 }
  - { fg: muted-foreground, bg: vote-bar-track, min: 4.5, note: 트랙 위 비득표 숫자 }

font:
  sans:
    family: Pretendard Variable
    fallback: [Pretendard, -apple-system, BlinkMacSystemFont, system-ui, Apple SD Gothic Neo, Noto Sans KR, sans-serif]
  heading:
    family: Pretendard Variable
    fallback: [Pretendard, -apple-system, BlinkMacSystemFont, system-ui, Apple SD Gothic Neo, Noto Sans KR, sans-serif]
    kind: sans
  numeric:
    use: sans
    tabular: true
    slashedZero: false

# size rem, lineHeight 배수, weight 100~900, tracking em
type:
  display: { size: 2.25, lineHeight: 1.1, weight: 600, tracking: -0.025, font: heading }
  title: { size: 1.625, lineHeight: 1.15, weight: 600, tracking: -0.02, font: heading }
  heading: { size: 1.125, lineHeight: 1.3, weight: 600, tracking: -0.02, font: heading }
  body: { size: 0.9375, lineHeight: 1.5, weight: 400, tracking: -0.005, font: sans }
  body-sm: { size: 0.875, lineHeight: 1.45, weight: 400, tracking: -0.005, font: sans }
  label: { size: 0.875, lineHeight: 1.25, weight: 500, tracking: -0.005, font: sans }
  caption: { size: 0.75, lineHeight: 1.35, weight: 500, tracking: 0, font: sans }
  numeric-lg: { size: 1.5, lineHeight: 1, weight: 500, tracking: -0.02, font: numeric }
  numeric-md: { size: 1.0625, lineHeight: 1.1, weight: 500, tracking: -0.01, font: numeric }

# rem. 모든 값이 4px(0.25rem)의 배수
space:
  base: 0.25
  scale: { 2xs: 0.25, xs: 0.5, sm: 0.75, md: 1, lg: 1.25, xl: 2, 2xl: 2.5, 3xl: 3 }

# --radius 8px. sm 4, md 6, lg 8, xl 10, 2xl 12, 3xl 16, 4xl 20
radius:
  base: 0.5
  scale: { sm: 0.5, md: 0.75, lg: 1, xl: 1.25, 2xl: 1.5, 3xl: 2, 4xl: 2.5 }
  components: { card: lg, button: lg, chip: md, badge: sm, input: lg, sheet: 3xl, tab-bar: none }

# 깊이는 헤어라인과 면 톤으로 만든다. 그림자는 알파 4% 이하.
shadow:
  light:
    sm: "0 1px 0 oklch(0.225 0.012 50 / 3%)"
    md: "0 1px 2px oklch(0.225 0.012 50 / 4%)"
    lg: "0 1px 2px oklch(0.225 0.012 50 / 3%), 0 6px 16px oklch(0.225 0.012 50 / 4%)"
    sheet: "0 -1px 0 oklch(0.225 0.012 50 / 6%), 0 -8px 24px oklch(0.225 0.012 50 / 4%)"
  dark:
    sm: none
    md: none
    lg: "0 8px 20px oklch(0.1 0.005 50 / 40%)"
    sheet: "0 -1px 0 oklch(0.95 0.01 75 / 8%), 0 -8px 24px oklch(0.1 0.005 50 / 50%)"

# px. 카드와 구분선은 default(1px)에 알파 색을 써서 헤어라인처럼 보이게 한다.
border: { hairline: 0.5, default: 1, strong: 1.5 }

# 빠르고 정확하게. 스프링은 임계 감쇠 근처(오버슈트 1% 미만).
motion:
  duration: { fast: 150, base: 175, slow: 200 }
  easing:
    standard: [0.2, 0, 0, 1]
    enter: [0, 0, 0.15, 1]
    exit: [0.4, 0, 1, 1]
    emphasized: [0.3, 0, 0, 1]
  spring:
    swipe: { stiffness: 520, damping: 44, mass: 0.9 }
    sheet: { stiffness: 420, damping: 42, mass: 1 }
    shuffle: { stiffness: 480, damping: 40, mass: 0.8 }
    press: { stiffness: 700, damping: 42, mass: 0.5 }
    bar: { stiffness: 300, damping: 36, mass: 1 }
  stagger: 24
  reducedMotion: instant

illustration:
  style: flat
  strokeWidth: 0
  cardAreaRatio: 0.36
  placement: side
  palette:
    surface: "cat-{slug}-surface"
    ink: "cat-{slug}-ink"
    accent: null

# px (비율 제외)
layout:
  maxWidth: 480
  minWidth: 360
  gutter: 16
  desktop:
    breakpoint: 1024
    columns: [5, 7]
    listMaxWidth: 440
  bottomActionZone:
    ratio: 0.333
    minTouch: 44
  tabBarHeight: 56
---

# DESIGN.md: Clay Grid (시안 C)

## 1. 컨셉

**오프화이트 위 클레이 한 색과 헤어라인 격자, 숫자가 표처럼 정렬된 단정한 카드.**

무드: 정돈된, 따뜻한, 명료한.

Mintlify에서 헤어라인 테두리, 작은 라운드, 굵기 500 위주와 음수 자간 제목, 큰 숫자 블록, 4px 그리드 정렬을 가져왔습니다. 개발자 도구 특유의 모노 서체와 차가운 그린은 버리고, 그 자리를 오프화이트 바탕, 클레이 포인트, 카테고리 색면 12종의 온기로 채웠습니다. 세 시안 중 정보 밀도가 가장 높지만 카드 3장, 숫자 3개, 이유 1줄 원칙은 그대로입니다.

## 2. 색 사용 규칙

### 바탕과 면

- 화면 바탕은 `background`(오프화이트, L 0.983), 카드는 `card`(거의 흰색, L 0.996)입니다. 두 면의 차이는 작고, 경계는 **`border`(텍스트색 9% 알파) 1px 헤어라인**이 만듭니다. 그림자로 카드를 띄우지 않습니다.
- 회색은 모두 hue 50~70의 따뜻한 회색입니다. shadcn 기본 중립 회색(채도 0)은 어디에도 쓰지 않습니다.
- 다크는 따뜻한 차콜(`background` L 0.205, `card` L 0.232)이고 헤어라인은 밝은 크림 8% 알파입니다.

### 포인트 컬러 (클레이, `primary` oklch(0.5 0.105 47))

| 쓰는 곳 | 쓰지 않는 곳 |
| --- | --- |
| 화면당 주 버튼 **1개**(오늘: "이 집으로", 투표방: "투표하기") | 카드 안 버튼(카드 3장이면 3개가 되므로 모두 아웃라인) |
| 하단 탭 선택 항목의 아이콘과 라벨 | 카테고리 라벨(카테고리 `ink`가 담당) |
| 득표 바 채움, 내가 고른 후보의 2px 왼쪽 표시선 | 배경 색면, 그라데이션, 큰 면 채우기 |
| 선택 칩: `accent` 바탕(캐러멜 틴트) + `primary` 글자 | 숫자(숫자는 `foreground`, 위계는 크기로) |
| 텍스트 링크, 포커스 링(`ring`) | 경고, 오류(의미 색이 담당) |

- 캐러멜 밝은 톤(`accent` oklch(0.95 0.026 68))은 선택 칩과 선택 행 바탕 틴트로만 씁니다. 버튼 바탕으로 쓰지 않습니다.

### 의미 색

- `success`: 투표 확정, 피드백 저장 완료. 실색은 체크 아이콘과 상태 점, 글자는 `success-foreground` on `success-surface`.
- `warning`: 웨이팅 제보, 기피 경고 플래그, "추정" 배지.
- `info`: 할인 정보 표시(점수 반영 0), 사용자 제보 안내.
- `destructive`: 오류 문구와 삭제 확인. 버튼 바탕으로 쓸 때도 화면당 1개.

### 실측 대비 (WCAG 2.x, oklch를 sRGB로 바꿔 계산, 2026-10-28)

| 쌍 | 라이트 | 다크 | 기준 |
| --- | --- | --- | --- |
| foreground / background | 16.32 | 15.03 | 4.5 |
| card-foreground / card | 16.94 | 14.11 | 4.5 |
| primary-foreground / primary | 6.07 | 7.10 | 4.5 |
| secondary-foreground / secondary | 13.24 | 11.70 | 4.5 |
| muted-foreground / background | 6.38 | 7.76 | 4.5 |
| muted-foreground / card | 6.63 | 7.29 | 4.5 |
| muted-foreground / muted | 5.93 | 6.54 | 4.5 |
| accent-foreground / accent | 9.59 | 9.48 | 4.5 |
| destructive / card | 6.47 | 5.87 | 4.5 |
| primary / background (경계) | 5.95 | 7.02 | 3 |
| primary / card (링크 글자) | 6.18 | 6.59 | 4.5 |
| primary / accent (선택 칩) | 5.39 | 5.38 | 4.5 |
| success-foreground / success-surface | 8.92 | 9.64 | 4.5 |
| warning-foreground / warning-surface | 7.93 | 9.82 | 4.5 |
| info-foreground / info-surface | 8.72 | 9.55 | 4.5 |
| vote-bar / vote-bar-track | 5.16 | 5.35 | 3 |
| vote-bar-foreground / vote-bar | 6.07 | 7.10 | 4.5 |
| muted-foreground / vote-bar-track | 5.53 | 5.92 | 4.5 |
| 카테고리 ink / surface 12쌍 (최저~최고) | 6.67~7.58 | 8.22~8.89 | 4.5 |

전체 쌍은 `contrastPairs`에 있고 T1.15 검사기가 다시 계산합니다. 4.5 기준 쌍 전체의 최저값은 **5.38**(다크, 선택 칩 `primary` on `accent`)로, 모든 필수 쌍이 기준보다 0.8 이상 여유가 있습니다. 3 기준 쌍 최저값은 `warning` on `card` 라이트 4.02입니다.

## 3. 타이포

- **서체**: Pretendard Variable 단일. Mintlify의 Inter 자리를 Pretendard가 맡고, 라벨용 모노 서체는 두지 않습니다. 숫자 정렬은 `tabular-nums`로 해결합니다.
- **굵기**: 500이 기본입니다. 600은 화면 제목과 식당명에만, 700 이상은 쓰지 않습니다. 위계는 굵기 차이보다 **크기와 음수 자간**으로 만듭니다.

| 단계 | 크기/행간/굵기/자간 | 쓰는 곳 |
| --- | --- | --- |
| `display` | 36 / 1.1 / 600 / -0.025em | 랜딩 첫 헤드라인 한 줄 |
| `title` | 26 / 1.15 / 600 / -0.02em | 화면 제목("오늘 점심") |
| `heading` | 18 / 1.3 / 600 / -0.02em | 카드 식당명, 시트 제목, 섹션 제목 |
| `body` | 15 / 1.5 / 400 | 시트 본문, 설명 |
| `body-sm` | 14 / 1.45 / 400 | 카드 이유 1줄, 보조 설명 |
| `label` | 14 / 1.25 / 500 | 버튼, 칩, 탭 라벨(탭은 12로 줄여 caption 사용) |
| `caption` | 12 / 1.35 / 500 | 숫자 아래 항목명, 배지, 카테고리 라벨, 메타 |
| `numeric-lg` | 24 / 1.0 / 500 / -0.02em | 카드 숫자 3개(도보 분, 가격, 👍%) |
| `numeric-md` | 17 / 1.1 / 500 / -0.01em | 득표 수, 마감 카운트다운, 시트 안 숫자 |

- **숫자와 단위**: 숫자는 `numeric-lg`(24px), 단위("분", "천원", "%")는 같은 줄 기준선에 `caption`(12px, `muted-foreground`)으로 붙입니다. 숫자:단위 크기비 2:1이 Mintlify식 수치 블록의 핵심입니다. 예: `4` + `분`, `9` + `천원대`, `87` + `%`.
- 모든 숫자에 `tabular-nums`를 켜서 NumberFlow 롤링 중에도 폭이 흔들리지 않게 합니다.

## 4. 레이아웃

- **그리드**: 모든 간격, 크기, 정렬은 4px의 배수입니다. 간격 단계는 `2xs` 4, `xs` 8, `sm` 12, `md` 16, `lg` 20, `xl` 32, `2xl` 40, `3xl` 48(px).
- **모바일 여백**: 화면 좌우 `gutter` 16px, 카드 안쪽 `md` 16px, 카드 사이 `sm` 12px, 섹션 사이 `xl` 32px, 화면 제목 위 `lg` 20px.
- **세로 리듬(390px 오늘 화면)**: 상단 바 48 + 제목 블록 72 + 카드 3장(각 약 172) + 간격 24 = 약 660px. 하단 탭 56 + 주 버튼 영역 68이 하단 1/3에 들어갑니다.
- **하단 1/3 액션 영역**: 주 버튼(높이 48, 폭 전체, 화면당 1개)과 "다시 뽑기" 보조 버튼(아웃라인 48)을 탭 바로 위에 2열로 둡니다(보조 1fr, 주 2fr). 스와이프 대체용 이전/다음 버튼(44x44)도 이 영역에 둡니다.
- **데스크톱(1024px 이상)**: 좌 리스트 5fr(최대 440px) + 우 지도 7fr. 두 단 사이는 그림자가 아닌 세로 헤어라인 1px로 나눕니다. 하단 탭은 좌측 리스트 상단의 세그먼트 탭으로 바뀝니다.
- **360px**: 카드 숫자 3칸은 `1fr 1fr 1fr`라 칸당 약 94px. `numeric-lg` 24px 숫자 3자리 + 단위가 들어갑니다. 식당명은 1줄 말줄임, 배지는 2개를 넘지 않으므로 줄바꿈하지 않습니다.

## 5. 컴포넌트 규칙

### 추천 카드

해부도(390px, 카드 폭 358px, 안쪽 16px):

```
┌──────────────────────────────────────────────┐  card, 1px border(9%), radius 8, shadow none
│ ┌──────┐  한식                      [추정][N] │  ← 행 1 (높이 56)
│ │ 일러 │  정담국밥                              │    일러스트 56x56 radius 6, 좌측
│ │ 56px │  (heading 18/600, 1줄 말줄임)          │    카테고리 라벨 caption, cat-ink 색
│ └──────┘                                       │    배지 최대 2개, 우상단 정렬
│ ─────────────────────────────────────────────  │  ← 헤어라인 (위아래 12px)
│  4 분      │  9 천원대    │  87 %             │  ← 행 2 숫자 3칸 grid 1fr 1fr 1fr
│  도보       │  1인 가격    │  👍               │    칸 사이 1px 세로 헤어라인, 왼쪽 정렬
│                                               │
│ 지난주 👍한 국밥, 웨이팅 제보 없음              │  ← 행 3 이유 1줄 body-sm muted, 말줄임
│ ┌───────────────┐                             │
│ │  길찾기        │ (아웃라인 버튼 40, 선택)     │  ← 행 4 (오늘 화면에서는 생략 가능)
└──────────────────────────────────────────────┘
```

- **행 1**: 왼쪽 일러스트 칸 56x56(데스크톱 64x64), 카테고리 `surface` 색면, 칸 라운드 6px(`md`). 오른쪽에 12px 띄우고 카테고리 라벨(`caption`, `cat-<slug>-ink`) 위, 식당명(`heading`) 아래, 두 줄이 일러스트 칸 높이 안에서 세로 가운데 정렬됩니다. 배지는 행 1 오른쪽 위 끝에 붙고, 식당명은 배지 폭을 피해 말줄임합니다.
- **행 2(숫자 표)**: `grid-template-columns: repeat(3, 1fr)`, 칸 안쪽 왼쪽 12px(첫 칸 0), 칸 사이 `border-left` 1px 헤어라인. 각 칸은 위에 숫자+단위(`numeric-lg` + `caption`), 아래 4px 띄워 항목명(`caption`, `muted-foreground`). 세 칸의 숫자 기준선이 한 줄에 맞도록 행간 1.0을 씁니다. 문자 구분자(점, 가운뎃점)는 쓰지 않습니다.
- **행 3**: 이유 한 줄(`body-sm`, `muted-foreground`), 숫자 표 아래 12px. 두 줄이 되면 말줄임합니다.
- **상태**: 기본 `card` + `border`. 호버(데스크톱) 테두리가 `input`(14%)로 진해집니다. 눌림 `scale 0.99` + `press` 스프링, 바탕 변화 없음. 선택(투표 후보 등) 테두리 1.5px `primary` + 왼쪽 2px 표시선. 포커스 `ring` 2px 바깥 오프셋 2px. 비활성(폐업 의심) 전체 투명도 55%, 일러스트 칸 채도 제거 없이 그대로.

### 버튼

- 높이 48(주), 40(카드 안), 라운드 8(`button: lg`), 라벨 `label` 14/500. 그림자 없음.
- **주 버튼**: `primary` 바탕, `primary-foreground` 글자. 화면당 1개. 눌림 시 L을 0.03 낮춘 면(`color-mix(in oklch, var(--primary) 92%, var(--foreground))`)과 `press` 스프링 scale 0.98.
- **아웃라인 버튼**: `card` 바탕 + 1px `input` 테두리 + `foreground` 글자. 눌림 시 바탕 `muted`.
- **고스트 버튼**: 테두리 없이 `muted-foreground` 글자, 눌림 시 `muted` 바탕.
- 비활성: 투명도 45%, 커서 기본. 포커스: `ring` 2px, 오프셋 2px(바탕색).

### 칩

- 높이 32(터치 영역은 상하 패딩으로 44 확보), 라운드 6(`chip: md`), 좌우 12px, `label`.
- 기본: `card` 바탕 + 1px `border`, `foreground` 글자. 선택: `accent` 바탕(캐러멜 틴트) + `primary` 글자 + 1px `primary` 30% 알파 테두리, 앞에 체크 아이콘 14px. 눌림: `muted` 바탕. 비활성: 투명도 45%.

### 바텀시트

- Base UI Drawer. 위쪽 라운드 16(`sheet: 3xl`), `card` 바탕, 맨 위 1px 헤어라인과 `shadow.sheet`(라이트 4% 이하)로만 뜨게 합니다.
- 손잡이 36x4 radius 2 `input` 색, 위 8px. 스냅 포인트 40%와 90%. 시트 헤더는 카드 행 1과 같은 구조(일러스트 64 + 라벨 + 식당명)를 재사용해 카드에서 시트로 이어지는 느낌을 줍니다.
- 뒤 딤은 `overlay`(라이트 36%, 다크 60%). 열림은 `sheet` 스프링, 닫힘은 `exit` 이징 150ms.

### 하단 탭

- 높이 56 + 안전 영역, `background` 바탕, 위 1px 헤어라인, 그림자 없음. 탭 4개(오늘, 지도, 투표, 나) 균등 폭.
- 아이콘 22px Lucide(선 1.75) + 라벨 `caption` 12/500. 기본 `muted-foreground`, 선택 `primary`(아이콘과 라벨). 선택 표시는 아이콘 위 16x2 `primary` 막대 하나로, 알약 배경은 쓰지 않습니다. 눌림 시 아이콘만 scale 0.92.

### 득표 바

- 후보 행: 높이 56, 왼쪽 일러스트 32x32(radius 4) + 식당명 `label`, 오른쪽 끝 득표 수 `numeric-md`(NumberFlow). 행 아래 4px 높이 막대.
- 막대: 트랙 `vote-bar-track` radius 2, 채움 `vote-bar` radius 2, 길이는 `bar` 스프링. 1위 막대만 높이 6px. 내가 고른 후보는 행 왼쪽 2px `primary` 표시선.
- 바 안에 숫자를 넣는 넓은 바(결과 화면, 높이 28)는 채움 위 `vote-bar-foreground`, 트랙 위 `muted-foreground` 숫자.

### 배지

- 높이 20, 라운드 4(`badge: sm`), 좌우 6px, `caption`. 카드당 최대 2개, 행 1 우상단.
- 종류별 색: "추정" `warning-foreground` on `warning-surface`, "할인" `info-foreground` on `info-surface`, "새로 생김" `secondary-foreground` on `secondary`. 테두리 없음, 아이콘은 12px까지.

## 6. 카테고리 일러스트 시스템

- **화풍**: 단정한 플랫 아이콘형. 64x64 정사각 viewBox, 원, 반원, 둥근 사각형 같은 기하 도형만으로 그립니다. 외곽선 없음(`strokeWidth: 0`), 2~3톤 면.
- **톤 규칙**: 한 카테고리 안에서 색상(hue)은 하나입니다. `cat-<slug>-surface`가 칸 바탕, `cat-<slug>-ink`가 그릇과 주 형태, 그 사이 중간 톤(`color-mix(in oklch, ink 55%, surface)`)이 음식, 옅은 톤(ink 22%)이 밥알, 김 같은 보조 면입니다. hex는 쓰지 않습니다.
- **다크**: 같은 공식이 다크에서는 밝은 ink와 어두운 surface로 뒤집혀 음화처럼 보입니다. 그릇이 밝아지고 바탕이 차콜 색면이 되어 다크 카드 위에서 눈부시지 않습니다.
- **구도**: 그릇이나 접시는 항상 아래쪽 중앙(바닥선 y 50 근처)에 놓고, 음식은 그 위로 올립니다. 12종이 같은 바닥선과 비슷한 외곽 크기(폭 40~48)를 공유해 한 줄에 놓여도 가족처럼 보입니다.
- **비율**: 카드 높이의 약 36%(56px 칸, 카드 약 172px). A처럼 카드 위를 채우지 않고, 숫자 표와 같은 행에서 균형을 맞춥니다(PRD 8.3: 시각적 주인공은 일러스트, 정보 주인공은 식당명과 숫자).
- **마스코트 금지**: 얼굴, 눈, 손, 캐릭터 없음. 음식과 그릇만.

| slug | 모티프 |
| --- | --- |
| hansik | 밥공기 하나와 작은 반찬 접시 둘 |
| jungsik | 넓은 면기 위 짜장 면과 단무지 한 조각 |
| ilsik | 직사각 접시 위 초밥 두 점 |
| yangsik | 둥근 접시 위 말아 올린 파스타와 포크 |
| bunsik | 떡볶이 접시와 김밥 단면 |
| gukbap | 손잡이 달린 뚝배기와 김 세 줄 |
| gogi | 둥근 불판 격자 위 고기 두 점 |
| asian | 깊은 면기 위 쌀국수 면과 고수 잎, 젓가락 |
| fastfood | 번, 패티, 치즈가 쌓인 버거 |
| salad | 볼 위 잎채소와 방울토마토 |
| cafe | 손잡이 컵과 크루아상 |
| pub | 맥주잔과 꼬치 안주 접시 |

## 7. 모션

**성격: 빠르고 정확하게.** 150~200ms, 오버슈트 없는 임계 감쇠 스프링, 숫자는 굴러가며 바뀝니다.

| 지점 | 프리셋 | 설명 |
| --- | --- | --- |
| 카드 스와이프와 되돌림 | `spring.swipe` (520/44/0.9) | 손을 떼면 튕김 없이 정확히 자리로. 이전/다음 버튼은 같은 프리셋 |
| 다시 뽑기(셔플) | `spring.shuffle` + `stagger` 24ms | 카드 3장이 4px 아래에서 위로 페이드 인, 순서대로. 숫자는 NumberFlow로 새 값까지 굴러감 |
| 바텀시트 | `spring.sheet` (420/42/1) | 스냅 지점에 바로 멈춤. 닫힘은 `exit` 150ms |
| 득표 바 | `spring.bar` (300/36/1) | 길이 변화와 NumberFlow 득표 수가 같은 프레임에 시작 |
| 눌림 | `spring.press` | scale 0.98(버튼), 0.99(카드) |
| 화면, 탭 전환 | `duration.base` 175ms + `standard` | 8px 이동 + 페이드. 레이아웃 전환(Motion `layout`)은 후보 정렬 바뀔 때만 |
| 확정 축하 | `duration.slow` 200ms | 체크 아이콘이 그려지고(경로 길이) canvas-confetti는 클레이와 카테고리 ink 2색, 입자 40개 이하 1회 |

- **동적 컴포넌트(tasks.md 2.4)**: Motion(`m` + `LazyMotion`), NumberFlow(카드 숫자, 득표 수, 카운트다운, 👍%), Base UI Drawer, canvas-confetti(확정 순간만, 동적 import), Sonner(토스트, 하단 액션 영역 위 8px).
- 홈 첫 화면에서 동시에 움직이는 것은 셔플 등장과 NumberFlow 두 가지뿐입니다.
- **reduced motion**: 모든 전환은 즉시 상태 변화. NumberFlow는 `animated={false}`, 득표 바는 최종 길이로 바로, 컨페티는 생략하고 체크 아이콘만 표시합니다.

## 8. 문구 톤

tasks.md 2.2절 규칙을 따릅니다(습니다체 약 7, 해요체 약 3, Em dash와 가운뎃점 금지, 카드 메타는 간격과 세로 헤어라인으로 구분). 이 시안은 짧고 사실 위주로, 숫자가 말하게 둡니다.

- 추천 이유: `도보 약 4분, 지난주 👍한 국밥`
- 빈 상태: `도보 10분 안에 조건에 맞는 식당이 없습니다. 15분까지 넓혀볼까요?`
- 확정 축하: `오늘 점심은 정담국밥으로 정했어요!`

## 9. Do / Don't

**Do**

- 모든 간격과 크기를 4px 배수로 맞추고, 카드 숫자 3칸의 기준선을 한 줄에 맞춥니다.
- 경계는 헤어라인(알파 9%)과 면 톤 차이로 만들고, 그림자는 시트와 떠 있는 팝오버에만 씁니다.
- 숫자는 크게(24), 단위는 작게(12), 굵기는 500으로 두고 `tabular-nums`를 켭니다.
- 차갑지 않게: 회색은 hue 50~70의 따뜻한 회색만 쓰고, 일러스트 칸의 카테고리 색면을 빼지 않습니다.
- 카드 안 버튼은 아웃라인으로 두어 화면의 클레이 버튼을 1개로 유지합니다.

**Don't**

- 모노 서체, 코드 블록 미학, 대문자 자간 라벨을 가져오지 않습니다(Mintlify에서 버린 것).
- 라운드를 12px보다 키우지 않습니다(시트 위쪽 16px만 예외). 알약 버튼은 쓰지 않습니다.
- 굵기 700 이상으로 위계를 만들지 않습니다. 위계는 크기와 자간으로 만듭니다.
- 숫자 칸 사이에 점이나 가운뎃점 문자를 넣지 않습니다. 1px 세로 헤어라인만 씁니다.
- 일러스트에 외곽선, 그라데이션, 하이라이트 광택을 넣지 않습니다. 한 카테고리에 색상(hue)은 하나입니다.
