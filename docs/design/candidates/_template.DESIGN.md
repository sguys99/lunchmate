---
# DESIGN.md 템플릿 (형식: docs/design/candidates/FORMAT.md, 검증: src/lib/design/schema.ts)
# 복사해서 a.DESIGN.md 처럼 이름을 바꾸고 값만 고칩니다. 키를 빼거나 더하면 검증에 실패합니다.
# 기본값은 2026-10-28 임시 src/styles/tokens.css 값입니다.
schema: 1

meta:
  id: template
  name: Template
  concept: 따뜻한 크림 바탕에 테라코타 한 색으로 결정을 돕는 임시 기본안
  mood: [따뜻한, 편안한, 정돈된]
  version: 0.1.0
  status: template
  basedOn: []

color:
  light:
    shadcn:
      background: "oklch(0.975 0.012 85)"
      foreground: "oklch(0.24 0.012 60)"
      card: "oklch(0.99 0.008 85)"
      card-foreground: "oklch(0.24 0.012 60)"
      popover: "oklch(0.99 0.008 85)"
      popover-foreground: "oklch(0.24 0.012 60)"
      primary: "oklch(0.52 0.125 45)"
      primary-foreground: "oklch(0.985 0.01 85)"
      secondary: "oklch(0.94 0.018 80)"
      secondary-foreground: "oklch(0.3 0.014 60)"
      muted: "oklch(0.945 0.015 80)"
      muted-foreground: "oklch(0.47 0.02 65)"
      accent: "oklch(0.93 0.022 78)"
      accent-foreground: "oklch(0.28 0.014 60)"
      destructive: "oklch(0.5 0.19 27)"
      border: "oklch(0.89 0.018 78)"
      input: "oklch(0.89 0.018 78)"
      ring: "oklch(0.6 0.1 45)"
      chart-1: "oklch(0.52 0.125 45)"
      chart-2: "oklch(0.64 0.1 55)"
      chart-3: "oklch(0.74 0.075 70)"
      chart-4: "oklch(0.45 0.07 50)"
      chart-5: "oklch(0.36 0.04 55)"
      sidebar: "oklch(0.96 0.014 82)"
      sidebar-foreground: "oklch(0.24 0.012 60)"
      sidebar-primary: "oklch(0.52 0.125 45)"
      sidebar-primary-foreground: "oklch(0.985 0.01 85)"
      sidebar-accent: "oklch(0.93 0.022 78)"
      sidebar-accent-foreground: "oklch(0.28 0.014 60)"
      sidebar-border: "oklch(0.89 0.018 78)"
      sidebar-ring: "oklch(0.6 0.1 45)"
    app:
      success: "oklch(0.52 0.11 150)"
      success-surface: "oklch(0.95 0.03 150)"
      success-foreground: "oklch(0.36 0.08 150)"
      warning: "oklch(0.58 0.13 65)"
      warning-surface: "oklch(0.95 0.04 80)"
      warning-foreground: "oklch(0.4 0.09 60)"
      info: "oklch(0.52 0.08 240)"
      info-surface: "oklch(0.95 0.02 240)"
      info-foreground: "oklch(0.38 0.07 240)"
      vote-bar: "oklch(0.52 0.125 45)"
      vote-bar-track: "oklch(0.92 0.02 78)"
      vote-bar-foreground: "oklch(0.985 0.01 85)"
      skeleton: "oklch(0.93 0.016 80)"
      skeleton-highlight: "oklch(0.965 0.012 82)"
      overlay: "oklch(0.2 0.01 60 / 40%)"
    category:
      hansik: { surface: "oklch(0.93 0.04 40)", ink: "oklch(0.4 0.09 40)" }
      jungsik: { surface: "oklch(0.93 0.04 25)", ink: "oklch(0.4 0.09 25)" }
      ilsik: { surface: "oklch(0.93 0.04 220)", ink: "oklch(0.4 0.09 220)" }
      yangsik: { surface: "oklch(0.93 0.04 70)", ink: "oklch(0.4 0.09 70)" }
      bunsik: { surface: "oklch(0.93 0.04 50)", ink: "oklch(0.4 0.09 50)" }
      gukbap: { surface: "oklch(0.93 0.04 85)", ink: "oklch(0.4 0.09 85)" }
      gogi: { surface: "oklch(0.93 0.04 15)", ink: "oklch(0.4 0.09 15)" }
      asian: { surface: "oklch(0.93 0.04 140)", ink: "oklch(0.4 0.09 140)" }
      fastfood: { surface: "oklch(0.93 0.04 95)", ink: "oklch(0.4 0.09 95)" }
      salad: { surface: "oklch(0.93 0.04 125)", ink: "oklch(0.4 0.09 125)" }
      cafe: { surface: "oklch(0.93 0.04 60)", ink: "oklch(0.4 0.09 60)" }
      pub: { surface: "oklch(0.93 0.04 330)", ink: "oklch(0.4 0.09 330)" }
  dark:
    shadcn:
      background: "oklch(0.2 0.008 60)"
      foreground: "oklch(0.94 0.01 85)"
      card: "oklch(0.245 0.01 60)"
      card-foreground: "oklch(0.94 0.01 85)"
      popover: "oklch(0.245 0.01 60)"
      popover-foreground: "oklch(0.94 0.01 85)"
      primary: "oklch(0.73 0.12 50)"
      primary-foreground: "oklch(0.2 0.01 60)"
      secondary: "oklch(0.3 0.012 60)"
      secondary-foreground: "oklch(0.94 0.01 85)"
      muted: "oklch(0.28 0.01 60)"
      muted-foreground: "oklch(0.74 0.015 75)"
      accent: "oklch(0.31 0.014 60)"
      accent-foreground: "oklch(0.94 0.01 85)"
      destructive: "oklch(0.7 0.17 25)"
      border: "oklch(0.94 0.01 85 / 12%)"
      input: "oklch(0.94 0.01 85 / 16%)"
      ring: "oklch(0.6 0.1 50)"
      chart-1: "oklch(0.73 0.12 50)"
      chart-2: "oklch(0.64 0.1 55)"
      chart-3: "oklch(0.55 0.08 60)"
      chart-4: "oklch(0.82 0.08 65)"
      chart-5: "oklch(0.88 0.05 75)"
      sidebar: "oklch(0.225 0.009 60)"
      sidebar-foreground: "oklch(0.94 0.01 85)"
      sidebar-primary: "oklch(0.73 0.12 50)"
      sidebar-primary-foreground: "oklch(0.2 0.01 60)"
      sidebar-accent: "oklch(0.31 0.014 60)"
      sidebar-accent-foreground: "oklch(0.94 0.01 85)"
      sidebar-border: "oklch(0.94 0.01 85 / 12%)"
      sidebar-ring: "oklch(0.6 0.1 50)"
    app:
      success: "oklch(0.72 0.12 150)"
      success-surface: "oklch(0.3 0.04 150)"
      success-foreground: "oklch(0.86 0.08 150)"
      warning: "oklch(0.78 0.12 75)"
      warning-surface: "oklch(0.32 0.04 75)"
      warning-foreground: "oklch(0.88 0.08 80)"
      info: "oklch(0.72 0.08 240)"
      info-surface: "oklch(0.3 0.03 240)"
      info-foreground: "oklch(0.86 0.05 240)"
      vote-bar: "oklch(0.73 0.12 50)"
      vote-bar-track: "oklch(0.3 0.012 60)"
      vote-bar-foreground: "oklch(0.2 0.01 60)"
      skeleton: "oklch(0.28 0.01 60)"
      skeleton-highlight: "oklch(0.32 0.012 60)"
      overlay: "oklch(0.1 0.005 60 / 60%)"
    category:
      hansik: { surface: "oklch(0.3 0.035 40)", ink: "oklch(0.86 0.07 40)" }
      jungsik: { surface: "oklch(0.3 0.035 25)", ink: "oklch(0.86 0.07 25)" }
      ilsik: { surface: "oklch(0.3 0.035 220)", ink: "oklch(0.86 0.07 220)" }
      yangsik: { surface: "oklch(0.3 0.035 70)", ink: "oklch(0.86 0.07 70)" }
      bunsik: { surface: "oklch(0.3 0.035 50)", ink: "oklch(0.86 0.07 50)" }
      gukbap: { surface: "oklch(0.3 0.035 85)", ink: "oklch(0.86 0.07 85)" }
      gogi: { surface: "oklch(0.3 0.035 15)", ink: "oklch(0.86 0.07 15)" }
      asian: { surface: "oklch(0.3 0.035 140)", ink: "oklch(0.86 0.07 140)" }
      fastfood: { surface: "oklch(0.3 0.035 95)", ink: "oklch(0.86 0.07 95)" }
      salad: { surface: "oklch(0.3 0.035 125)", ink: "oklch(0.86 0.07 125)" }
      cafe: { surface: "oklch(0.3 0.035 60)", ink: "oklch(0.86 0.07 60)" }
      pub: { surface: "oklch(0.3 0.035 330)", ink: "oklch(0.86 0.07 330)" }

