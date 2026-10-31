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

작성일: 2026-10-28 (T1.5). G3 보강 2026-10-30 (T3.8): 5장 "오늘(홈) 화면", "그냥 골라줘", "랜딩", "배지" 색 체계(design-decisions D-05, D-06). 확인 페이지: `/design-lab/illustrations/b`, 캡처: `docs/design/shots/2026-10-28/design-lab-illustrations-b__{390,1280}__{light,dark}.png`.

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
- **의미 색**: `success` 확정, 완료(점과 아이콘만, 면은 `success-surface`). `warning`은 배지에서 투표 기피 경고 하나에만 씁니다(G3 calm, D-05). 웨이팅, 할인, 제보, 추정 가격은 의미 색 없이 중립(`input` 선 + `foreground` 글자 + `muted-foreground` 아이콘)으로 둡니다. 주황이 보이면 곧 "같이 못 먹는 사람이 있음"이라는 뜻이 되게 하기 위해서입니다. `info`는 배지에 쓰지 않고 화면 안 중립 안내용으로 남깁니다. 오류는 `destructive`를 글자색으로만 쓰고 빨간 면을 깔지 않습니다. 의미 색 모두 채도 0.1 이하로 눌러 화면의 고요함을 깨지 않게 했습니다.
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
- **홈 구성 (G3 확정, D-05)**: 머리(기준 위치 칩, 끼니 토글, 날짜, 제목) → 어제 피드백 한 줄 띠 → "오늘의 한 곳" 큰 카드 1장 → 대안 작은 카드 2장 → 하단 고정 행동 줄. 세 곳이 한 화면에 모두 보이고 넘기기가 없습니다. 치수와 상태는 5장 "오늘(홈) 화면"이 정본입니다.
- **하단 1/3 액션 영역**(화면 높이 33.3%): 홈은 하단 탭 바로 위 고정 행동 줄에 주 버튼 "길찾기"(primary, 1개), "그냥 골라줘"(테두리), 다시 뽑기 아이콘 버튼을 둡니다(390 x 844에서 길찾기 윗변 0.85). 최소 터치 48px(기준 44보다 넉넉하게).
- **데스크톱(1024px 이상)**: 좌 리스트 2fr(최대 460px) + 우 지도 3fr. 홈은 리스트 쪽에 모바일과 같은 세로 배치(큰 카드 + 대안 2장 + 행동 줄)를 그대로 두고, 지도는 추천 세 곳의 핀을 보여 주며 큰 카드의 핀만 올리브로 강조합니다(PRD REC-04 "좌 세로 3장 + 우 지도 2단"). 지도와 리스트 사이는 1px 선 하나로 나눕니다.
- **360px 대응**: 좌우 여백 24 유지, 카드 안쪽만 28에서 20으로 줄입니다. 숫자 3칸은 같은 폭이 아니라 `0.8fr 1.3fr 0.9fr`로 가격 칸을 넓히고 각 칸 `white-space: nowrap`. 확인 페이지에서 360px에 "9천 원대"가 한 줄로 들어가는 것을 캡처로 확인했습니다.

## 5. 컴포넌트 규칙

