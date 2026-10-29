---
# 런치메이트 디자인 정본 (G1 확정 2026-10-28, 시안 B "Quiet Stone" 기반, docs/design-decisions.md D-01).
# 이 파일을 고치고 `pnpm tokens`를 실행하면 src/styles/tokens.css가 다시 생성된다. 형식: docs/design/candidates/FORMAT.md, 검증: src/lib/design/schema.ts
# 레퍼런스: 아만(aman.com). preferences.md 4.4절 B열을 출발점으로 대비 검사에 맞춰 밝기만 조정했습니다.
schema: 1

meta:
  id: final
  name: Quiet Stone
  concept: 석회빛 샌드 위 짙은 올리브 한 색, 가는 세리프와 선화가 여백 속에서 조용히 고르게 돕는 화면
  mood: [고요한, 단정한, 여유로운]
  version: 1.0.0
  status: final
  basedOn: [b]

color:
  light:
    shadcn:
      background: "oklch(0.952 0.012 78)"
      foreground: "oklch(0.3 0.008 70)"
      card: "oklch(0.965 0.01 80)"
      card-foreground: "oklch(0.3 0.008 70)"
      popover: "oklch(0.972 0.009 80)"
      popover-foreground: "oklch(0.3 0.008 70)"
      primary: "oklch(0.43 0.055 118)"
      primary-foreground: "oklch(0.975 0.008 85)"
      secondary: "oklch(0.925 0.013 78)"
      secondary-foreground: "oklch(0.3 0.008 70)"
      muted: "oklch(0.928 0.013 78)"
      muted-foreground: "oklch(0.47 0.014 115)"
      accent: "oklch(0.915 0.016 100)"
      accent-foreground: "oklch(0.29 0.012 110)"
      destructive: "oklch(0.49 0.14 30)"
      border: "oklch(0.87 0.013 78)"
      input: "oklch(0.82 0.014 78)"
      ring: "oklch(0.52 0.06 118)"
      chart-1: "oklch(0.43 0.055 118)"
      chart-2: "oklch(0.55 0.05 112)"
      chart-3: "oklch(0.67 0.04 105)"
      chart-4: "oklch(0.36 0.04 118)"
      chart-5: "oklch(0.78 0.03 95)"
      sidebar: "oklch(0.94 0.012 78)"
      sidebar-foreground: "oklch(0.3 0.008 70)"
      sidebar-primary: "oklch(0.43 0.055 118)"
      sidebar-primary-foreground: "oklch(0.975 0.008 85)"
      sidebar-accent: "oklch(0.915 0.016 100)"
      sidebar-accent-foreground: "oklch(0.29 0.012 110)"
      sidebar-border: "oklch(0.87 0.013 78)"
      sidebar-ring: "oklch(0.52 0.06 118)"
    app:
      success: "oklch(0.5 0.08 150)"
      success-surface: "oklch(0.93 0.025 145)"
      success-foreground: "oklch(0.36 0.06 150)"
      warning: "oklch(0.56 0.1 70)"
      warning-surface: "oklch(0.93 0.035 82)"
      warning-foreground: "oklch(0.39 0.07 65)"
      info: "oklch(0.5 0.055 235)"
      info-surface: "oklch(0.93 0.015 235)"
      info-foreground: "oklch(0.37 0.05 235)"
      vote-bar: "oklch(0.43 0.055 118)"
      vote-bar-track: "oklch(0.91 0.014 80)"
      vote-bar-foreground: "oklch(0.975 0.008 85)"
      skeleton: "oklch(0.925 0.012 78)"
      skeleton-highlight: "oklch(0.948 0.01 80)"
      overlay: "oklch(0.24 0.01 70 / 32%)"
    # 소셜 로그인 버튼 브랜드 색 (T3.4). 각 사 가이드 값 그대로, 로그인 버튼에만 쓴다. DESIGN.md 5장 "소셜 로그인 버튼"
    brand:
      brand-kakao: "oklch(0.9139 0.1909 101.37)"
      brand-kakao-foreground: "oklch(0 0 0 / 85%)"
      brand-kakao-symbol: "oklch(0 0 0)"
      brand-naver: "oklch(0.725 0.2014 149.53)"
      brand-naver-foreground: "oklch(1 0 0)"
      brand-google: "oklch(1 0 0)"
      brand-google-foreground: "oklch(0.2393 0 0)"
      brand-google-border: "oklch(0.566 0.0047 157.09)"
      brand-google-blue: "oklch(0.6304 0.18 259.96)"
      brand-google-red: "oklch(0.6257 0.2058 29.08)"
      brand-google-yellow: "oklch(0.8304 0.1698 83.99)"
      brand-google-green: "oklch(0.6475 0.1603 148.5)"
      brand-google-logo-surface: "oklch(1 0 0)"
    category:
      hansik: { surface: "oklch(0.93 0.021 50)", ink: "oklch(0.43 0.068 50)" }
      jungsik: { surface: "oklch(0.93 0.021 20)", ink: "oklch(0.43 0.068 20)" }
      ilsik: { surface: "oklch(0.93 0.021 240)", ink: "oklch(0.43 0.068 240)" }
      yangsik: { surface: "oklch(0.93 0.021 88)", ink: "oklch(0.43 0.068 88)" }
      bunsik: { surface: "oklch(0.93 0.021 355)", ink: "oklch(0.43 0.068 355)" }
      gukbap: { surface: "oklch(0.93 0.021 75)", ink: "oklch(0.43 0.068 75)" }
      gogi: { surface: "oklch(0.93 0.021 35)", ink: "oklch(0.43 0.068 35)" }
      asian: { surface: "oklch(0.93 0.021 165)", ink: "oklch(0.43 0.068 165)" }
      fastfood: { surface: "oklch(0.93 0.021 100)", ink: "oklch(0.43 0.068 100)" }
      salad: { surface: "oklch(0.93 0.021 128)", ink: "oklch(0.43 0.068 128)" }
      cafe: { surface: "oklch(0.93 0.021 62)", ink: "oklch(0.43 0.068 62)" }
      pub: { surface: "oklch(0.93 0.021 310)", ink: "oklch(0.43 0.068 310)" }
  dark:
    shadcn:
      background: "oklch(0.205 0.006 70)"
      foreground: "oklch(0.925 0.012 80)"
      card: "oklch(0.232 0.007 70)"
      card-foreground: "oklch(0.925 0.012 80)"
      popover: "oklch(0.27 0.008 70)"
      popover-foreground: "oklch(0.925 0.012 80)"
      primary: "oklch(0.76 0.07 118)"
      primary-foreground: "oklch(0.2 0.01 110)"
      secondary: "oklch(0.28 0.008 70)"
      secondary-foreground: "oklch(0.925 0.012 80)"
      muted: "oklch(0.265 0.008 70)"
      muted-foreground: "oklch(0.73 0.014 105)"
      accent: "oklch(0.29 0.014 105)"
      accent-foreground: "oklch(0.925 0.012 80)"
      destructive: "oklch(0.72 0.13 32)"
      border: "oklch(0.925 0.012 80 / 9%)"
      input: "oklch(0.925 0.012 80 / 16%)"
      ring: "oklch(0.68 0.07 118)"
      chart-1: "oklch(0.76 0.07 118)"
      chart-2: "oklch(0.66 0.06 112)"
      chart-3: "oklch(0.56 0.05 105)"
      chart-4: "oklch(0.84 0.05 118)"
      chart-5: "oklch(0.46 0.03 95)"
      sidebar: "oklch(0.218 0.007 70)"
      sidebar-foreground: "oklch(0.925 0.012 80)"
      sidebar-primary: "oklch(0.76 0.07 118)"
      sidebar-primary-foreground: "oklch(0.2 0.01 110)"
      sidebar-accent: "oklch(0.29 0.014 105)"
      sidebar-accent-foreground: "oklch(0.925 0.012 80)"
      sidebar-border: "oklch(0.925 0.012 80 / 9%)"
      sidebar-ring: "oklch(0.68 0.07 118)"
    app:
      success: "oklch(0.74 0.09 150)"
      success-surface: "oklch(0.29 0.03 150)"
      success-foreground: "oklch(0.87 0.06 150)"
      warning: "oklch(0.79 0.1 78)"
      warning-surface: "oklch(0.3 0.035 75)"
      warning-foreground: "oklch(0.89 0.07 82)"
      info: "oklch(0.74 0.06 235)"
      info-surface: "oklch(0.29 0.025 235)"
      info-foreground: "oklch(0.87 0.04 235)"
      vote-bar: "oklch(0.76 0.07 118)"
      vote-bar-track: "oklch(0.3 0.01 75)"
      vote-bar-foreground: "oklch(0.2 0.01 110)"
      skeleton: "oklch(0.265 0.008 70)"
      skeleton-highlight: "oklch(0.3 0.009 70)"
      overlay: "oklch(0.1 0.005 70 / 60%)"
    # 소셜 로그인 버튼 브랜드 색 (T3.4). 각 사 가이드 값 그대로, 로그인 버튼에만 쓴다. DESIGN.md 5장 "소셜 로그인 버튼"
    brand:
      brand-kakao: "oklch(0.9139 0.1909 101.37)"
      brand-kakao-foreground: "oklch(0 0 0 / 85%)"
      brand-kakao-symbol: "oklch(0 0 0)"
      brand-naver: "oklch(0.725 0.2014 149.53)"
      brand-naver-foreground: "oklch(1 0 0)"
      brand-google: "oklch(0.1872 0.002 286.2)"
      brand-google-foreground: "oklch(0.9158 0 0)"
      brand-google-border: "oklch(0.6535 0.0046 157.12)"
      brand-google-blue: "oklch(0.6304 0.18 259.96)"
      brand-google-red: "oklch(0.6257 0.2058 29.08)"
      brand-google-yellow: "oklch(0.8304 0.1698 83.99)"
      brand-google-green: "oklch(0.6475 0.1603 148.5)"
      brand-google-logo-surface: "oklch(1 0 0)"
    category:
      hansik: { surface: "oklch(0.285 0.026 50)", ink: "oklch(0.85 0.055 50)" }
      jungsik: { surface: "oklch(0.285 0.026 20)", ink: "oklch(0.85 0.055 20)" }
      ilsik: { surface: "oklch(0.285 0.026 240)", ink: "oklch(0.85 0.055 240)" }
      yangsik: { surface: "oklch(0.285 0.026 88)", ink: "oklch(0.85 0.055 88)" }
      bunsik: { surface: "oklch(0.285 0.026 355)", ink: "oklch(0.85 0.055 355)" }
      gukbap: { surface: "oklch(0.285 0.026 75)", ink: "oklch(0.85 0.055 75)" }
      gogi: { surface: "oklch(0.285 0.026 35)", ink: "oklch(0.85 0.055 35)" }
      asian: { surface: "oklch(0.285 0.026 165)", ink: "oklch(0.85 0.055 165)" }
      fastfood: { surface: "oklch(0.285 0.026 100)", ink: "oklch(0.85 0.055 100)" }
      salad: { surface: "oklch(0.285 0.026 128)", ink: "oklch(0.85 0.055 128)" }
      cafe: { surface: "oklch(0.285 0.026 62)", ink: "oklch(0.85 0.055 62)" }
      pub: { surface: "oklch(0.285 0.026 310)", ink: "oklch(0.85 0.055 310)" }

