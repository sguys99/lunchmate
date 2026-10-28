---
# 시안 A "Terracotta Table" (T1.4). 형식: docs/design/candidates/FORMAT.md, 검증: src/lib/design/schema.ts
# 주 레퍼런스: 스타벅스(따뜻한 중립 배경, 단일 포인트 + 알파 틴트, 알약 버튼, 얕은 2겹 그림자, 큰 채색 일러스트 면)
schema: 1

meta:
  id: a
  name: Terracotta Table
  concept: 크림 바탕에 테라코타 한 색, 손맛 있는 그림이 먼저 보이는 식탁
  mood: [따뜻한, 손맛, 활기]
  version: 0.1.0
  status: candidate
  basedOn: []

color:
  light:
    shadcn:
      background: "oklch(0.972 0.016 82)"
      foreground: "oklch(0.27 0.028 48)"
      card: "oklch(0.993 0.007 85)"
      card-foreground: "oklch(0.27 0.028 48)"
      popover: "oklch(0.993 0.007 85)"
      popover-foreground: "oklch(0.27 0.028 48)"
      primary: "oklch(0.53 0.135 40)"
      primary-foreground: "oklch(0.99 0.008 85)"
      secondary: "oklch(0.94 0.024 72)"
      secondary-foreground: "oklch(0.31 0.03 48)"
      muted: "oklch(0.948 0.018 78)"
      muted-foreground: "oklch(0.47 0.03 52)"
      accent: "oklch(0.935 0.034 48)"
      accent-foreground: "oklch(0.42 0.11 40)"
      destructive: "oklch(0.5 0.19 22)"
      border: "oklch(0.895 0.02 75)"
      input: "oklch(0.86 0.024 70)"
      ring: "oklch(0.58 0.13 40)"
      chart-1: "oklch(0.53 0.135 40)"
      chart-2: "oklch(0.64 0.11 52)"
      chart-3: "oklch(0.75 0.08 68)"
      chart-4: "oklch(0.44 0.08 45)"
      chart-5: "oklch(0.35 0.04 50)"
      sidebar: "oklch(0.96 0.018 80)"
      sidebar-foreground: "oklch(0.27 0.028 48)"
      sidebar-primary: "oklch(0.53 0.135 40)"
      sidebar-primary-foreground: "oklch(0.99 0.008 85)"
      sidebar-accent: "oklch(0.935 0.034 48)"
      sidebar-accent-foreground: "oklch(0.42 0.11 40)"
      sidebar-border: "oklch(0.895 0.02 75)"
      sidebar-ring: "oklch(0.58 0.13 40)"
    app:
      success: "oklch(0.53 0.09 145)"
      success-surface: "oklch(0.95 0.03 140)"
      success-foreground: "oklch(0.37 0.07 145)"
      warning: "oklch(0.6 0.12 68)"
      warning-surface: "oklch(0.95 0.045 82)"
      warning-foreground: "oklch(0.41 0.085 62)"
      info: "oklch(0.52 0.07 240)"
      info-surface: "oklch(0.952 0.018 240)"
      info-foreground: "oklch(0.39 0.065 240)"
      vote-bar: "oklch(0.53 0.135 40)"
      vote-bar-track: "oklch(0.91 0.026 70)"
      vote-bar-foreground: "oklch(0.99 0.008 85)"
      skeleton: "oklch(0.93 0.02 78)"
      skeleton-highlight: "oklch(0.965 0.014 82)"
      overlay: "oklch(0.22 0.02 50 / 45%)"
    category:
      gogi: { surface: "oklch(0.93 0.034 18)", ink: "oklch(0.42 0.1 18)" }
      jungsik: { surface: "oklch(0.93 0.036 30)", ink: "oklch(0.42 0.11 30)" }
      bunsik: { surface: "oklch(0.935 0.034 44)", ink: "oklch(0.43 0.11 44)" }
      hansik: { surface: "oklch(0.93 0.042 58)", ink: "oklch(0.42 0.09 58)" }
      cafe: { surface: "oklch(0.925 0.035 68)", ink: "oklch(0.4 0.07 62)" }
      yangsik: { surface: "oklch(0.935 0.048 82)", ink: "oklch(0.43 0.085 78)" }
      fastfood: { surface: "oklch(0.935 0.05 95)", ink: "oklch(0.42 0.08 90)" }
      salad: { surface: "oklch(0.93 0.045 128)", ink: "oklch(0.41 0.085 132)" }
      asian: { surface: "oklch(0.93 0.035 165)", ink: "oklch(0.41 0.07 165)" }
      ilsik: { surface: "oklch(0.93 0.026 225)", ink: "oklch(0.41 0.065 235)" }
      gukbap: { surface: "oklch(0.925 0.022 275)", ink: "oklch(0.41 0.06 280)" }
      pub: { surface: "oklch(0.925 0.032 350)", ink: "oklch(0.41 0.09 352)" }
  dark:
    shadcn:
      background: "oklch(0.215 0.011 52)"
      foreground: "oklch(0.94 0.014 80)"
      card: "oklch(0.255 0.013 52)"
      card-foreground: "oklch(0.94 0.014 80)"
      popover: "oklch(0.27 0.013 52)"
      popover-foreground: "oklch(0.94 0.014 80)"
      primary: "oklch(0.7 0.12 45)"
      primary-foreground: "oklch(0.2 0.015 45)"
      secondary: "oklch(0.3 0.014 55)"
      secondary-foreground: "oklch(0.93 0.014 80)"
      muted: "oklch(0.29 0.012 55)"
      muted-foreground: "oklch(0.76 0.022 72)"
      accent: "oklch(0.315 0.04 45)"
      accent-foreground: "oklch(0.88 0.06 52)"
      destructive: "oklch(0.71 0.16 24)"
      border: "oklch(0.94 0.014 80 / 11%)"
      input: "oklch(0.94 0.014 80 / 16%)"
      ring: "oklch(0.66 0.12 45)"
      chart-1: "oklch(0.7 0.12 45)"
      chart-2: "oklch(0.62 0.1 52)"
      chart-3: "oklch(0.54 0.08 60)"
      chart-4: "oklch(0.8 0.08 62)"
      chart-5: "oklch(0.88 0.05 75)"
      sidebar: "oklch(0.235 0.012 52)"
      sidebar-foreground: "oklch(0.94 0.014 80)"
      sidebar-primary: "oklch(0.7 0.12 45)"
      sidebar-primary-foreground: "oklch(0.2 0.015 45)"
      sidebar-accent: "oklch(0.315 0.04 45)"
      sidebar-accent-foreground: "oklch(0.88 0.06 52)"
      sidebar-border: "oklch(0.94 0.014 80 / 11%)"
      sidebar-ring: "oklch(0.66 0.12 45)"
    app:
      success: "oklch(0.73 0.1 145)"
      success-surface: "oklch(0.3 0.035 145)"
      success-foreground: "oklch(0.87 0.07 145)"
      warning: "oklch(0.79 0.11 75)"
      warning-surface: "oklch(0.32 0.04 72)"
      warning-foreground: "oklch(0.89 0.07 82)"
      info: "oklch(0.73 0.07 240)"
      info-surface: "oklch(0.3 0.03 240)"
      info-foreground: "oklch(0.87 0.045 240)"
      vote-bar: "oklch(0.7 0.12 45)"
      vote-bar-track: "oklch(0.31 0.016 55)"
      vote-bar-foreground: "oklch(0.2 0.015 45)"
      skeleton: "oklch(0.285 0.012 55)"
      skeleton-highlight: "oklch(0.325 0.014 55)"
      overlay: "oklch(0.1 0.008 50 / 62%)"
    category:
      gogi: { surface: "oklch(0.31 0.035 18)", ink: "oklch(0.86 0.06 18)" }
      jungsik: { surface: "oklch(0.31 0.037 30)", ink: "oklch(0.86 0.065 30)" }
      bunsik: { surface: "oklch(0.315 0.04 44)", ink: "oklch(0.87 0.065 44)" }
      hansik: { surface: "oklch(0.315 0.036 58)", ink: "oklch(0.87 0.06 60)" }
      cafe: { surface: "oklch(0.31 0.03 66)", ink: "oklch(0.86 0.05 68)" }
      yangsik: { surface: "oklch(0.32 0.038 82)", ink: "oklch(0.88 0.065 84)" }
      fastfood: { surface: "oklch(0.32 0.038 95)", ink: "oklch(0.88 0.065 96)" }
      salad: { surface: "oklch(0.315 0.036 130)", ink: "oklch(0.87 0.065 130)" }
      asian: { surface: "oklch(0.31 0.03 165)", ink: "oklch(0.86 0.055 165)" }
      ilsik: { surface: "oklch(0.31 0.026 230)", ink: "oklch(0.86 0.045 230)" }
      gukbap: { surface: "oklch(0.305 0.024 278)", ink: "oklch(0.86 0.04 278)" }
      pub: { surface: "oklch(0.305 0.032 350)", ink: "oklch(0.86 0.055 350)" }