### 추천 카드
- 홈은 아래 "오늘(홈) 화면"의 큰 카드와 대안 카드를 씁니다. 이 절의 해부도는 G1 기준 카드이며, 지도 시트, 상세, 투표 후보 같은 다른 화면 카드는 각 화면 시안 게이트에서 이 기준과 홈 큰 카드 중 무엇을 따를지 정합니다.
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
- 모양: 높이 48, 라운드 12px(카카오 가이드 값, `rounded-md`), 심볼 왼쪽, 레이블 가운데. 레이블은 각 사 가이드 문구 "카카오 로그인", "네이버 로그인", "Google 계정으로 로그인"을 씁니다(근거와 출처는 `docs/copy-guide.md` 4.6). 심볼 SVG는 시안에서 가이드 형태를 따라 다시 그린 것이라 출시 전 각 사 공식 에셋으로 바꿉니다.
- 구글은 라이트에서 Light 테마(흰 면, 회색 테두리), 다크에서 Dark 테마(#131314 면)를 따르고 G 로고 4색은 바꾸지 않습니다.
- 접근성 위험: 네이버 그린 위 흰 글자는 대비 약 2.3:1로 4.5:1에 못 미칩니다. 브랜드 가이드 값이라 대비 쌍 검사에서 뺐고, 버튼에 `aria-label`로 이름을 주며 레이블 크기를 15px 500으로 둡니다. 브랜드 예외로 기록합니다(G3 안건 7, 2026-10-30). **4단계 로그인 구현 전 네이버 로그인 BI 원문(https://developers.naver.com/docs/login/bi/bi.md)을 확인하고, 대비가 더 높은 공식 유형(예: 흰 면 또는 어두운 면 버튼)이 있으면 그 유형으로 교체합니다**([확인 필요]).

### 배지 (G3 calm 확정, D-05 안건 1)
- 모양: 라운드 8px(`badge: sm`), 높이 24, 좌우 8px, 아이콘 14px(선 1.75), 1px 테두리 + caption 글자, 면 없음. 배지 사이 8px.
- **개수와 우선순위**: 카드 배지 줄은 최대 2개. 기피 경고 > 웨이팅(줄 길어요 > 조금 기다려요 > 바로 입장) > 할인 > 제보 순으로 남깁니다(`src/components/badges/pick-badges.ts` `BADGE_PRIORITY`, 근거 `docs/design/g3-card-rules.md` 2절). 같은 종류가 여러 번이면 우선순위 높은 하나만.
- **추정은 배지가 아닙니다**: 제보 가격이 없을 때의 "추정"은 배지 줄에 오지 않고 가격 칸 라벨 옆에 테두리 없는 caption 글자(`muted-foreground`)로 붙어 "1인 추정"으로 읽힙니다(`EstimateMark`, 스크린 리더 "추정 가격").
- **색 (calm)**: 의미 색은 기피 경고 하나(`warning` 테두리 + `warning-foreground` 글자 + TriangleAlert 아이콘). 웨이팅 3단계, 할인, 제보는 Badge `neutral`(`input` 테두리 + `foreground` 글자, 아이콘 `muted-foreground`). 색이 빠진 자리는 아이콘이 맡습니다: 바로 입장 DoorOpen, 조금 기다려요 Hourglass, 줄 길어요 UsersRound, 할인 BadgePercent. 라벨 글자도 모두 다릅니다.
- 대비(테스트 `src/components/badges/badge-contrast.test.ts`): `foreground` card 위 라이트 12.33, 다크 13.47, `warning-foreground` 라이트 8.83, 다크 12.05, `muted-foreground`(추정 글자, 아이콘) 라이트 6.14, 다크 7.05. 배지 테두리는 장식이라 계산하지 않습니다.
- 설명 툴팁(`withTooltip`)은 키보드 포커스를 받게 해서 쓰고, 꼭 알아야 하는 고지(DEAL-02)는 상세 본문에도 둡니다. 툴팁은 홈 첫 로드 예산 때문에 지연 로딩으로 나눠 씁니다(T5.17 전 작업).

### 오늘(홈) 화면 (G3 D1 확정, D-05)
확인 화면 `/design-lab/home/d1`, 코드 `src/features/design-lab/home/`. 아래 치수는 390px 기준, 괄호는 360px(화면 폭 23.75rem 이하)와 데스크톱(1024px 이상) 값입니다.

- **틀**: 리스트 칸 최대 480(데스크톱 460), 좌우 24(데스크톱 40), 위 20(데스크톱 32). 블록 사이 20(데스크톱 16).
- **머리**: 1행 기준 위치 칩(왼쪽, 높이 40, 터치 44) + 끼니 토글(오른쪽, 글자 두 개, 선택 쪽만 `foreground` + 1px 밑줄). 2행 날짜와 끼니 caption("10월 28일 수요일 점심", `muted-foreground`). 3행 제목 "오늘의 추천" title 30 세리프. 행 사이 24(데스크톱 16), 날짜와 제목 사이 6.
- **어제 피드백 한 줄 띠 (FB-01)**: 머리 바로 아래, 위아래 1px `border` 헤어라인만 있고 카드 면이 없습니다. 묻는 상태는 최소 높이 64, 위아래 10: 카테고리 일러스트 36(icon 변형) + "어제 간 ○○, 어땠어요?"(body-sm 15) 아래 "안 갔어요" 밑줄 글자 버튼(caption, 터치 44) + 오른쪽 👍 👎 원형 버튼 44(1px `border`, 면 `card`, 아이콘 18 선 1.5, 사이 8, 이름 "좋았어요" "별로였어요").
  - **답한 뒤**: 한 탭이면 띠가 한 줄로 접힙니다(높이 전환 base 260ms `standard`, 위아래 4). 체크 아이콘 16(`success`) + "알려 줘서 고마워요"(`foreground`)만 보이고 뒷말("다음 추천에 반영합니다." 또는 안 갔어요면 "추천 점수에는 쓰지 않습니다.")은 스크린 리더에만 읽힙니다(`role="status"`). 오른쪽에 선택 입력(FB-02) "가격, 태그 남기기" 밑줄 글자 버튼 하나(안 갔어요에는 없음). 누른 버튼이 사라지므로 포커스는 고마움 줄로 옮깁니다. 띠는 그날 계속 남습니다.
  - 물을 곳이 없는 날(FB-04: 하루 1회, 48시간 지난 방문 제외)은 띠가 없습니다. 로딩, 빈 상태, 오류에서도 띠를 보이고(추천과 따로 오는 정보) 오프라인에서는 보낼 수 없어 숨깁니다.
- **"오늘의 한 곳" 큰 카드**: 라운드 24, 1px `border`, 면 `card`, 그림자 없음, 안쪽 24(360px 20).
  1. 윗줄: 왼쪽 열(위 4) "오늘의 한 곳" caption `muted-foreground` → 16 아래 카테고리 caption(`cat-<slug>-ink`) → 4 아래 식당명 **title 30 세리프**(`text-balance`, `break-keep`). 오른쪽 일러스트 **152px**(카드 폭 342의 약 44%, 이 카드 한정 예외, 6장), 위 -12 오른쪽 -16 아래 -24로 모서리에 기대고 아래 여백은 이유 줄과 겹쳐도 됩니다(360px 112, 데스크톱 128).
  2. 이유: 8 아래, **body 16 `foreground`**, 최대 2줄. 이유 문장에서 "도보 약 N분"은 뺍니다(아래 숫자 칸과 중복, `src/features/rec/reason.ts`).
  3. 배지 줄: 12 아래, 최소 높이 24, 왼쪽 배지 최대 2개 + 오른쪽 "상세" 밑줄 글자 버튼(caption, 터치 44).
  4. 숫자 3칸: 20 아래, 칸 폭 `0.8fr 1.3fr 0.9fr`, 칸 사이 1px 세로선, 칸 안쪽 16(360px 12). 라벨 caption 13(가격 칸은 라벨 옆 "추정") 위, 숫자 **numeric-md 18** + 단위 caption 13 아래, 사이 6. 숫자가 작은 이유: 이름과 이유가 결정의 중심이고 세 곳의 도보 차이는 2~4분이라 숫자는 확인용입니다(`g3-card-rules.md` 1절).
  - 읽는 순서: 이름 30 → 이유 16 → 배지 → 숫자 18. 큰 카드에는 버튼이 없습니다(행동은 하단 줄).
- **대안 카드 2장**: 큰 카드 20 아래(데스크톱 16) "또는 이 두 곳" caption, 8 아래 2열 격자(사이 8). 카드 하나는 최소 높이 72, 라운드 24, 1px `border`, 면 `card`, 안쪽 좌우 12 위아래 10, 줄 사이 4. 1줄 일러스트 28(icon) + 식당명 label 15/500(한 줄 말줄임), 2줄 도보 numeric-md 18 + "분" | 1px x 12 세로선 | 👍 아이콘 14 + 만족 numeric-md 18 + "%"(후기 3건 미만이면 "후기 모으는 중" caption). 가격은 큰 카드로 올려 봅니다. 누르면 큰 카드와 자리를 바꾸고(지도 핀 강조도 따라감) "오늘의 한 곳을 바꿨습니다. ○○입니다."를 안내합니다. 접근성 이름은 보이는 글자 + "크게 보기".
- **하단 고정 행동 줄**: 하단 탭 바로 위에 붙고(`sticky`, 탭 높이 64 + safe-area), 위 1px `border`, 면 `background`, 위아래 12. 모바일은 화면 끝까지(선이 탭 바 선과 나란히), 데스크톱은 리스트 내용 폭. 내용이 길면 스크롤해도 엄지 자리에 남고 지나가는 카드를 가립니다. 구성(사이 8): **길찾기** primary 높이 48, 남은 폭 전체(화면의 유일한 올리브 면 버튼, 이름 "○○ 길찾기") + **그냥 골라줘** 테두리 버튼 높이 48, 최소 폭 128(주사위 아이콘 16, 연출 중에는 같은 자리 "바로 보기") + **다시 뽑기** 아이콘 버튼 48 원(이름 "다시 뽑기").
- **상태**: 로딩은 같은 자리 같은 높이의 스켈레톤(큰 카드, 대안 2장, 행동 줄)으로 로딩 뒤 출렁이지 않습니다. 빈 상태, 오류, 오프라인은 머리(와 띠) 아래 카드 면 안내(빈 상태만 primary 버튼). 오프라인은 띠를 숨깁니다.
- **데스크톱**: 좌 리스트 칸에 위와 같은 세로 배치, 우 지도에 세 곳 핀, 큰 카드의 핀만 올리브. 그냥 골라줘 결과 패널은 좌 리스트 칸만 덮고(지도는 덮지 않아 핀 강조가 보임) 그 칸 아래, 하단 탭 위 24에 뜹니다.
- **구현 중 확정(2026-10-31)**: "왜 추천했나요?"는 큰 카드 이유 줄 바로 아래 글자 버튼(caption, `muted-foreground`, 아래 꺾쇠, 터치 44)입니다. 누르면 그 자리에서 펼침 문장(REC-07)이 열립니다.
- **모션**: 첫 화면은 카드 묶음 CSS 페이드 하나(slow 300, `enter`). 다시 뽑기는 지금 묶음 fast 페이드 아웃 → 새 블록이 70ms 간격 slow 페이드 인(큰 카드: 윗줄 0, 이유 1, 배지 2, 숫자 3, 대안 5, 6번째). 대안을 누르면 큰 카드 자리만 fast로 사라지고 새 카드가 slow로 8px 떠오릅니다. Motion은 이 두 상호작용 뒤에만 씁니다(D-04).

### 그냥 골라줘 (REC-12, G3 R1 확정, D-05)
- **고르기**: 누르는 순간 `pickByScore`(점수 비례, 시드 주입 rng)로 결과를 먼저 정하고 연출은 그 결과에 닿게만 합니다. "다시 고르기"는 **직전 결과를 빼고** 남은 곳에서 고릅니다.
- **R1 하이라이트 순회**: 화면의 큰 카드와 대안 카드 위에서 강조(카드 테두리 `primary`, 전환 fast 180)가 지금 큰 카드에서 시작해 한 칸씩 옮겨 다닙니다. 최소 2바퀴 + 목표까지(3곳이면 6~8칸), 칸 간격은 60ms에서 260ms로 이차 곡선으로 늘어나고(오버슈트 없음), 마지막 칸에 닿으면 나머지 카드가 40% 투명도로 물러난 뒤 200ms 머뭅니다. 결과까지 1.07~1.32초, 결과 패널 등장 300ms를 더해 1.37~1.62초로 **2초 예산** 안입니다(`src/features/rec/roulette.ts`, 테스트).
- **건너뛰기**: 연출 중 화면 어디든 누르기, Esc, Enter, Space, 또는 버튼 자리의 "바로 보기". 축소 모드는 연출 없이 바로 결과.
- **결과**: 결과가 대안이면 큰 카드로 올려 둡니다(닫은 뒤 바로 그 카드, 데스크톱 지도 핀도 따라감). 결과 패널은 모바일 아래 시트(위 라운드 28, 면 `popover`, 안쪽 28, 360px 20, 뒤 `overlay` 딤, 흐림 없음), 데스크톱은 좌 리스트 칸 안 카드(최대 폭 416, 라운드 24). 등장은 패널 하나가 slow 300 페이드 + 8px 올라옴, 닫힘은 fast 180 페이드 + 8px 내려감. 내용: "오늘은 여기로 가요." heading 22 세리프 `muted-foreground` + 닫기 아이콘 → 20 아래 카테고리 caption과 식당명 title 30(한 줄) + 일러스트 72 → 이유 body-sm 15 `muted-foreground`(도보 분 제외, 최대 2줄) + 배지 → 24 아래 숫자 3칸(18) → 32 아래 "길찾기" primary 전체 폭, "다시 고르기" 테두리 전체 폭(사이 8).
- **접근성**: 연출 중 "세 곳 중에서 고르고 있습니다.", 결과 "○○, 오늘은 여기로 가요."를 `role="status"`로 안내합니다. 패널은 `role="dialog"`, 열리면 패널에 포커스, Tab은 패널 안에서만 돌고, 닫으면 그냥 골라줘 버튼으로 돌아갑니다. Esc와 딤 누르기로 닫습니다.
- **햅틱과 번들**: 누르는 순간 tap, 연출 중 눌러 건너뛰면 select(타이머 안에서는 진동하지 않음). 결과 패널은 처음 누를 때 받고(React.lazy, 버튼에 손이나 포커스가 닿으면 미리 받음) Motion 없이 CSS와 타이머만 써서 홈 첫 로드 증가는 0입니다.

### 랜딩 (G3 B 확정, D-06)
실제 화면 `/`(T4.28), 코드 `src/features/landing/`, 문구 `src/copy/landing.ts`. 확인 화면 `/design-lab/landing/b`는 같은 컴포넌트에 상태를 입힙니다(`?state=loading|offline`, `?inapp=kakao`, `?flags=off`). 포인트 컬러 버튼은 "추천 먼저 받아 보기" 하나입니다.

- **틀**: 본문 최대 480(데스크톱 1152), 좌우 24(데스크톱 64), 위 24(데스크톱 40), 아래 40. 머리는 워드마크(label 15/500 산세리프) + 모바일만 오른쪽 "로그인" 바로가기 링크(로그인 버튼이 둘째 화면이라 그 자리로 이동, 터치 44).
- **모바일 순서** (사이 40): (1) 가치 제안: "직접 눌러 보세요" caption → 제목 "오늘 점심, 세 곳이면 충분해요" title 30 세리프(데스크톱 display 40) → 설명 body-sm 15 `muted-foreground`, 사이 16. (2) 데모: "예시 식당입니다" caption + 오른쪽 묶음 번호 "1/3"(`tabular-nums`), 데모 카드 3장(사이 12), 가운데 "다시 뽑기" 테두리 버튼. (3) 행동: "내 위치로 해 볼까요?" + "추천 먼저 받아 보기" primary 전체 폭 + "로그인 없이 내 주변 세 곳을 봅니다." caption, 구분 줄 "로그인하고 기록 남기기", 소셜 로그인 3개, 약관 문장.
- **데스크톱**: 2열 격자 `minmax(0,26rem) minmax(0,30rem)`, 세로 가운데, 양 끝 정렬, 사이 80. 왼쪽에 가치 제안과 행동(사이 40), 오른쪽에 데모. 첫 화면에 모두 들어와 머리 "로그인" 링크는 숨깁니다.
- **데모 카드**: 라운드 24, 1px `border`, 면 `card`, 안쪽 20(360px 16), 일러스트 56 왼쪽(사이 16, 360px 12). 오른쪽에 카테고리 caption + 식당명 heading 22 세리프(한 줄), 12 아래 숫자 3칸(칸 폭 `0.6fr 1.2fr 1.2fr`, 1px 세로선, 숫자 numeric-md 18 + 단위 caption), 12 아래 이유 body-sm 15 `muted-foreground` 최대 2줄(도보 분 제외). 예시라는 사실을 데모 위 caption으로 밝힙니다.
- **다시 뽑기 셔플 (CSS, Motion 없음)**: 누르면 지금 세 장이 함께 fast 180 `exit` 페이드 아웃 → 끝나면(애니메이션 끝 이벤트, 안전 시간 400ms) 새 세 장이 slow 300 `enter`로 8px 아래에서 떠오르며 70ms 간격(2번째 70, 3번째 140). 한 순간에 움직이는 효과는 하나입니다. 축소 모드는 애니메이션 없이 바로 바꿉니다. 새 묶음은 `aria-live`로 "새로운 세 곳을 뽑았습니다. N번째 묶음입니다." 코드 `landing.css` `.lm-shuffle`.
- **첫 화면 손짓**: 첫 묶음에서만 다시 뽑기 아이콘이 2.4초 뒤 한 번, 600ms(slow x 2) 동안 -360도 돕니다(`.lm-nudge`, 축소 모드 끔). 첫 화면에서 움직이는 것은 이것 하나이고, 어떤 요소도 opacity 0에서 시작하지 않습니다(LCP).
- **상태**: 로딩은 데모 자리에 같은 상자의 스켈레톤 3장(실제 랜딩은 정적 예시라 확인 화면에서만). 오프라인은 데모는 그대로 두고 체험과 로그인을 `aria-disabled`로 막고 그 위에 오프라인 안내(아이콘 + 글자, 빨간 면 없음). 로그인은 `/login`과 같은 폼 POST(`/auth/sign-in`)라 오류와 취소는 `/login?error=` 화면이 안내합니다(랜딩에 토스트 없음). 인앱(AUTH-04)은 카카오를 권하는 한 줄 + 구글 아래 안내, 구글을 누르면 서버가 `/login?view=inapp` 안내로 보냅니다. 앱과 로그인 플래그가 꺼진 운영 환경은 체험과 로그인 자리에 "지금은 출시를 준비하고 있습니다" 안내(아이콘 + 글자)만 둡니다. 로그인 사용자가 `/`에 오면 proxy가 `/today`로 보냅니다.
- **번들**: 첫 로드 `/` 약 179KB(시안 측정, 예산 200KB), 상호작용 뒤 비동기는 토스트(sonner) 약 10.7KB뿐입니다.

### 온보딩 (T4.3 B + C 단축 확정, D-07)
확인 화면 `/design-lab/onboarding/b`, 코드 `src/features/design-lab/onboarding/`. 흐름은 1 위치 → 2 예산과 거리 → 3 못 먹는 음식 → 완료 즉시 첫 추천 3곳(ONB-05)입니다.

- **틀 (모바일)**: 지도가 처음부터 끝까지 화면 위쪽 배경에 남고, 아래 시트(바텀시트 규칙, 위 라운드 28, 면 `popover`, 손잡이)가 지도 위로 28 겹쳐 올라옵니다. 시트 최대 높이 화면 72%(완료 화면 88%), 내용은 시트 안에서 스크롤하고 하단 줄은 시트 아래에 고정. 지도는 최소 176을 남깁니다.
- **데스크톱**: 왼쪽 460 패널(시트 내용, 면 `background`, 좌우 40) + 오른쪽 지도(왼쪽 1px `border`). 홈 D1의 좌 리스트 + 우 지도와 같은 자리라 완료 뒤 첫 추천으로 그대로 이어집니다.
- **진행 표시**: 시트 머리(높이 48, 데스크톱 80)에 단계 이름 세 개("위치", "예산과 거리", "못 먹는 음식", caption). 지금 단계만 `foreground` + 1px 밑줄(홈 끼니 토글과 같은 말투), 나머지는 `muted-foreground`. 이름을 눌러 지난 단계로 돌아갑니다(핀이 없으면 2, 3단계는 막힘). 스크린 리더 이름 "3단계 중 N단계, 이름". 2, 3단계 머리 오른쪽에 "건너뛰기" 밑줄 글자 버튼.
- **1단계 위치 (ONB-01, 안건 1)**: 핀은 **지도를 누르거나 핀을 끌어서 놓습니다.** 처음과 검색, 현위치 직후에는 핀이 비어 있고 지도만 옮겨집니다. 핀을 놓는 동작(누름, 끌기 끝, 키보드 Enter)이 있어야만 "이 위치로 저장"(primary, 하단 줄)이 켜지고, 그 전에는 버튼 위에 "핀을 놓으면 저장할 수 있습니다." 한 줄. 지도 아래에 저장 고지("검색 결과는 지도 이동에만 씁니다. 저장하는 것은 직접 놓은 핀 위치뿐입니다."). 현위치 버튼은 지도 오른쪽 아래 원형 44. 가운데 고정 핀(지도를 끌어 맞춤)은 쓰지 않습니다.
- **2단계 예산과 거리 (ONB-02)**: 슬라이더 세 개(점심 5천~3만 원, 저녁 1만~6만 원, 1천 원 단위, 도보 5~20분 5분 단위, 기본 1만, 2만, 10분). 값은 numeric 숫자 + 단위 caption, "기본값" 표시. 걷는 거리를 움직이면 지도에서 핀 둘레 원(반경 = 도보 분 x 67 ÷ 1.3 m)이 커지고 원 안 식당 점이 `primary`로 바뀌며, 원이 화면을 넘으면 지도가 물러납니다(base 260). 아래 한 줄 "이 거리 안의 식당 약 N곳", 카카오 상한 45곳에 닿으면 "45곳 이상". 0곳이면 빈 상태와 "10분으로 넓히기".
- **3단계 못 먹는 음식 (ONB-03)**: 음식 종류 칩 8, 알레르기 칩 8(칩 규칙), 직접 입력 칸 + "추가". 시트가 길어지고 지도는 위에 띠로 남습니다. 직접 입력 판정 규칙은 T5에서 정합니다.
- **건너뛰기와 단축**: "건너뛰기"는 그 단계를 **기본값으로 두고** 다음 단계로 갑니다(값을 비우지 않음). 위치를 정한 뒤 2, 3단계 하단 줄에는 C에서 가져온 **"여기까지 하고 시작"** 밑줄 글자 버튼을 primary 아래에 둡니다(나머지를 기본값으로 두고 바로 완료). 한 화면 primary는 하나("이 위치로 저장", "다음", "완료" 중 하나)입니다.
- **완료 (ONB-05)**: 시트에 "설정을 마쳤습니다" caption + "오늘의 추천 3곳입니다" 제목 + 첫 추천 세 곳, 지도에는 원과 핀이 남습니다. "홈에서 이어 보기"는 하단 고정 줄에 둡니다(시안에서는 390 첫 화면 밖, `g4-comparison.md` 6절).
- **상태**: 로딩은 지도 자리와 시트 내용의 스켈레톤, 위치 권한 거부는 1단계 시트에 안내(검색으로 계속, AC-ONB-2), 오프라인과 저장 실패는 하단 줄 위 안내 한 줄(고른 값은 그대로 둠).
- **모션 (CSS, Motion 없음)**: 단계가 바뀌면 시트 내용이 8px 아래에서 slow 300 `enter`로 떠오릅니다. 지도 원과 축척, 검색 이동은 base 260 `standard`, 끄는 동안은 즉시. 핀을 끄는 동안 6px 들렸다가 내려앉습니다(fast). 한 순간에 움직이는 것은 하나, 축소 모드는 모두 끔.
- **접근성**: 지도는 방향키로 움직이고 Enter로 가운데에 핀을 놓습니다(끌기만 있는 조작 금지). 단계가 바뀌면 단계 제목으로 초점을 옮기고 안내를 `role="status"`로 읽습니다.

### 로그인과 약관 (T4.3 B + A 시트 확정, D-08)
확인 화면 `/design-lab/auth/b`(전용 화면), `/design-lab/auth/a`(둘러보기 중 행동 시트), 코드 `src/features/design-lab/auth/`. 로그인 단계에는 primary 면 버튼이 없고 브랜드 버튼(소셜 로그인 버튼 규칙)뿐입니다.

- **어디에 무엇을**: `/login`, 초대 링크(`/poll/[code]`)에서 들어오는 로그인, 약관 동의, 인앱 안내는 **전용 화면(B)**. 비로그인 둘러보기 중 저장, 후기, 투표를 누르면(AUTH-07) 보던 화면 위에 **로그인 유도 시트(A)**를 띄웁니다(바텀시트 규칙, 뒤 딤 32%, 데스크톱은 가운데 카드 최대 416, 라운드 28). 시트에서 로그인하면 약관은 B 화면에서 받습니다. 시트의 Drawer는 행동을 누른 뒤 지연 로딩합니다(홈 첫 로드 밖).
- **전용 화면 틀**: 머리 높이 64(뒤로 아이콘 버튼 44 + 가운데 워드마크), 위에 맥락 줄(누른 행동과 대상, 일러스트 + caption + label, 예 "정담국밥, 투표 만들기") → 제목 title 30 세리프 + 이유 body `muted-foreground` → 로그인하면 되는 일 3줄(헤어라인 목록, caption). 브랜드 버튼 3개는 하단 1/3, 그 아래 "로그인이 끝나면 이 화면으로 돌아옵니다." caption(AUTH-03).
- **데스크톱 (1024 이상)**: 2단. 왼쪽은 면 `card` 칸(오른쪽 1px `border`, 좌우 64)에 display 세리프 한 문장 + 로그인하면 되는 일 3가지, 오른쪽은 행동 칸(최대 352).
- **유도 시트 내용**: 눈썹 caption(누른 행동) → 제목 title 세리프("투표는 로그인 후 만들 수 있습니다", 바텀시트 규칙) → 이유 한두 문장 → 브랜드 버튼 3개 → "계속 둘러보기" 글자 버튼과 돌아오기 문구(B와 같은 문장, 마침표 포함).
- **약관 동의 (AUTH-02, AUTH-06, 안건 6)**: 항목은 **필수 3개뿐**(만 14세 이상입니다, 이용약관 동의, 개인정보 수집 이용 동의). 선택 항목과 마케팅 동의는 없습니다. 카드 면 없이 헤어라인으로 나눈 목록: 맨 위 "모두 동의합니다" 줄(최소 높이 64, 아래 선 `foreground` 80%), 항목 줄 최소 높이 56(체크박스 + "필수" 표시 + 이름, 오른쪽 "보기"로 전문). 부제와 항목 글자는 `break-keep`. 위치정보 내용은 개인정보 처리방침 안 한 단락(안건 8). 비공개 후기 집계 고지 한 줄(PRD 11.2).
- **동의 버튼 (안건 12)**: primary 전체 폭, 하단 줄. 필수가 남아 있으면 꺼진 모양 + `aria-disabled`(초점은 받음)이고 바로 위 한 줄이 "필수 항목 N개에 동의해 주세요"를 실시간으로 말합니다. 모두 고르면 "필수 항목에 모두 동의했습니다". 버튼 문구는 하려던 일을 잇습니다: "동의하고 투표 만들기", 맥락이 없으면 "동의하고 시작하기"(C에서 가져옴).
- **나중에 하기 (안건 9)**: 약관 화면의 "나중에 하기"는 로그아웃하고 둘러보기로 돌아갑니다. 그 사실을 버튼 근처 caption으로 알리고, 다음 로그인 때 다시 묻습니다.
- **인앱 안내 (AUTH-04, 안건 10, 11)**: 인앱이면 카카오 로그인을 맨 위에 두고 "카카오톡에서는 카카오 로그인이 가장 빠릅니다." 한 줄. 구글을 누르면 iOS와 Android 모두 먼저 외부 브라우저 열기 스킴을 자동 시도하고, 실패하면 인앱 안내 화면(B)으로 갑니다: 제목 + 메뉴 위치 그림(메뉴 버튼 둘레 링이 두 번 숨 쉬고 멈춤) + 번호 단계 3줄 + "링크 복사" + "또는 여기서 바로" 카카오 로그인. 네이버 앱 인앱도 실기기 확인 전까지 같은 안내를 씁니다.
- **상태**: 제공자로 이동 중은 버튼 위 2px 진행 선(스피너 금지), 취소와 오류는 버튼 위 안내 한 줄과 다음 행동, 오프라인은 버튼을 `aria-disabled`로 막고 안내. 약관 저장 실패는 고른 항목을 그대로 두고 다시 누르기 안내.
- **모션**: 화면과 시트 안 단계 전환은 새 내용이 8px 아래에서 slow 300 `enter`로 떠오르는 것 하나(CSS). 화면이 바뀌면 제목으로 초점을 옮깁니다. 시트는 초점을 가두고 닫히면 누른 버튼으로 돌아갑니다.

### 지도 (T5.3 B + 고른 마커 그림 확정, D-09)
확인 화면 `/design-lab/map/b`, 코드 `src/features/design-lab/map/`(B 화면 `b/`, 공용 시트와 지도 `shared/`). 지도는 `MapProvider` 인터페이스로 감싸고 마커는 `addMarker`에 넘긴 빈 DOM 요소 안을 React 포털로 그립니다.

- **틀 (모바일)**: 지도가 탭 바 위 전체를 채우고, 지도 위 겹침은 맨 위 기준 위치 칩과 오른쪽 아래 현위치 버튼(원 44)만 둡니다. 필터 칩과 목록은 지도 위가 아니라 **시트 안**에 있습니다. 첫 화면은 회사 핀과 도보 반경 원(점선) 전체가 "위 칩과 시트 사이 보이는 칸"에 들어오게 맞춥니다.
- **마커 (MAP-02, 안건 2)**: 도보 분 알약. 높이 36, 최소 폭 44, 라운드 `chip`, 1px `border`, 면 `card`, 좌우 10. 왼쪽 8px 점이 카테고리 색(`cat-<slug>-ink`), 오른쪽 "4분"(label 15, `tabular-nums`, 단위 caption `muted-foreground`), 아래 8px 꼬리. **고른 마커**만 면과 테두리가 `primary`, 글자 `primary-foreground`로 바뀌고 이름이 펼쳐지며("정담국밥 4분", 최대 폭 160), 점 자리에 **카테고리 그림을 담은 작은 원**이 붙습니다(A에서 가져옴, 일러스트 icon 변형). 고른 마커는 이웃보다 위로 올립니다(`MarkerHandle.setZIndex`, T5.27).
- **클러스터 (안건 8)**: 알약 폭 기준 약 40px 안에 모이면 한 마커로 묶습니다. 모양은 알약 두 장이 겹친 묶음(뒤 장 4px 어긋남, 1px `foreground` 40% 테두리) + "3곳". 누르면 그 자리로 다가가며 펼쳐집니다(네이버 MarkerClustering, T5.27).
- **시트 (안건 3, 4)**: **지도 칸 안 직접 구현**(포인터 끌기 + CSS 전환, `shared/map-sheet.tsx`). Base UI Drawer를 쓰지 않습니다(모달이 아니고 탭 바 위에 앉으며 데스크톱에서 좌 칸이 되므로). 바텀시트 규칙의 모양(위 라운드 28, 면 `popover`, 손잡이)을 따르되 뒤 딤은 없습니다. 높이는 **2단: 반쯤(지도 칸의 48%) / 끝까지.** 반쯤에서는 시트 머리(개수 + 필터 칩)와 목록, 마커를 고르면 그 식당의 요약(아래 "식당 상세"의 절반 높이 내용). 끝까지는 식당 상세 본문입니다. 끄는 동안은 손가락을 바로 따르고, 놓으면 가까운 단계로 slow 300 `enter`(오버슈트 없음). 손잡이는 버튼(누르면 한 단계 올림, 끝까지면 내림, 바뀐 높이를 `aria-live`로 알림)이라 끌기 없이도 쓸 수 있습니다.
- **필터 칩 (MAP-03, 안건 5)**: 시트 머리 안, 목록 바로 위 가로 줄: 카테고리(펼쳐 고름), 1만 원 이하, 도보 5분 안, 👍 상위(80% 이상, **후기 3건 이상인 곳만**), 즐겨찾기. 칩 규칙을 따르고 지도와 목록이 바로 바뀝니다. 0곳이면 "필터 모두 풀기" 빈 상태.
- **이 지역에서 다시 찾기 (MAP-05, 안건 6)**: 사용자가 지도를 끌거나 방향키로 옮긴 뒤에만 지도 위 가운데에 테두리 알약 버튼으로 나타납니다(코드가 옮긴 것은 제외). 누르면 **지도 가운데를 새 기준점**으로 검색하고 도보 분을 다시 계산합니다. 회사 핀과 원은 남기고 새 원은 점선 없이 옅게 그립니다. 지도 가운데 좌표는 검색에만 쓰고 저장하지 않습니다.
- **데스크톱 (MAP-06)**: 좌 460 칸(시트 내용이 리스트가 됨: 개수, 칩, 목록 또는 요약과 상세) + 우 지도, 하단 탭은 좌 칸 아래. 홈 D1, 온보딩 B와 같은 틀입니다.
- **상태 (안건 7)**: 로딩은 지도 자리와 목록 스켈레톤. 빈 상태는 원 안 0곳 안내 + "15분까지 넓히기" primary(칩은 숨겨 버튼이 보이게). **지도 SDK 로딩 실패는 목록 보기로 자동 전환**: 맨 위 실패 안내 + "지도 다시 불러오기" + 같은 목록, 식당을 고르면 목록 안에서 요약이 펼쳐집니다(T5.32). 카카오까지 실패하면 T5.24 오류 화면. 오프라인은 지도 자리 안내 한 줄 + 시트 오프라인 블록.
- **모션 (CSS, Motion 없음)**: 시트 높이 slow 300 `enter`, 지도 맞춤과 고른 식당으로 이동 slow 300 `standard`, 마커 고름과 이름 펼침(최대 폭 전환) fast 180. 축소 모드면 모두 즉시.
- **접근성**: 마커는 버튼(이름, 카테고리, 도보 분을 읽음, `aria-pressed`). 지도는 방향키로 이동하고, 같은 식당을 시트 목록에서도 고를 수 있습니다(지도 조작의 대체 수단). 식당을 고르면 요약 제목으로 초점을 옮깁니다. 터치 영역 44 이상.

- **구현 중 확정(2026-10-31)**
  - **현위치 버튼은 오른쪽 위**(기준 위치 칩과 같은 줄, 원 44)입니다. 오른쪽 아래는 반쯤 열린 시트에 가려서 옮겼습니다. 위 "틀" 항목의 "오른쪽 아래"를 대신합니다.
  - **클러스터 기준은 알약 52x36px 상자**입니다. 두 알약 좌표가 가로 52px, 세로 36px 안이면 겹친 것으로 보고 묶습니다(`src/features/map/cluster.ts`). 위 "클러스터" 항목의 "약 40px"을 대신합니다.
  - **기피 음식과 다시 안 갈 곳은 지도에서도 숨깁니다.** 추천 하드 필터와 같은 판정(`src/lib/reco/filter.ts` `personalFilterReason`)이고, 지도는 탐색이라 폐업 제보와 예산 초과는 숨기지 않습니다. 숨긴 수는 시트 머리 개수 줄 오른쪽(가까운 순 앞)에 caption `muted-foreground` "N곳 숨김"으로 보이고, 로그인했으면 밑줄 글자 링크(터치 44)로 나 탭 설정(기피 음식으로 숨긴 것이 있으면 `/me/avoid`, 아니면 `/me`)에 갑니다. 비로그인 둘러보기는 쿼리로 받은 기피 칩(T4.20)만 적용하고 글자만 보입니다.
  - **다크 모드 지도**: 네이버 지도 v3에는 다크 스타일이 없어 **타일 이미지에만 밝기 85% 필터**를 겁니다(`globals.css` `.lm-map-tiles`). 마커(알약), 원, 시트, 칩, 네이버 로고와 저작권 표기는 필터 밖입니다. 타일이 오기 전 네이버 기본 밝은 배경은 다크에서 `muted`로 덮습니다. 시스템 설정과 앱 화면 설정(다크, 라이트 고정)을 모두 따르고, 지도 탭, 홈 데스크톱 지도, 온보딩 지도에 함께 씁니다.

### 식당 상세 (T5.3 C + A 점 분포 + B 이유 한 줄 확정, D-10)
확인 화면 `/design-lab/place/c`, 코드 `src/features/design-lab/place/`. 카카오 값(이름, 주소, 전화, 카테고리, 도보 분)은 세션 메모리 값이고 가격, 👍, 태그, 공개 후기는 `place_id`로 묶인 우리 집계라 둘을 나눠 그립니다.

- **컨테이너 (안건 1, 2)**: 지도 탭에서는 D-09 지도 시트 안에서 **반쯤(절반) 높이로 먼저 열고** 끝까지 올리면 본문 전체를 봅니다. 홈 카드 "상세"는 **홈 위 바텀시트(모달, Base UI Drawer)를 처음부터 끝까지 연 높이**로 띄웁니다. Drawer는 "상세"를 누른 뒤 지연 로딩해 홈 첫 로드에 넣지 않습니다. 닫으면 홈으로 그대로 돌아옵니다. 데스크톱은 좌 칸 상세(접힘 행을 펼친 상태) + 우 지도(핀 강조).
- **요약 (절반 높이에 보이는 것)**: 카테고리 caption → 식당명 title 세리프 → 숫자 3칸(도보, 가격, 👍) → 예산 판정 한 줄("예산 안" 또는 "예산 넘음", 아이콘 + 글자, 색에만 기대지 않음) → 웨이팅 배지(있을 때). 요약 바로 아래 **"왜 이 집인지" 한 줄**(B에서 가져옴, REC-07 펼침과 같은 문장, body-sm 15 `muted-foreground`)과 **내 방문 기록 한 줄**("10월 24일에 다녀왔고 👍를 남겼습니다.", 있을 때만, 안건 10).
- **근거 접힘 행**: 요약 아래 헤어라인으로 나눈 행(제목 + 한 줄 요약, `aria-expanded`/`aria-controls`, 접힌 내용 `inert`). 만족도 행만 기본 펼침. 제목은 짧게(예 "태그").
  - **가격 행 (안건 5)**: 요약 "1인 9천 원대"(추정이면 라벨 옆 `EstimateMark`). 펼치면 5천~2만 원 눈금 위에 **제보 하나하나를 점으로 찍은 분포**(A에서 가져옴, 제보 2건 이상일 때) + 범위 띠 + 가운데 값 점 + **내 점심 예산 선**. 범위는 제보 5건 이상이면 사분위(가운데 절반), 미만이면 최소~최대. 같은 값의 점이 쌓여도 가운데 값 눈금과 겹치지 않게 눈금은 점 뒤 옅은 선으로. 범위 조각 "8,000원~11,000원"은 `whitespace-nowrap`.
  - **만족도 행 (안건 3, 4)**: **10칸 미터**(한 칸 10%) + 큰 numeric 87% + 👍 👎 개수. 후기 3건 미만이면 비율 대신 점선 칸과 "후기 모으는 중".
  - **태그와 후기**: 태그 칩(횟수), 공개 후기는 닉네임과 방문 월만, 본문 2줄 말줄임. 후기 신고 진입점은 6단계 후기 시안에서 정합니다(안건 11).
  - **"지금" 행 (안건 9, PLACE-07)**: 접힌 행 안에 웨이팅 한 탭 제보 3버튼(바로 입장, 조금 기다려요, 줄 길어요).
  - **할인 (안건 12)**: 할인 블록에는 고지 두 줄 "사용자가 제보한 정보라 실제와 다를 수 있습니다." + "할인 정보는 추천 순서에 쓰지 않습니다."(copy-guide 4.12).
- **하단 고정 행동 줄**: **길찾기**(primary, 남은 폭 전체, 화면의 유일한 올리브 면 버튼) + **즐겨찾기**(아이콘 버튼 48, `aria-pressed`) + **더 보기**(아이콘 버튼 48, 이름 "다른 행동 더 보기"). 더 보기 메뉴에 전화, 공유(카카오맵 `place_url` + 앱 이름, Web Share), 네이버 플레이스에서 보기, 투표에 추가(`pollEntry` 플래그), 제보 3종. 메뉴는 메뉴 패턴(화살표 키, 밖 누르면 닫힘, 닫히면 버튼으로 포커스 복귀)으로 구현합니다. 영업시간, 메뉴, 사진은 "네이버 플레이스에서 볼 수 있습니다." 한 줄로 대신합니다.
- **상태**: **이름 해석 실패**(안건 8): 제목 자리 "이름을 불러오지 못했습니다", 도보 "알 수 없음", 주 버튼은 길찾기 대신 **"카카오맵에서 보기"**, 전화와 네이버 링크는 빼고 집계와 후기는 그대로. 로딩은 같은 자리 스켈레톤. 빈 상태(후기와 가격 제보 0건)는 행마다 한 줄 상태 문장 + 후기 자리 "후기 쓰기"(테두리). 오류(카카오 실패, 재시도 1회 뒤)는 "다시 시도" + "네이버 지도에서 보기". 오프라인은 세션에 남은 정보를 보이고 위에 안내 한 줄, 즐겨찾기와 제보는 `aria-disabled`.
- **모션 (CSS)**: 시트 높이 slow 300(지도 시트 규칙), 접힘 행 높이 base 260(grid-rows), 메뉴 페이드 fast 180, 미터 칸 채움. 축소 모드는 모두 즉시. 숫자 롤링(NumberFlow)은 쓰지 않습니다.

## 6. 카테고리 일러스트 시스템

- **화풍**: 가는 선화. viewBox 96, 선 1.4(카드의 96px 표시에서 1.4px), round cap/join. 면은 음식 한 군데에만 선 색 16% 톤(짜장, 김치, 국물, 패티, 생선 살, 맥주처럼 그 음식의 "속")을 깔고 나머지는 채우지 않습니다. 모든 그림의 같은 자리(중심 40,42, 반지름 25)에 옅은 원 하나(`cat-<slug>-surface`)를 깔아 "물가의 돌"처럼 둡니다. 이 원이 12종을 한 가족으로 묶는 서명입니다. 선은 `cat-<slug>-ink` 단색, 강조 색(`accent`)은 없습니다.
- **배치**: 카드 오른쪽 위 모서리, 카드 폭의 28%(96px). 예외는 홈 "오늘의 한 곳" 큰 카드 하나로 152px(약 44%)입니다(D-05 안건 6). 화면에 큰 카드가 한 장뿐이라 그림이 커도 이름과 이유의 위계가 무너지지 않습니다. 대안 카드(28), 결과 카드(72), 랜딩 데모 카드(56)와 다른 화면 카드는 30% 이하를 지킵니다. 정보가 주인공이고 일러스트는 그 옆에서 카테고리를 한눈에 알려 줍니다. PRD 8.3의 "시각적 주인공"은 크기가 아니라 카드에서 유일한 그림이라는 점으로 맡습니다.
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
  - 그냥 골라줘: 화면 카드 위 R1 하이라이트 순회(fast 테두리 전환, 간격 60→260ms, 2초 예산), 결과 패널 slow 페이드. 5장 "그냥 골라줘".
  - 어제 피드백 띠: 답한 뒤 높이가 base 260ms `standard`로 한 줄로 줄어듭니다(누른 뒤에만).
  - 랜딩 다시 뽑기: Motion 없이 CSS 셔플(위와 같은 순서와 길이). 5장 "랜딩".
  - 확정 축하: canvas-confetti를 쓰지 않고 display 세리프 한 줄이 slow로 페이드인하고, 1위 바가 올리브로 차오르는 것으로 대신합니다(시안 B의 고요함 유지, 번들 0).
- 홈 첫 화면에서 동시에 움직이는 것은 카드 페이드 하나뿐입니다.
- 홈 첫 화면 카드 등장은 CSS 전환(같은 duration, easing 토큰)으로 하고, Motion은 스와이프와 다시 뽑기처럼 상호작용 뒤에만 비동기로 불러옵니다. 홈 첫 로드 JS 예산 200KB를 지키기 위해서입니다 (design-decisions D-04).
- **reduced motion**: 모든 전환을 즉시 상태 변화로 바꾸고, 스켈레톤 쉬머도 멈춥니다.
- 동적 컴포넌트: Motion(`LazyMotion` + `domAnimation`), Base UI Drawer, NumberFlow, Sonner. canvas-confetti와 Embla는 쓰지 않습니다.

## 8. 문구 톤

tasks.md 2.2절(습니다체:해요체 약 7:3, Em dash와 중간점 금지)을 따릅니다. 시안 B는 짧고 낮은 목소리로, 느낌표를 거의 쓰지 않습니다.

- 추천 이유(명사형): `도보 약 4분, 지난주 👍한 국밥`. 카드에서는 도보 칸이 따로 있어 앞의 도보 분을 빼고 `지난주 👍한 국밥`으로 보입니다(G3 D-05 안건 6).
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
- 그림 위에 색면 카드를 따로 깔거나 일러스트를 카드 폭 30%보다 크게 키우지 않습니다(홈 "오늘의 한 곳" 큰 카드 152px만 예외).
- 배지에 의미 색을 늘리지 않습니다. 주황(`warning`)은 기피 경고에만 씁니다.
- 오버슈트 있는 스프링, 튀는 확대, 색종이 효과를 쓰지 않습니다.
- 카테고리 색으로 면을 넓게 칠하지 않습니다(카드 면은 항상 `card`).
- 원 두 개와 점을 나란히 두는 그림(얼굴로 읽힘)을 만들지 않습니다.