# 대비 검사(T1.15) 대상. 필수 36쌍 + 시안 B가 실제로 겹쳐 쓰는 조합 4쌍.
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
  - { fg: muted-foreground, bg: secondary, min: 4.5, note: 시트 안 보조 글자 }
  - { fg: primary, bg: card, min: 4.5, note: 선택 칩 글자와 텍스트 링크 }
  - { fg: foreground, bg: muted, min: 4.5, note: 스켈레톤 없이 muted 면 위 본문 }
  - { fg: primary-foreground, bg: vote-bar, min: 4.5, note: 1위 득표 바 위 숫자 }
  - { fg: brand-google-foreground, bg: brand-google, min: 4.5, note: 구글 로그인 버튼 글자 }
  - { fg: brand-google-border, bg: background, min: 3, note: 구글 로그인 버튼 테두리 }

font:
  sans:
    family: Pretendard Variable
    fallback: [Pretendard, -apple-system, BlinkMacSystemFont, system-ui, Apple SD Gothic Neo, Noto Sans KR, sans-serif]
    cssVar: "--font-pretendard"
  heading:
    family: MaruBuri
    fallback: [AppleMyungjo, Noto Serif KR, Batang, serif]
    cssVar: "--font-maruburi"
    kind: serif
  numeric:
    use: sans
    tabular: true
    slashedZero: false