# 대비 검사(T1.15) 대상. 필수 쌍은 뺄 수 없습니다. 실측값은 본문 2절 표.
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
  - { fg: primary, bg: background, min: 3, note: 포인트 컬러 아이콘과 테두리 }
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
  # 시안 A 추가 쌍
  - { fg: foreground, bg: muted, min: 4.5, note: 스켈레톤이 아닌 muted 면 위 본문 }
  - { fg: foreground, bg: secondary, min: 4.5, note: 보조 버튼 위 글자 }
  - { fg: accent-foreground, bg: background, min: 4.5, note: 선택 칩 글자가 바탕에 걸칠 때 }
  - { fg: accent-foreground, bg: card, min: 4.5, note: 카드 안 텍스트 버튼(투표에 넣기) }
  - { fg: primary, bg: card, min: 3, note: 카드 위 포인트 아이콘과 테두리 }
  - { fg: primary, bg: accent, min: 3, note: 선택 칩 테두리와 체크 }
  - { fg: muted-foreground, bg: secondary, min: 4.5, note: 보조 버튼 안 보조 글자 }
  - { fg: warning-foreground, bg: card, min: 4.5, note: 웨이팅 배지 글자(바탕 없이) }
  - { fg: success-foreground, bg: card, min: 4.5, note: 확정 표시 글자 }
  - { fg: card-foreground, bg: cat-hansik-surface, min: 4.5, note: 일러스트 면 위 식당명이 겹칠 때 대표 확인 }
  - { fg: card-foreground, bg: cat-yangsik-surface, min: 4.5 }
  - { fg: card-foreground, bg: cat-ilsik-surface, min: 4.5 }
  - { fg: card-foreground, bg: cat-pub-surface, min: 4.5 }

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
  display: { size: 2, lineHeight: 1.2, weight: 700, tracking: -0.025, font: heading }
  title: { size: 1.5, lineHeight: 1.3, weight: 700, tracking: -0.018, font: heading }
  heading: { size: 1.25, lineHeight: 1.35, weight: 650, tracking: -0.012, font: heading }
  body: { size: 0.9375, lineHeight: 1.55, weight: 400, tracking: -0.003, font: sans }
  body-sm: { size: 0.875, lineHeight: 1.5, weight: 450, tracking: -0.002, font: sans }
  label: { size: 0.9375, lineHeight: 1.25, weight: 600, tracking: -0.005, font: sans }
  caption: { size: 0.75, lineHeight: 1.4, weight: 500, tracking: 0.005, font: sans }
  numeric-lg: { size: 1.75, lineHeight: 1.05, weight: 700, tracking: -0.03, font: numeric }
  numeric-md: { size: 1.125, lineHeight: 1.2, weight: 650, tracking: -0.015, font: numeric }