# 대비 검사(T1.15) 대상. 필수 쌍(schema.ts REQUIRED_CONTRAST_PAIRS + 카테고리 12쌍)은 뺄 수 없습니다.
# 참조는 생성 CSS 변수 이름에서 -- 를 뺀 것. theme 생략 시 라이트와 다크 모두 검사합니다.
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
  display: { size: 2, lineHeight: 1.2, weight: 700, tracking: -0.02, font: heading }
  title: { size: 1.5, lineHeight: 1.3, weight: 700, tracking: -0.015, font: heading }
  heading: { size: 1.125, lineHeight: 1.4, weight: 600, tracking: -0.01, font: heading }
  body: { size: 1, lineHeight: 1.55, weight: 400, tracking: 0, font: sans }
  body-sm: { size: 0.875, lineHeight: 1.5, weight: 400, tracking: 0, font: sans }
  label: { size: 0.875, lineHeight: 1.3, weight: 600, tracking: 0, font: sans }
  caption: { size: 0.75, lineHeight: 1.4, weight: 500, tracking: 0.01, font: sans }
  numeric-lg: { size: 1.75, lineHeight: 1.1, weight: 700, tracking: -0.02, font: numeric }
  numeric-md: { size: 1.125, lineHeight: 1.2, weight: 600, tracking: -0.01, font: numeric }