# size rem, lineHeight 배수, weight 100~900, tracking em
# 제목은 세리프 300~400으로 크기만 키우고 굵기는 낮춥니다. 숫자는 Pretendard 500으로 또렷하게.
type:
  display: { size: 2.5, lineHeight: 1.2, weight: 300, tracking: -0.02, font: heading }
  title: { size: 1.875, lineHeight: 1.25, weight: 300, tracking: -0.015, font: heading }
  heading: { size: 1.375, lineHeight: 1.35, weight: 400, tracking: -0.01, font: heading }
  body: { size: 1, lineHeight: 1.6, weight: 400, tracking: 0, font: sans }
  body-sm: { size: 0.9375, lineHeight: 1.55, weight: 400, tracking: 0, font: sans }
  label: { size: 0.9375, lineHeight: 1.3, weight: 500, tracking: 0, font: sans }
  caption: { size: 0.8125, lineHeight: 1.4, weight: 500, tracking: 0.01, font: sans }
  numeric-lg: { size: 1.75, lineHeight: 1.05, weight: 500, tracking: -0.02, font: numeric }
  numeric-md: { size: 1.125, lineHeight: 1.2, weight: 500, tracking: -0.01, font: numeric }

# rem. 아만의 넓은 간격을 모바일에 맞게 줄인 단계 (카드 안 lg 28px, 섹션 사이 2xl 56px)
space:
  base: 0.25
  scale: { 2xs: 0.25, xs: 0.5, sm: 0.75, md: 1.25, lg: 1.75, xl: 2.5, 2xl: 3.5, 3xl: 4.5 }

# base 16px. 카드 xl = 24px, 시트 2xl = 28px
radius:
  base: 1
  scale: { sm: 0.5, md: 0.75, lg: 1, xl: 1.5, 2xl: 1.75, 3xl: 2, 4xl: 2.5 }
  components: { card: xl, button: full, chip: full, badge: sm, input: lg, sheet: 2xl, tab-bar: none }

# 깊이는 그림자가 아니라 1px 선과 면 톤으로 만듭니다. lg는 팝오버 한 곳, sheet는 위쪽 헤어라인뿐입니다.
shadow:
  light:
    sm: none
    md: none
    lg: "0 12px 32px oklch(0.3 0.008 70 / 6%)"
    sheet: "0 -1px 0 oklch(0.3 0.008 70 / 8%)"
  dark:
    sm: none
    md: none
    lg: "0 12px 32px oklch(0.1 0.005 70 / 45%)"
    sheet: "0 -1px 0 oklch(0.925 0.012 80 / 8%)"

# px
border: { hairline: 0.5, default: 1, strong: 1.5 }

# 오버슈트 없음: 모든 easing의 y 값은 0~1, 모든 spring은 감쇠비 1 이상(damping >= 2*sqrt(stiffness*mass)).
motion:
  duration: { fast: 180, base: 260, slow: 300 }
  easing:
    standard: [0.3, 0, 0.2, 1]
    enter: [0.22, 1, 0.36, 1]
    exit: [0.5, 0, 0.75, 0]
    emphasized: [0.4, 0, 0.1, 1]
  spring:
    swipe: { stiffness: 260, damping: 34, mass: 1 }
    sheet: { stiffness: 170, damping: 28, mass: 1 }
    shuffle: { stiffness: 200, damping: 30, mass: 1 }
    press: { stiffness: 500, damping: 36, mass: 0.6 }
    bar: { stiffness: 120, damping: 24, mass: 1 }
  stagger: 70
  reducedMotion: instant

illustration:
  style: line
  strokeWidth: 1.4
  cardAreaRatio: 0.28
  placement: corner
  palette:
    surface: "cat-{slug}-surface"
    ink: "cat-{slug}-ink"
    accent: null

# px (비율 제외)
layout:
  maxWidth: 480
  minWidth: 360
  gutter: 24
  desktop:
    breakpoint: 1024
    columns: [2, 3]
    listMaxWidth: 460
  bottomActionZone:
    ratio: 0.333
    minTouch: 48
  tabBarHeight: 64