# rem
space:
  base: 0.25
  scale: { 2xs: 0.25, xs: 0.5, sm: 0.75, md: 1, lg: 1.25, xl: 2, 2xl: 2.5, 3xl: 4 }

# base 1rem = 16px. 카드 xl 20px, 시트 3xl 28px, 버튼과 칩은 알약
radius:
  base: 1
  scale: { sm: 0.5, md: 0.75, lg: 1, xl: 1.25, 2xl: 1.5, 3xl: 1.75, 4xl: 2 }
  components: { card: xl, button: full, chip: full, badge: sm, input: md, sheet: 3xl, tab-bar: none }

# 얕은 2겹: 0.5px 윤곽 그림자 + 짧은 낙하 그림자. 스택 뒤 카드만 lg
shadow:
  light:
    sm: "0 0 0 0.5px oklch(0.27 0.028 48 / 10%), 0 1px 2px oklch(0.27 0.028 48 / 8%)"
    md: "0 0 0 0.5px oklch(0.27 0.028 48 / 12%), 0 2px 4px -1px oklch(0.27 0.028 48 / 12%)"
    lg: "0 0 0 0.5px oklch(0.27 0.028 48 / 12%), 0 10px 22px -10px oklch(0.27 0.028 48 / 26%)"
    sheet: "0 -0.5px 0 oklch(0.27 0.028 48 / 10%), 0 -6px 20px -6px oklch(0.27 0.028 48 / 14%)"
  dark:
    sm: "0 0 0 0.5px oklch(0.94 0.014 80 / 7%), 0 1px 2px oklch(0.1 0.008 50 / 45%)"
    md: "0 0 0 0.5px oklch(0.94 0.014 80 / 9%), 0 2px 4px -1px oklch(0.1 0.008 50 / 55%)"
    lg: "0 0 0 0.5px oklch(0.94 0.014 80 / 9%), 0 12px 24px -10px oklch(0.08 0.008 50 / 70%)"
    sheet: "0 -0.5px 0 oklch(0.94 0.014 80 / 10%), 0 -8px 24px -6px oklch(0.08 0.008 50 / 60%)"

# px
border: { hairline: 0.5, default: 1, strong: 1.5 }

motion:
  duration: { fast: 160, base: 220, slow: 260 }
  easing:
    standard: [0.25, 0.1, 0.25, 1]
    enter: [0.22, 1, 0.36, 1]
    exit: [0.4, 0, 0.9, 0.6]
    emphasized: [0.34, 1.4, 0.64, 1]
  spring:
    swipe: { stiffness: 420, damping: 30, mass: 1 }
    sheet: { stiffness: 340, damping: 34, mass: 1 }
    shuffle: { stiffness: 320, damping: 20, mass: 0.9 }
    press: { stiffness: 700, damping: 38, mass: 0.5 }
    bar: { stiffness: 200, damping: 24, mass: 1 }
  stagger: 50
  reducedMotion: instant

illustration:
  style: painted
  strokeWidth: 0
  cardAreaRatio: 0.48
  placement: top
  palette:
    surface: "cat-{slug}-surface"
    ink: "cat-{slug}-ink"
    accent: primary

# px (비율 제외)
layout:
  maxWidth: 480
  minWidth: 360
  gutter: 20
  desktop:
    breakpoint: 1024
    columns: [2, 3]
    listMaxWidth: 460
  bottomActionZone:
    ratio: 0.333
    minTouch: 48
  tabBarHeight: 64
---

# DESIGN.md: 시안 A "Terracotta Table"

## 1. 컨셉

**크림 바탕에 테라코타 한 색, 손맛 있는 그림이 먼저 보이는 식탁**

무드: 따뜻한, 손맛, 활기