# rem
space:
  base: 0.25
  scale: { 2xs: 0.25, xs: 0.5, sm: 0.75, md: 1, lg: 1.5, xl: 2, 2xl: 3, 3xl: 4 }

radius:
  base: 0.875
  scale: { sm: 0.6, md: 0.8, lg: 1, xl: 1.4, 2xl: 1.8, 3xl: 2.2, 4xl: 2.6 }
  components: { card: xl, button: lg, chip: full, badge: md, input: lg, sheet: 2xl, tab-bar: none }

shadow:
  light:
    sm: "0 1px 2px oklch(0.24 0.012 60 / 6%)"
    md: "0 2px 8px oklch(0.24 0.012 60 / 8%)"
    lg: "0 8px 24px oklch(0.24 0.012 60 / 10%)"
    sheet: "0 -4px 24px oklch(0.24 0.012 60 / 12%)"
  dark:
    sm: none
    md: "0 2px 8px oklch(0.1 0.005 60 / 40%)"
    lg: "0 8px 24px oklch(0.1 0.005 60 / 50%)"
    sheet: "0 -4px 24px oklch(0.1 0.005 60 / 60%)"

# px
border: { hairline: 0.5, default: 1, strong: 1.5 }

motion:
  duration: { fast: 150, base: 220, slow: 300 }
  easing:
    standard: [0.2, 0, 0, 1]
    enter: [0, 0, 0.2, 1]
    exit: [0.4, 0, 1, 1]
    emphasized: [0.2, 0, 0, 1.2]
  spring:
    swipe: { stiffness: 380, damping: 32, mass: 1 }
    sheet: { stiffness: 300, damping: 30, mass: 1 }
    shuffle: { stiffness: 260, damping: 22, mass: 0.9 }
    press: { stiffness: 600, damping: 35, mass: 0.6 }
    bar: { stiffness: 180, damping: 26, mass: 1 }
  stagger: 40
  reducedMotion: instant