---


# DESIGN.md: Quiet Stone (시안 B)

작성일: 2026-10-28 (T1.5). 확인 페이지: `/design-lab/illustrations/b`, 캡처: `docs/design/shots/2026-10-28/design-lab-illustrations-b__{390,1280}__{light,dark}.png`.

## 1. 컨셉

**석회빛 샌드 위 짙은 올리브 한 색, 가는 세리프와 선화가 여백 속에서 조용히 고르게 돕는 화면**

무드: 고요한, 단정한, 여유로운.

아만에서 낮은 채도의 석회빛 바탕, 순흑 대신 짙은 회색 글자와 회녹 보조색, 가는 제목 세리프, 그림자 없이 1px 선과 면 톤으로 나누는 깊이, 느린 페이드를 가져왔습니다. 사진 의존, 라운드 0, 13px 안팎 작은 본문, 0.4초 전환은 버렸습니다. 사진이 할 일을 작은 선화 한 점과 여백이 대신합니다. 그 대신 숫자 3개는 Pretendard 500, 28px로 시안 중 가장 또렷하게 둡니다(고요함은 장식에서 빼고, 정보에서는 빼지 않습니다).

## 2. 색 사용 규칙

### 포인트 컬러 선택: 짙은 올리브 (흙갈색과 비교)

| 후보 | 값 (라이트) | 샌드 바탕에서의 인상 | 판단 |
| --- | --- | --- | --- |
| 짙은 올리브 | `oklch(0.43 0.055 118)` | 바탕(H 78)과 색상이 40도 떨어져 버튼이 "행동"으로 읽힘. 아만의 회녹 보조색과 같은 계열이라 한 가족처럼 보임 | **선택** |
| 흙갈색 | `oklch(0.40 0.04 60)` | 본문 글자(`oklch(0.3 0.008 70)`)와 색상, 명도가 모두 가까워 버튼이 "진한 글자 덩어리"처럼 보임. A(테라코타 H 40), C(클레이 H 50)와도 겹쳐 시안 간 차이가 줄어듦 | 제외 |

- **primary를 쓰는 곳**: 화면당 주 버튼 1개(홈 카드의 "길찾기", 투표방의 "투표하기" 등), 선택된 칩의 1px 테두리와 글자, 하단 탭 활성 표시 막대(2px), 득표 바 1위 채움, 포커스 링(`ring`).
- **쓰지 않는 곳**: 배경 틴트, 카드 면, 일러스트 선, 배지 바탕, 제목 글자. 선택 상태는 틴트 대신 1px 테두리나 밑줄로 표시합니다.
- **의미 색**: `success` 확정, 완료(점과 아이콘만, 면은 `success-surface`). `warning` 웨이팅, 기피 경고, 추정 가격. `info` 할인, 제보 같은 중립 안내. 오류는 `destructive`를 글자색으로만 쓰고 빨간 면을 깔지 않습니다. 의미 색 모두 채도 0.1 이하로 눌러 화면의 고요함을 깨지 않게 했습니다.
- **카테고리 색**: 12색 모두 라이트 L 0.93 C 0.021(색면), L 0.43 C 0.068(선)으로 명도와 채도를 같게 두고 색상(H)만 나눕니다. 무지개가 되지 않습니다.
- **다크**: 따뜻한 차콜 `oklch(0.205 0.006 70)` 위 샌드 글자, 올리브는 L 0.76으로 올리고 글자는 차콜(`primary-foreground` 0.2). 선(`border`)은 샌드 9% 알파.

### 대비 실측 (oklch를 sRGB로 바꾼 WCAG 2.x 계산, `parseDesignDoc` 통과 후 측정)

| 쌍 (fg / bg) | 최소 | 라이트 | 다크 |
| --- | --- | --- | --- |
| foreground / background | 4.5 | 11.86 | 14.36 |
| card-foreground / card | 4.5 | 12.33 | 13.47 |
| popover-foreground / popover | 4.5 | 12.58 | 12.08 |
| primary-foreground / primary | 4.5 | 7.44 | 8.55 |
| secondary-foreground / secondary | 4.5 | 10.93 | 11.70 |
| muted-foreground / background | 4.5 | 5.91 | 7.51 |
| muted-foreground / card | 4.5 | 6.14 | 7.05 |
| muted-foreground / muted | 4.5 | 5.50 | 6.42 |
| muted-foreground / secondary (추가) | 4.5 | 5.45 | 6.12 |
| accent-foreground / accent | 4.5 | 10.96 | 11.29 |
| destructive / background | 4.5 | 5.83 | 6.86 |
| destructive / card | 4.5 | 6.06 | 6.43 |
| primary / background | 3 | 6.95 | 8.48 |
| primary / card (추가, 선택 칩 글자) | 4.5 | 7.22 | 7.95 |
| ring / background | 3 | 4.71 | 6.32 |
| sidebar-foreground / sidebar | 4.5 | 11.44 | 13.94 |
| sidebar-primary-foreground / sidebar-primary | 4.5 | 7.44 | 8.55 |
| sidebar-accent-foreground / sidebar-accent | 4.5 | 10.96 | 11.29 |
| success-foreground / success-surface | 4.5 | 8.68 | 9.62 |
| warning-foreground / warning-surface | 4.5 | 7.94 | 9.81 |
| info-foreground / info-surface | 4.5 | 8.42 | 9.55 |
| success / card | 3 | 5.22 | 7.56 |
| warning / card | 3 | 4.29 | 8.61 |
| info / card | 3 | 5.35 | 7.38 |
| vote-bar / vote-bar-track | 3 | 6.11 | 6.46 |
| vote-bar-foreground / vote-bar | 4.5 | 7.44 | 8.55 |
| foreground / muted (추가) | 4.5 | 11.03 | 12.27 |
| cat-*-ink / cat-*-surface (12쌍) | 4.5 | 6.41~6.79 | 8.97~9.18 |