스타벅스에서 순백이 아닌 따뜻한 중립 배경, 포인트 한 색과 그 알파 틴트로 만드는 색 체계, 알약 버튼, 0.5px 윤곽과 짧은 낙하 그림자 2겹, 큰 면을 차지하는 채색 일러스트를 가져왔습니다. 녹색 포인트와 프로모션 블록을 연달아 쌓는 밀도는 버리고, 한 화면에는 카드 스택 하나와 행동 하나만 둡니다. 세 시안 중 가장 "식탁 위 음식"이 먼저 보이는 안이며, 인상은 그림이 만들고 결정은 숫자가 돕습니다.

## 2. 색 사용 규칙

### 2.1 바탕과 글자

| 역할 | 라이트 | 다크 | 쓰는 곳 |
| --- | --- | --- | --- |
| `background` | 크림 oklch(0.972 0.016 82) | 따뜻한 차콜 oklch(0.215 0.011 52) | 화면 바탕 |
| `card` | 한 단계 밝은 크림 oklch(0.993 0.007 85) | oklch(0.255 0.013 52) | 추천 카드, 시트, 팝오버 |
| `foreground` | 갈흑 oklch(0.27 0.028 48) | 샌드 화이트 oklch(0.94 0.014 80) | 식당명, 숫자, 본문 |
| `muted-foreground` | oklch(0.47 0.03 52) | oklch(0.76 0.022 72) | 단위(분, 원대), 메타, 보조 설명 |
| `border` | oklch(0.895 0.02 75) | 샌드 화이트 11% 알파 | 입력, 구분선. 카드에는 쓰지 않고 그림자 윤곽으로 대신 |

순백과 순흑은 쓰지 않습니다. 카드는 바탕보다 한 단계 밝고, 깊이는 테두리가 아니라 그림자 윤곽(0.5px)으로 만듭니다.

### 2.2 포인트 컬러 (테라코타)

- 값: 라이트 `primary` oklch(0.53 0.135 40), 다크 oklch(0.70 0.12 45). 다크는 밝기를 0.17 올리고 채도를 0.015 낮춰 차콜 위에서 번지지 않게 했습니다. 다크의 `primary-foreground`는 짙은 갈색이라 버튼 글자가 어둡습니다.
- **쓰는 곳**: 화면당 하나뿐인 주 버튼(오늘은 "길찾기", 투표방은 "투표하기", 시트는 "여기로 정하기"), 하단 탭 활성 아이콘과 라벨, 득표 바 채움, 포커스 링, 일러스트 속 포인트 한 점(김치, 연어, 토마토 소스 등).
- **틴트**: 선택 상태와 배지 바탕은 `accent` oklch(0.935 0.034 48)(테라코타 약 10% 느낌의 크림)와 `accent-foreground` oklch(0.42 0.11 40)로 칠합니다. 포인트 실색 면은 주 버튼 한 곳뿐입니다.
- **쓰지 않는 곳**: 보조 버튼, 칩 기본 상태, 카드 테두리, 제목 글자, 넓은 배경 면, 링크 밑줄. 오류 표현에도 쓰지 않습니다.
- `chart-1~5`, `ring`, `sidebar-primary`는 테라코타 색상환(H 40~68) 안의 명도 변주만 씁니다.

### 2.3 의미 색

| 색 | 용도 | 비고 |
| --- | --- | --- |
| `destructive` oklch(0.50 0.19 22) | 오류 문구, 신고, 삭제 확인 | 테라코타(H 40)와 혼동되지 않게 H 22로 붉게, 채도를 높였습니다. 오류는 항상 아이콘과 문장을 함께 둡니다 |
| `success` 계열 (H 145, 올리브 녹색) | 투표 확정, 완료 체크 | 채도 0.09로 낮춰 흙빛 팔레트에 섞이게 했습니다 |
| `warning` 계열 (H 62~82, 꿀색) | 웨이팅 제보, 기피 경고, 가격 추정 배지 | 배지는 `warning-surface` + `warning-foreground` |
| `info` 계열 (H 240, 흐린 청회색) | 할인 정보, 제보 안내 | 할인은 표시만 합니다. 포인트 색으로 강조하지 않습니다(추천과 광고 분리) |
| `vote-bar` / `vote-bar-track` | 득표 바 | 채움은 `primary`, 트랙은 oklch(0.91 0.026 70) |
| `skeleton` / `skeleton-highlight` | 스켈레톤 | 바탕보다 살짝 어둡고 쉬머는 카드색에 가깝게 |
| `overlay` | 시트 뒤 딤 | 라이트 갈흑 45%, 다크 62% |

### 2.4 카테고리 색면

12색은 채도 0.022~0.05로 낮게 두고 색상(H)만 나눴습니다. 붉은 쪽(고기 18, 중식 30, 분식 44, 한식 58)에서 노랑(카페 68, 양식 82, 패스트푸드 95), 녹색(샐러드 128, 아시안 165), 푸른 쪽(일식 225, 국밥/탕 275, 술집 350) 순서로 돌아갑니다. 국밥/탕은 뚝배기의 어두운 돌빛을 떠올리게 슬레이트 계열로 두었습니다. `ink`는 같은 색상에 L 0.40~0.43(라이트) / 0.86~0.88(다크)입니다.

### 2.5 대비 실측 (WCAG 2.x, oklch를 sRGB로 바꿔 계산, 모든 색 sRGB 범위 안)

가장 여유가 적은 쌍은 `primary-foreground / primary` 5.44(라이트, 필요값 대비 1.21배)이고, 그 외 4.5 쌍은 모두 5.7 이상, 3 쌍은 모두 3.9 이상입니다.