illustration:
  style: painted
  strokeWidth: 0
  cardAreaRatio: 0.45
  placement: top
  palette:
    surface: "cat-{slug}-surface"
    ink: "cat-{slug}-ink"
    accent: primary

# px (비율 제외)
layout:
  maxWidth: 480
  minWidth: 360
  gutter: 16
  desktop:
    breakpoint: 1024
    columns: [2, 3]
    listMaxWidth: 440
  bottomActionZone:
    ratio: 0.333
    minTouch: 44
  tabBarHeight: 64
---

# DESIGN.md: Template

> 복사한 뒤 각 섹션의 안내 문장(인용 블록)을 지우고 시안 내용으로 채웁니다. 섹션 제목은 바꾸지 않습니다.

## 1. 컨셉

> 컨셉 한 줄(meta.concept)과 무드 키워드 3개(meta.mood)를 그대로 적고, 주 레퍼런스(preferences.md 3절)에서 무엇을 가져왔는지 1~2문장으로 씁니다.

## 2. 색 사용 규칙

> 포인트 컬러(primary)를 쓰는 곳과 쓰지 않는 곳, 의미 색(success, warning, info, destructive)의 용도, contrastPairs의 실측 대비 수치(라이트/다크)를 표로 적습니다.

## 3. 타이포

> 서체 선택 이유, type 스케일 단계별 쓰임(어떤 화면 요소에 어떤 단계), 숫자 표현(numeric-lg 사용처, tabular-nums, 단위 글자 크기)을 적습니다.

## 4. 레이아웃

> 그리드와 여백(gutter, space 단계), 하단 1/3 액션 영역에 두는 요소, 데스크톱 2단 비율과 360px 최소 폭 대응을 적습니다.

## 5. 컴포넌트 규칙

> 추천 카드, 버튼, 칩, 바텀시트, 하단 탭, 득표 바, 배지 각각에 대해 쓰는 토큰(radius.components, shadow, border)과 상태(기본, 눌림, 비활성, 포커스)를 1~3줄로 적습니다.

### 추천 카드
### 버튼
### 칩
### 바텀시트
### 하단 탭
### 득표 바
### 배지

## 6. 카테고리 일러스트 시스템

> illustration.style에 맞는 화풍 설명, 12종 카테고리별 주 모티프(음식과 그릇, 마스코트 금지), 색면과 선 색 규칙, 라이트/다크 대응, 사진 없는 카드에서 일러스트가 차지하는 비율(PRD 8.3)을 적습니다.

## 7. 모션

> 모션 성격 한 줄, duration/easing/spring 프리셋이 쓰이는 지점(스와이프, 셔플, 시트, 득표 바, 확정 축하), 쓰는 동적 컴포넌트(tasks.md 2.4절)와 reduced motion 대체를 적습니다.

## 8. 문구 톤

> tasks.md 2.2절 규칙을 따른다는 것과, 이 시안의 분위기에 맞는 예문 3개(추천 이유, 빈 상태, 확정 축하)를 적습니다.

## 9. Do / Don't

> 이 시안에서 꼭 지킬 것과 하면 안 되는 것을 각각 3~5개 적습니다.