글자 쌍(4.5 기준)의 최저값은 라이트 5.45, 다크 6.12입니다. 3:1 기준 쌍의 최저는 `warning / card` 라이트 4.29입니다.

## 3. 타이포

### 서체

- **제목**: 마루 부리(MaruBuri) Light 300, Regular 400. **본문, 숫자**: Pretendard Variable.
- 세리프는 `display`, `title`, `heading`(식당명)에만 씁니다. 버튼, 칩, 숫자, 본문은 모두 Pretendard입니다. 숫자를 세리프로 쓰지 않는 이유는 마루 부리의 숫자가 고정폭이 아니고, 28px에서도 획이 가늘어 "숫자 3개가 분명히 읽혀야 한다"는 조건과 충돌하기 때문입니다.
- 로딩(T1.19): 루트 layout이 `src/app/fonts/index.ts`(next/font/local)로 Light 300, Regular 400 두 파일을 등록하고 `--font-maruburi`를 `<html>`에 붙입니다. 프런트매터 `font.heading.cssVar`가 이 변수를 가리킵니다. `display: swap`, `preload: false`, `adjustFontFallback: "Times New Roman"`(라틴 글자 크기 보정). 대체 스택은 `AppleMyungjo, Noto Serif KR, Batang, serif`. 굵기별 파일은 그 굵기 글자가 화면에 있을 때만 받습니다. 근거는 docs/design/bundle-log.md.

### 한글 세리프 웹폰트 비교와 용량 측정

측정 방법: 원본 TTF를 fontTools `pyftsubset`(4.68)로 Basic Latin 95자 + KS X 1001 한글 2,350자 + 문장부호 6자(총 2,451자)로 자르고 woff2(Brotli)로 저장했습니다. `--layout-features=kern,liga --no-hinting --desubroutinize`. Noto Serif KR은 가변 폰트라 `varLib.instancer`로 굵기별 정적 인스턴스를 만든 뒤 같은 조건으로 잘랐습니다. 비교 기준으로 현재 저장소의 Pretendard Variable KS X 1001 서브셋은 539,268 바이트(527KB, 전 굵기 포함)입니다.

| 후보 | 라이선스 | 굵기 | 서브셋 woff2 (굵기 1개) | 화면 인상 (31px 제목, 22px 식당명) |
| --- | --- | --- | --- | --- |
| **마루 부리** (네이버) | SIL OFL 1.1 | 200, 300, 400, 600, 700 | Light 140,404 B (137KB), Regular 138,488 B (135KB), SemiBold 159,436 B (156KB) | 부리가 짧고 획 대비가 낮아 현대적이고 조용함. 작은 크기에서도 획이 무너지지 않음. Light가 아만의 Lyon Display Light와 가장 가까움 |
| Noto Serif KR (Adobe, Google) | SIL OFL 1.1 | 200~900 가변 | 300: 300,600 B (294KB), 500: 318,832 B (311KB), 가변 300~600: 595,708 B (582KB) | 정통 명조, 획 대비가 커서 신문 같은 격식. 용량이 마루 부리의 2.2배 |
| 고운 바탕 (류양희) | SIL OFL 1.1 | 400, 700 | Regular 194,600 B (190KB), Bold 162,384 B (159KB) | 손글씨 기운이 있어 따뜻하지만 Light가 없어 고요함보다 다정함 쪽. 굵기 2개뿐 |
| 나눔명조 (네이버) | SIL OFL 1.1 | 400, 700, 800 | Regular 180,276 B (176KB) | 2008년 화면용 명조, 가로획이 가늘고 자간이 넓어 다소 낡아 보임 |

**선택: 마루 부리 Light 300 + Regular 400**, 합계 278,892 바이트(약 272KB). 둘 다 `src/app/fonts/MaruBuri-{Light,Regular}-KSX1001.woff2`, 라이선스 `src/app/fonts/MARUBURI-OFL-LICENSE.txt`.

- 확정되면 줄일 수 있는 길: (1) Regular 하나로 통일(약 135KB), (2) 제목에 실제로 쓰는 글자만 담은 정적 서브셋(화면 문구가 `src/copy`에 모여 있으므로 가능, 수 KB)과 식당명용 동적 대체를 분리. 식당명은 임의 글자라 (2)만으로는 안 되고 KS X 1001 밖 글자는 대체 서체로 보입니다.
- 위험: 세리프 파일은 홈 LCP 요소(식당명)의 서체이므로, 확정 시 `display: swap` 상태의 대체 서체와 줄 높이 차이를 맞춰야 합니다(`adjustFontFallback` 또는 size-adjust).

### 스케일

| 단계 | 크기/행간/굵기 | 서체 | 쓰는 곳 |
| --- | --- | --- | --- |
| display | 40px / 1.2 / 300, 자간 -0.02em | 세리프 | 랜딩 첫 문장, 확정 축하 한 줄 |
| title | 30px / 1.25 / 300 | 세리프 | 화면 제목("오늘의 추천"), 시트 제목 |
| heading | 22px / 1.35 / 400 | 세리프 | 카드 식당명, 섹션 제목 |
| body | 16px / 1.6 / 400 | Pretendard | 본문, 안내 |
| body-sm | 15px / 1.55 / 400 | Pretendard | 추천 이유 한 줄, 보조 설명 |
| label | 15px / 1.3 / 500 | Pretendard | 버튼, 칩, 탭 |
| caption | 13px / 1.4 / 500 | Pretendard | 숫자 위 라벨("도보"), 카테고리 이름, 배지 |
| numeric-lg | 28px / 1.05 / 500, 자간 -0.02em | Pretendard | 카드 숫자 3개 |
| numeric-md | 18px / 1.2 / 500 | Pretendard | 득표 수, 마감 카운트다운 |