| 쌍 (fg / bg) | 최소 | 라이트 | 다크 |
| --- | --- | --- | --- |
| `foreground / background` | 4.5 | 13.99 | 14.71 |
| `card-foreground / card` | 4.5 | 14.88 | 13.26 |
| `popover-foreground / popover` | 4.5 | 14.88 | 12.67 |
| `primary-foreground / primary` | 4.5 | 5.44 | 6.52 |
| `secondary-foreground / secondary` | 4.5 | 11.11 | 11.13 |
| `muted-foreground / background` | 4.5 | 6.35 | 8.15 |
| `muted-foreground / card` | 4.5 | 6.75 | 7.35 |
| `muted-foreground / muted` | 4.5 | 5.91 | 6.58 |
| `accent-foreground / accent` | 4.5 | 7.28 | 8.99 |
| `destructive / background` | 4.5 | 6.12 | 6.35 |
| `destructive / card` | 4.5 | 6.51 | 5.72 |
| `primary / background` | 3 | 5.17 | 6.30 |
| `ring / background` | 3 | 4.17 | 5.40 |
| `sidebar-foreground / sidebar` | 4.5 | 13.50 | 14.01 |
| `sidebar-primary-foreground / sidebar-primary` | 4.5 | 5.44 | 6.52 |
| `sidebar-accent-foreground / sidebar-accent` | 4.5 | 7.28 | 8.99 |
| `success-foreground / success-surface` | 4.5 | 8.83 | 9.30 |
| `warning-foreground / warning-surface` | 4.5 | 7.81 | 9.15 |
| `info-foreground / info-surface` | 4.5 | 8.29 | 9.22 |
| `success / card` | 3 | 4.97 | 6.87 |
| `warning / card` | 3 | 3.97 | 8.07 |
| `info / card` | 3 | 5.34 | 6.69 |
| `vote-bar / vote-bar-track` | 3 | 4.28 | 4.74 |
| `vote-bar-foreground / vote-bar` | 4.5 | 5.44 | 6.52 |
| `cat-hansik-ink / cat-hansik-surface` | 4.5 | 7.03 | 8.70 |
| `cat-jungsik-ink / cat-jungsik-surface` | 4.5 | 7.18 | 8.53 |
| `cat-ilsik-ink / cat-ilsik-surface` | 4.5 | 7.13 | 8.63 |
| `cat-yangsik-ink / cat-yangsik-surface` | 4.5 | 6.77 | 8.84 |
| `cat-bunsik-ink / cat-bunsik-surface` | 4.5 | 6.95 | 8.68 |
| `cat-gukbap-ink / cat-gukbap-surface` | 4.5 | 7.16 | 8.74 |
| `cat-gogi-ink / cat-gogi-surface` | 4.5 | 7.17 | 8.53 |
| `cat-asian-ink / cat-asian-surface` | 4.5 | 7.02 | 8.67 |
| `cat-fastfood-ink / cat-fastfood-surface` | 4.5 | 7.03 | 8.86 |
| `cat-salad-ink / cat-salad-surface` | 4.5 | 7.06 | 8.78 |
| `cat-cafe-ink / cat-cafe-surface` | 4.5 | 7.49 | 8.59 |
| `cat-pub-ink / cat-pub-surface` | 4.5 | 7.34 | 8.68 |
| `foreground / muted` | 4.5 | 13.03 | 11.86 |
| `foreground / secondary` | 4.5 | 12.70 | 11.47 |
| `accent-foreground / background` | 4.5 | 8.19 | 12.06 |
| `accent-foreground / card` | 4.5 | 8.71 | 10.86 |
| `primary / card` | 3 | 5.49 | 5.68 |
| `primary / accent` | 3 | 4.59 | 4.70 |
| `muted-foreground / secondary` | 4.5 | 5.77 | 6.36 |
| `warning-foreground / card` | 4.5 | 8.87 | 11.34 |
| `success-foreground / card` | 4.5 | 9.92 | 10.93 |
| `card-foreground / cat-hansik-surface` | 4.5 | 12.25 | 10.93 |
| `card-foreground / cat-yangsik-surface` | 4.5 | 12.52 | 10.66 |
| `card-foreground / cat-ilsik-surface` | 4.5 | 12.43 | 10.96 |
| `card-foreground / cat-pub-surface` | 4.5 | 12.01 | 11.40 |

## 3. 타이포

- **서체**: Pretendard Variable 단일. 제목, 본문, 숫자 모두 같은 서체이고 위계는 크기와 굵기로만 만듭니다. 스타벅스의 큰 헤드라인 한 줄 + 짧은 설명 리듬을 따라 제목은 700, 본문은 400으로 굵기 차이를 분명히 둡니다.
- **숫자**: `font-variant-numeric: tabular-nums`. 숫자와 단위는 크기를 나눕니다. 예: "4"는 `numeric-lg`(28px/700), "분"은 `caption`(12px/500, `muted-foreground`)을 숫자 기준선에 맞춰 붙입니다. 가격은 "9천" `numeric-lg` + "원대" caption, 👍 비율은 "87" `numeric-lg` + "%" caption.

| 단계 | 크기/행간/굵기/자간 | 쓰는 곳 |
| --- | --- | --- |
| `display` | 32px / 1.2 / 700 / -0.025em | 랜딩 첫 문장, 확정 축하 화면 식당명 |
| `title` | 24px / 1.3 / 700 / -0.018em | 화면 제목("오늘 점심"), 시트 식당명 |
| `heading` | 20px / 1.35 / 650 / -0.012em | 추천 카드 식당명, 섹션 제목 |
| `body` | 15px / 1.55 / 400 | 본문, 상세 정보 |
| `body-sm` | 14px / 1.5 / 450 | 카드 이유 한 줄, 빈 상태 설명 |
| `label` | 15px / 1.25 / 600 | 버튼, 탭 라벨(탭은 12px로 축소 사용), 칩 |
| `caption` | 12px / 1.4 / 500 / +0.005em | 숫자 단위, 메타, 배지 |
| `numeric-lg` | 28px / 1.05 / 700 / -0.03em | 카드 숫자 3개(도보 분, 가격, 👍%) |
| `numeric-md` | 18px / 1.2 / 650 | 득표 수, 마감 카운트다운, 시트 메뉴 가격 |

## 4. 레이아웃

- **그리드**: 4px 기반(`space.base` 0.25rem). 화면 좌우 여백 20px(`gutter`), 카드 안쪽 20px(`lg`), 카드 내부 요소 간격 12px(`sm`), 섹션 사이 32~40px(`xl`~`2xl`).
- **세로 구성(390x844 기준)**: 상단 56px 헤더(끼니 토글, 사무실 이름) → 카드 스택 영역(약 470px) → 하단 액션 영역 → 하단 탭 64px + 안전 영역.
- **하단 1/3 액션 영역**(`bottomActionZone` 0.333, 최소 터치 48px): 주 버튼 "길찾기" 1개(전폭, 52px, 알약), 그 위 한 줄에 보조 행동 "이전", "다시 뽑기", "다음" 아이콘 버튼(48px 원형, 레이블 있음). 스와이프만으로 조작하지 않도록 이전/다음 버튼을 항상 둡니다.
- **데스크톱(1024px 이상)**: 좌 리스트 2 : 우 지도 3, 리스트 최대 460px. 데스크톱에서는 스택 대신 카드 3장을 세로로 나열하고 선택한 카드가 지도 핀과 연결됩니다. 하단 탭은 좌측 상단 내비게이션으로 옮깁니다.
- **360px 대응**: 카드 폭 320px에서 일러스트 영역이 192px 높이로 줄고, 숫자 3개는 `numeric-lg`를 24px로 낮춰 한 줄을 유지합니다. 식당명은 2줄까지 허용하고 넘치면 말줄임.
- 콘텐츠 최대 폭 480px(`maxWidth`), 태블릿은 가운데 정렬.

## 5. 컴포넌트 규칙

### 추천 카드

- **해부도(390px, 카드 350x440)**: 위쪽 48%(약 212px)가 카테고리 색면 + 일러스트(`cardAreaRatio` 0.48, 위쪽 모서리만 20px 라운드, 일러스트는 `slice`로 꽉 채움). 아래 52%가 정보 영역으로 안쪽 20px.
- **정보 순서**: ① 카테고리 라벨(`caption`, `cat-<slug>-ink`, 일러스트 영역 왼쪽 아래 12px 안쪽에 얹음) ② 식당명(`heading` 20/650, 2줄까지) ③ 숫자 3개 한 줄(`numeric-lg`, 3등분 그리드, 사이를 0.5px 세로선 `border`로 나눔, 문자 구분자 없음, 각 숫자 아래 단위 caption) ④ 이유 한 줄(`body-sm`, `muted-foreground`, 1줄 말줄임).
- **배지**: 최대 2개, 일러스트 영역 오른쪽 위 12px 안쪽. `badge` 라운드 8px, `caption` 글자, 바탕은 `card` 92% 불투명 면 + `shadow.sm`(웨이팅은 `warning-surface`, 할인은 `info-surface`). 일러스트 위에 떠 있어도 글자 대비는 바탕 면이 책임집니다.
- **스택**: 앞 카드 `shadow.md`, 뒤 카드 2장은 8px씩 아래로, 폭 4%씩 줄이고 `shadow.lg`. 뒤 카드는 일러스트 색면만 살짝 보입니다(다음 카드 예고).
- **상태**: 눌림은 `press` 스프링으로 scale 0.98, 드래그 중 회전 최대 6도, 포커스는 카드 바깥 2px `ring` + 2px 간격, 비활성(마감된 후보)은 일러스트 채도를 낮추지 않고 정보 영역 글자만 `muted-foreground`.

### 버튼

- 주 버튼: `primary` 바탕, `primary-foreground` 글자, 알약(`button: full`), 높이 52px, `label` 15/600. **한 화면에 포인트 컬러 버튼은 1개**이며, 시트가 열리면 시트의 주 버튼이 그 하나가 되고 뒤 화면의 주 버튼은 딤에 덮입니다.
- 보조 버튼: `secondary` 바탕, `secondary-foreground` 글자, 같은 알약. 텍스트 버튼은 `accent-foreground`.
- 상태: 눌림 scale 0.97(`press`) + 바탕 L -0.04, 포커스 2px `ring` 바깥 2px 간격, 비활성은 `muted` 바탕 + `muted-foreground` 글자(투명도로 흐리게 하지 않음), 로딩은 라벨 자리에 3점 스켈레톤 펄스.