- 제목(30)이 본문(16)의 약 2배이고, 굵기는 300으로 낮춰 크기만으로 위계를 만듭니다. 13px 미만 글자는 쓰지 않습니다.
- **숫자 표현**: 항상 `tabular-nums`. 숫자 28px와 단위 15px(`muted-foreground`)를 기준선에 맞춰 붙입니다("4" + "분", "9천" + "원대", "87" + "%"). 숫자 위에 13px 라벨("도보", "1인", "만족")을 둡니다. 카드 안 숫자 줄에는 문자 구분자 대신 1px 세로선(`border`)을 씁니다.

## 4. 레이아웃

- **폭과 여백**: 콘텐츠 최대 480px, 화면 좌우 24px. 간격 단계는 2xs 4, xs 8, sm 12, md 20, lg 28, xl 40, 2xl 56, 3xl 72px. 카드 안쪽 lg(28px), 카드 안 블록 사이 lg, 섹션 사이 2xl(56px). 아만의 64px 이상 간격은 모바일에서 스크롤만 늘려 56으로 줄였습니다.
- **홈 구성(분위기 참고, 배치는 G3에서 확정)**: 위에서부터 날짜와 끼니 caption, 화면 제목(title 세리프), 큰 단일 카드 1장(화면 높이의 약 60%), 카드 아래 "1/3" 위치 표시와 이전/다음 버튼. 카드 3장은 한 번에 1장만 보입니다.
- **하단 1/3 액션 영역**(화면 높이 33.3%): 카드의 주 버튼 "길찾기"(primary, 1개), 보조 버튼 "다른 곳"(테두리), 이전/다음 버튼, 하단 탭. 최소 터치 48px(기준 44보다 넉넉하게).
- **데스크톱(1024px 이상)**: 좌 리스트 2fr(최대 460px) + 우 지도 3fr. 리스트 쪽은 카드 3장을 세로로 모두 보여 주고 카드 사이 xl(40px). 지도와 리스트 사이는 1px 선 하나로 나눕니다.
- **360px 대응**: 좌우 여백 24 유지, 카드 안쪽만 28에서 20으로 줄입니다. 숫자 3칸은 같은 폭이 아니라 `0.8fr 1.3fr 0.9fr`로 가격 칸을 넓히고 각 칸 `white-space: nowrap`. 확인 페이지에서 360px에 "9천 원대"가 한 줄로 들어가는 것을 캡처로 확인했습니다.

## 5. 컴포넌트 규칙

### 추천 카드
- **해부도 (390px 기준, 카드 폭 342px)**: 라운드 24px(`radius.components.card: xl`), 그림자 없음, 1px `border`, 면 `card`(바탕보다 한 단계 밝은 석회). 안쪽 28px.
  1. **윗줄**: 왼쪽에 카테고리 이름(caption 13px, `cat-<slug>-ink`), 그 아래 8px 간격으로 식당명(heading 22px 세리프 400, 최대 2줄, `break-keep`). 오른쪽 위 모서리에 일러스트 96px 정사각(카드 폭의 28%), 카드 안쪽 여백에서 8px 바깥으로 살짝 밀어 모서리에 기대게 둡니다.
  2. **배지(최대 2개)**: 식당명 아래 12px, 왼쪽 정렬. 1px 테두리 + 글자(caption), 면 없음.
  3. **숫자 줄**: 윗줄과 28px 간격. 3칸, 각 칸 라벨(caption, `muted-foreground`) 위, 숫자(numeric-lg 28px) + 단위(15px) 아래. 칸 사이 1px 세로선.
  4. **이유 한 줄**: 숫자 줄 아래 28px, body-sm 15px `muted-foreground`, 한 줄 말줄임.
  5. **행동**: 맨 아래 "길찾기"(primary, 남은 폭 전체) + "다른 곳"(테두리 버튼), 둘 다 높이 48px.
- 상태: 눌림은 카드 전체가 아니라 버튼만 반응합니다. 포커스는 카드 바깥 2px `ring` + 2px 간격. 로딩은 같은 자리의 `skeleton` 면(일러스트 자리 원, 식당명 막대, 숫자 3막대), 쉬머는 `skeleton-highlight`로 1.6초 느린 왕복.

### 버튼
- 주 버튼: 알약(`button: full`), 높이 48, `primary` 면 + `primary-foreground` 글자(label 15/500). 눌림 시 명도 -0.04와 `press` 스프링 scale 0.98, 비활성은 `muted` 면 + `muted-foreground` 글자, 포커스 2px `ring` 바깥 2px.
- 보조 버튼: 알약, 1px `border` 테두리, 면 없음. 눌림 시 `muted` 면. 텍스트 버튼은 밑줄(1px, 글자 아래 3px)로 표시합니다.
- 한 화면에 primary 면 버튼은 1개입니다.

### 칩
- 알약, 높이 40(터치 영역은 상하 여백 포함 48), 1px `border`, 글자 label. 선택 시 면 틴트를 깔지 않고 테두리 1.5px(`border.strong`) `primary`와 글자 `primary`로 바꿉니다. 비활성은 글자 `muted-foreground` + 점선 테두리 대신 투명도 50%.