### 칩

- 기본: `card` 바탕 + `shadow.sm` 윤곽, 글자 `foreground`, 알약, 높이 36px(터치 영역은 상하 여백으로 44px 확보).
- 선택: `accent` 바탕 + `accent-foreground` 글자 + 왼쪽 체크 아이콘. 포인트 실색은 쓰지 않습니다.
- 포커스 `ring`, 비활성 `muted` + `muted-foreground`.

### 바텀시트

- `card` 바탕, 위쪽 라운드 28px(`sheet: 3xl`), `shadow.sheet`, 뒤 딤 `overlay`. 손잡이 36x4px `border` 색.
- 스냅 3단(약 40%, 70%, 전체), `sheet` 스프링. 시트 머리: 일러스트 72px 정사각 썸네일(라운드 16px) + 식당명 `title` + 숫자 3개 `numeric-md`.
- Base UI Drawer 사용, 열림과 닫힘 모두 포커스 이동과 Esc 지원.

### 하단 탭

- 높이 64px + 안전 영역, `background` 바탕 95%에 위쪽 0.5px `border` 선(라운드 없음, `tab-bar: none`). 글래스 블러는 쓰지 않습니다.
- 4개 탭(오늘, 지도, 투표, 나): Lucide 24px 아이콘 + 12px 라벨. 활성은 아이콘과 라벨 모두 `primary`, 아이콘 아래 4px 테라코타 점 대신 아이콘을 채운 형태로 구분합니다. 비활성 `muted-foreground`.

### 득표 바

- 행 높이 52px, 트랙 `vote-bar-track` 라운드 12px, 채움 `vote-bar`(테라코타), 채움 안 득표 수 `numeric-md` `vote-bar-foreground`. 채움이 좁아 글자가 안 들어가면 트랙 오른쪽에 `foreground`로 둡니다.
- 1위 행만 채움 실색, 나머지는 `primary` 대신 `chart-3`(밝은 캐러멜)으로 낮춰 포인트를 하나로 유지합니다. 길이 변화는 `bar` 스프링, 숫자는 NumberFlow.

### 배지

- 최대 2개, 라운드 8px, 높이 24px, `caption`. 웨이팅 `warning-surface`/`warning-foreground`, 할인 `info-surface`/`info-foreground`, 추정 가격 `muted`/`muted-foreground`. 아이콘은 14px 하나까지.

## 6. 카테고리 일러스트 시스템

- **화풍 (`painted`, 선 굵기 0)**: 외곽선 없이 면으로만 그린 손맛 있는 채색입니다. 타원 둘레를 결정적 잡음으로 3~7% 흔들어 붓으로 칠한 듯 살짝 어긋난 외곽을 만들고, 한 그림에 2~3톤 면 + 하이라이트 한두 개 + 포인트(테라코타) 한 점만 씁니다. 질감 필터, 그라데이션, 외곽선은 쓰지 않습니다.
- **구도**: 가로 16:10(viewBox 160x100), 음식과 그릇이 가운데 아래쪽에 놓이고 위쪽 1/4은 김과 여백. 바탕에는 같은 색상의 아주 옅은 붓 자국 면 하나와 그릇 아래 그림자 한 겹이 깔립니다. 빛은 왼쪽 위에서 오고, 그릇 오른쪽에 그늘 초승달이 생깁니다. 캐릭터, 얼굴, 마스코트는 그리지 않습니다.
- **12종 주 모티프** (`src/features/design-lab/illustrations/a/`)

| slug | 모티프 |
| --- | --- |
| hansik | 흰 밥 한 공기, 나물 접시, 김치 접시, 젓가락 |
| jungsik | 짜장면 그릇(앞)과 짬뽕 그릇(뒤) |
| ilsik | 긴 접시 위 연어 초밥 두 점, 마키 두 점, 간장 종지, 젓가락 |
| yangsik | 넓은 접시 위 토마토 스파게티, 바질, 감아 올린 포크 |
| bunsik | 떡볶이 접시(떡, 어묵, 삶은 달걀)와 김밥 세 조각 |
| gukbap | 받침 위 뚝배기, 뽀얀 국물, 파, 고춧가루, 숟가락, 깍두기 |
| gogi | 둥근 불판 위 삼겹살 세 줄, 마늘, 연기 |
| asian | 쌀국수 대접, 고기 고명, 고수, 라임, 면을 든 젓가락 |
| fastfood | 햄버거(참깨 번, 토마토, 치즈, 패티)와 감자튀김 |
| salad | 넓은 볼에 잎채소, 방울토마토, 오이 |
| cafe | 받침 위 라테 한 잔(라테 아트), 크루아상 |
| pub | 와인 잔과 닭꼬치 두 개를 올린 접시 |