### 바텀시트
- 위쪽 라운드 28px(`sheet: 2xl`), 면 `popover`, 그림자 대신 위쪽 헤어라인(`shadow.sheet`). 손잡이 36x4px `border` 색. 뒤 딤 `overlay` 32%.
- 열림은 `sheet` 스프링(감쇠비 1.07, 오버슈트 없음) 약 300ms, 닫힘은 `exit` easing 180ms. 시트 안 제목은 title 세리프, 본문 블록 사이 lg.

### 하단 탭
- 높이 64 + safe-area, 면 `background`, 위쪽 1px `border`. 4개(오늘, 지도, 투표, 나), Lucide 1.5px 아이콘 22px + caption 라벨.
- 활성: 아이콘과 라벨 `foreground`, 탭 위쪽 가장자리에 2px x 20px `primary` 막대. 비활성: `muted-foreground`. 면 색으로 활성을 표시하지 않습니다.
- 데스크톱(1024px 이상) 2단에서는 좌 리스트 칸 아래에 같은 모양으로 둡니다. 지도를 가리지 않고 모바일과 같은 위치 감각을 유지합니다 (사용자 확정 2026-10-29, T2.6).

### 득표 바
- 트랙 `vote-bar-track` 높이 8px 알약, 채움 1위만 `vote-bar`(올리브), 나머지 후보는 `muted-foreground` 30% 대신 `chart-3`을 씁니다. 득표 수는 바 밖 오른쪽에 numeric-md, 1위는 `foreground`, 나머지는 `muted-foreground`. 길이 변화는 `bar` 스프링(감쇠비 1.1).