- **색 규칙**: 색 값을 직접 쓰지 않고 토큰만 섞습니다(`illustration-a.css`의 역할 변수). 바탕 `cat-<slug>-surface`, 음식 3톤은 `cat-<slug>-ink`를 바탕에 26/52/80% 섞은 값, 그릇은 `card`, 하이라이트는 `card`와 색면 혼합, 포인트 한 점은 `primary`, 빵과 튀김은 mid 톤을 `primary` 쪽으로 데운 "toast" 톤입니다.
- **다크 대응**: 다크에서는 색면이 어둡고 ink가 밝아 단순 혼합이 명암을 뒤집습니다. 그래서 다크에서 역할별 혼합 비율을 다시 정해 "빛 받는 면이 더 밝다"는 관계를 유지합니다(그릇은 차콜 도자기, 음식은 은은하게 밝게, 그림자는 바탕보다 어둡게). 별도 다크용 그림은 없습니다.
- **비율 (PRD 8.3)**: 사진 없는 카드에서 일러스트는 카드 높이의 48%를 차지하는 시각적 주인공입니다. 정보 위계의 주인공(식당명, 숫자)은 그 아래 흰 정보 영역에서 일러스트와 겹치지 않게 둡니다. 시트 썸네일(72px)과 투표 후보 행(40px)에서는 같은 그림을 `slice`로 잘라 씁니다.
- 접근성: 장식이므로 `aria-hidden`. 카테고리는 라벨 글자로 따로 전달합니다.

## 7. 모션

**성격**: 탄력 있게 반응하되 금방 멈춥니다. 식탁 위 카드를 손으로 넘기는 느낌, 약간의 오버슈트.

| 프리셋 | 값 | 사용 지점 |
| --- | --- | --- |
| `swipe` | stiffness 420, damping 30, mass 1 | 카드 스와이프와 제자리 복귀. 120px 또는 속도 500px/s 넘으면 넘김 |
| `shuffle` | 320 / 20 / 0.9 | "다시 뽑기": 앞 카드가 아래로 빠지고 뒤 카드가 차례로 올라옴(`stagger` 50ms) |
| `sheet` | 340 / 34 / 1 | 바텀시트 스냅, 오버슈트 거의 없음 |
| `press` | 700 / 38 / 0.5 | 버튼과 카드 눌림 |
| `bar` | 200 / 24 / 1 | 득표 바 길이 |
| duration | 160 / 220 / 260ms | 페이드, 색 전환, 탭 전환(base 220) |
| easing | standard [0.25,0.1,0.25,1], enter [0.22,1,0.36,1], exit [0.4,0,0.9,0.6], emphasized [0.34,1.4,0.64,1] | 등장은 enter, 퇴장은 exit, 확정 체크 아이콘 등장만 emphasized |

- **동적 컴포넌트 (tasks.md 2.4절)**: Motion(`m` + `LazyMotion`, 스와이프만 `domMax` 비동기), Base UI Drawer(시트), NumberFlow(득표 수, 👍%, 카운트다운), canvas-confetti(투표 확정 순간 1회, 테라코타와 카테고리 ink 3색, 1초 이내), Sonner(토스트).
- 홈 첫 화면에서 동시에 움직이는 것은 카드 스택 등장 하나뿐입니다(일러스트는 움직이지 않음).
- **reduced motion**: 모든 스프링과 전환을 즉시 상태 변화로 바꾸고, 셔플은 카드 내용만 바뀌며, confetti는 생략하고 체크 아이콘만 보입니다.

## 8. 문구 톤

tasks.md 2.2절을 따릅니다(습니다체 약 70%, 해요체 약 30%, Em dash와 중간점 금지). 이 시안은 식탁에 마주 앉은 동료처럼 다정하게, 대신 짧게 말합니다.

| 상황 | 예문 |
| --- | --- |
| 추천 이유 | 도보 약 4분, 지난주 👍한 국밥 |
| 빈 상태 | 도보 10분 안에 조건에 맞는 식당이 없습니다. 15분까지 넓혀볼까요? |
| 확정 축하 | 오늘 점심은 여기로 정했어요! |

## 9. Do / Don't

**Do**

- 일러스트 영역은 카드 위쪽 48%를 꽉 채우고, 정보는 그 아래 밝은 면에만 둡니다.
- 테라코타 실색은 화면당 주 버튼 하나와 활성 탭, 득표 1위에만 씁니다. 나머지 선택은 `accent` 틴트입니다.
- 카드 깊이는 0.5px 윤곽 + 짧은 그림자 2겹으로만 만들고, 스택 뒤 카드만 그림자를 진하게 합니다.
- 새 카테고리 그림은 같은 형태 도우미(`shapes.ts`)와 역할 색만으로 그립니다. 2~3톤 + 하이라이트 + 포인트 한 점을 넘기지 않습니다.
- 스와이프에는 항상 이전/다음 버튼을 함께 둡니다.

**Don't**

- 스타벅스식 프로모션 띠, 시즌 배너, 녹색 포인트를 들여오지 않습니다.
- 일러스트에 외곽선, 질감 필터, 그라데이션을 넣거나 움직이지 않습니다(카드가 움직이므로 그림은 정지).
- 일러스트 위에 식당명이나 숫자를 직접 올리지 않습니다. 겹치는 것은 배지와 카테고리 라벨뿐입니다.
- 카테고리 색면 채도를 0.05 넘게 올리지 않습니다. 12색이 무지개가 되면 테라코타 포인트가 묻힙니다.
- 오버슈트를 셔플 외의 곳(시트, 탭 전환)에 쓰지 않습니다.