### 소셜 로그인 버튼 (T3.4)
- 카카오, 네이버, 구글 버튼은 각 사 가이드의 색과 심볼을 그대로 씁니다(프런트매터 `color.*.brand`, Tailwind `bg-brand-kakao` 등). 앱 포인트 컬러 규칙(한 화면 primary 1개)과 별개로 세지 않습니다.
- 모양: 높이 48, 라운드 12px(카카오 가이드 값, `rounded-md`), 심볼 왼쪽, 레이블 가운데. 레이블은 "카카오 로그인", "네이버 로그인", "Google 계정으로 계속하기"처럼 각 사 허용 문구를 씁니다.
- 구글은 라이트에서 Light 테마(흰 면, 회색 테두리), 다크에서 Dark 테마(#131314 면)를 따르고 G 로고 4색은 바꾸지 않습니다.
- 접근성 위험: 네이버 그린 위 흰 글자는 대비 약 2.3:1로 4.5:1에 못 미칩니다. 브랜드 가이드 값이라 대비 쌍 검사에서 뺐고, 버튼에 `aria-label`로 이름을 주며 레이블 크기를 15px 500으로 둡니다. 출시 전 네이버 공식 가이드 원문으로 다시 확인합니다([확인 필요]).

### 배지
- 라운드 8px(`badge: sm`), 높이 24, 좌우 8px, 1px 테두리 + caption 글자, 면 없음. 테두리와 글자 색은 의미 색 실색(`warning`, `info`)과 `*-foreground`를 씁니다. 카드당 최대 2개, 식당명 아래 한 줄.

## 6. 카테고리 일러스트 시스템

- **화풍**: 가는 선화. viewBox 96, 선 1.4(카드의 96px 표시에서 1.4px), round cap/join. 면은 음식 한 군데에만 선 색 16% 톤(짜장, 김치, 국물, 패티, 생선 살, 맥주처럼 그 음식의 "속")을 깔고 나머지는 채우지 않습니다. 모든 그림의 같은 자리(중심 40,42, 반지름 25)에 옅은 원 하나(`cat-<slug>-surface`)를 깔아 "물가의 돌"처럼 둡니다. 이 원이 12종을 한 가족으로 묶는 서명입니다. 선은 `cat-<slug>-ink` 단색, 강조 색(`accent`)은 없습니다.
- **배치**: 카드 오른쪽 위 모서리, 카드 폭의 28%(96px). 정보가 주인공이고 일러스트는 그 옆에서 카테고리를 한눈에 알려 줍니다. PRD 8.3의 "시각적 주인공"은 크기가 아니라 카드에서 유일한 그림이라는 점으로 맡습니다.
- **12종 모티프** (모두 음식과 그릇, 사람, 얼굴, 마스코트 없음)

| slug | 모티프 |
| --- | --- |
| hansik | 밥공기와 김치 한 접시, 젓가락 |
| jungsik | 짜장 그릇과 면을 집어 올린 젓가락 |
| ilsik | 나무 받침 위 초밥 두 점 |
| yangsik | 접시 위 파스타 둥지, 바질 잎, 포크 |
| bunsik | 떡볶이 접시와 김밥 한 줄 |
| gukbap | 받침 위 뚝배기, 김 세 줄, 숟가락 |
| gogi | 둥근 석쇠 위 고기 두 점과 상추 한 장 |
| asian | 쌀국수 그릇, 라임, 고수, 국물 숟가락 |
| fastfood | 버거 한 개 |
| salad | 볼 샐러드, 잎채소와 방울토마토 |
| cafe | 받침 위 커피 잔과 크루아상 |
| pub | 맥주잔과 꼬치 한 접시 |

- **다크**: 같은 SVG가 CSS 변수만 바뀌어 따라옵니다. 원은 L 0.285로 바탕보다 조금 밝게, 선은 L 0.85의 옅은 색으로 바뀝니다.
- **통일 규칙** (T2.8): 모든 그림은 바닥선 y 78에 앉고 가로 12~88 안에 듭니다. 시점은 약간 위에서 본 정면이라 그릇 입구는 납작한 타원입니다. 주 그릇은 원 아래에, 곁들이는 것은 오른쪽에, 수저와 포크는 오른쪽 위로(/ 방향) 기울입니다. 그릇 몸통과 굽은 공통 경로 함수로 그려 곡률을 같게 둡니다.
- **크기와 변형**: 카드 96px가 기준이고 큰 카드 120~160px에서는 화면 선 굵기가 완만하게 늘어납니다(144px에서 약 1.7px). 64px 미만(리스트 아이콘 32~40px)은 `icon` 변형으로, 바깥 여백을 자른 viewBox(12 8 76 76)에 결, 김, 깨 같은 잔선을 빼고 선을 1.25~1.5px로 둡니다. 선 굵기는 `size`로 계산하므로 크기는 className이 아니라 `size`로 줍니다.
- **구현**: `src/features/place/illustrations/` (`<CategoryIllustration slug size? variant? decorative? />`), 그림 하나 마크업 약 1~1.6KB. 기본은 장식이라 `aria-hidden`, 옆에 카테고리 이름이 없으면 `decorative={false}`로 `role="img"`와 카테고리 라벨을 붙입니다. 확인 페이지는 `/design-lab/illustrations`. 그릴 때 피한 것: 원 2개와 점을 나란히 두는 구성(김밥 단면, 마늘)이 얼굴처럼 읽혀 옆모습으로 바꿨습니다.

## 7. 모션

**성격: 숨을 고르듯 느리게 나타나고, 멈출 때 튀지 않습니다.**

- duration: fast 180ms(눌림, 칩), base 260ms(페이드, 카드 전환), slow 300ms(시트, CLAUDE.md 상한).
- easing: 모든 곡선의 y 값이 0~1 안에 있어 오버슈트가 없습니다. 등장은 `enter`(감속), 퇴장은 `exit`(가속, fast), 화면 전환은 `standard`.
- spring: 모두 감쇠비 1 이상(임계 감쇠). swipe 1.05, sheet 1.07, shuffle 1.06, press 1.04, bar 1.1.
- **사용 지점**
  - 카드 넘김: 스와이프 대신 크로스페이드 + 8px 수평 이동(base, `swipe` 스프링으로 손가락 추적), 이전/다음 버튼 필수.
  - 다시 뽑기: 카드 3장이 섞이는 셔플 대신 현재 카드가 페이드아웃, 새 카드가 stagger 70ms로 위에서 아래 블록 순서(식당명, 숫자, 이유)대로 페이드인.
  - 바텀시트: Base UI Drawer + `sheet` 스프링.
  - 득표 바: `bar` 스프링, 숫자는 NumberFlow로 굴리되 속도는 base.
  - 확정 축하: canvas-confetti를 쓰지 않고 display 세리프 한 줄이 slow로 페이드인하고, 1위 바가 올리브로 차오르는 것으로 대신합니다(시안 B의 고요함 유지, 번들 0).
- 홈 첫 화면에서 동시에 움직이는 것은 카드 페이드 하나뿐입니다.
- 홈 첫 화면 카드 등장은 CSS 전환(같은 duration, easing 토큰)으로 하고, Motion은 스와이프와 다시 뽑기처럼 상호작용 뒤에만 비동기로 불러옵니다. 홈 첫 로드 JS 예산 200KB를 지키기 위해서입니다 (design-decisions D-04).
- **reduced motion**: 모든 전환을 즉시 상태 변화로 바꾸고, 스켈레톤 쉬머도 멈춥니다.
- 동적 컴포넌트: Motion(`LazyMotion` + `domAnimation`), Base UI Drawer, NumberFlow, Sonner. canvas-confetti와 Embla는 쓰지 않습니다.

## 8. 문구 톤

tasks.md 2.2절(습니다체:해요체 약 7:3, Em dash와 중간점 금지)을 따릅니다. 시안 B는 짧고 낮은 목소리로, 느낌표를 거의 쓰지 않습니다.

- 추천 이유(명사형): `도보 약 4분, 지난주 👍한 국밥`
- 빈 상태(습니다체 + 해요체): `도보 10분 안에 조건에 맞는 식당이 없습니다. 15분까지 넓혀볼까요?`
- 확정 축하(해요체): `오늘 점심은 여기로 정했어요.`

## 9. Do / Don't

**Do**
- 숫자 3개는 Pretendard 500, 28px로 둡니다. 세리프는 제목과 식당명까지만 씁니다.
- 깊이는 1px 선과 면 톤 한 단계로만 만듭니다. 카드, 시트, 탭 모두 같은 규칙입니다.
- 선택 상태는 테두리나 밑줄로 표시하고, 올리브 면은 주 버튼과 1위 득표 바에만 씁니다.
- 일러스트는 항상 같은 자리의 옅은 원 하나와 1.4 선으로 그립니다.
- 여백을 줄여야 할 때는 카드 안쪽부터 줄이고, 숫자 크기는 줄이지 않습니다.

**Don't**
- 세리프를 300보다 가늘게(ExtraLight) 쓰거나 22px 미만 글자에 쓰지 않습니다.
- 그림 위에 색면 카드를 따로 깔거나 일러스트를 카드 폭 30%보다 크게 키우지 않습니다.
- 오버슈트 있는 스프링, 튀는 확대, 색종이 효과를 쓰지 않습니다.
- 카테고리 색으로 면을 넓게 칠하지 않습니다(카드 면은 항상 `card`).
- 원 두 개와 점을 나란히 두는 그림(얼굴로 읽힘)을 만들지 않습니다.
