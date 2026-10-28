# DESIGN.md 형식 정의서 (T1.3)

작성일: 2026-10-28 / 스키마 버전 `schema: 1`

이 문서는 시안 파일(`docs/design/candidates/{a,b,c}.DESIGN.md`)과 확정본(루트 `DESIGN.md`)이 따라야 하는 형식을 정합니다.

- **기계 검증 정본**: `src/lib/design/schema.ts` (zod v4). 이 문서와 스키마가 다르면 스키마가 맞고, 이 문서를 고칩니다.
- **빈 템플릿**: `docs/design/candidates/_template.DESIGN.md`. 현재 `src/styles/tokens.css` 값이 기본값으로 들어 있어 그대로 파싱됩니다.
- **소비자**: `scripts/build-tokens.ts`(T1.9, CSS 변수 생성), 대비 검사(T1.15), 모션 프리셋 `src/lib/motion`(T2.11), 디자인 랩 스위처(T1.14).

## 1. 파일 구조

```
---
<YAML 프런트매터: 토큰>
---
<마크다운 본문: 규칙과 근거>
```

- 파일은 첫 줄 `---`로 시작합니다. 프런트매터는 YAML 1.2, 중복 키는 오류입니다.
- 프런트매터는 **정확히 정의된 키만** 받습니다. 키가 빠지거나 남으면(오타 포함) 검증에 실패합니다.
- 본문에는 4절의 2단계 제목 9개가 그대로 있어야 합니다(`missingBodySections`로 검사).
- 시안 작성 순서: 템플릿을 `a.DESIGN.md`처럼 복사, `meta`부터 값만 바꿈, `pnpm vitest run src/lib/design`(T1.9 이후에는 `pnpm tokens`)으로 검증.

## 2. 프런트매터 스키마

### 2.1 최상위 키

| 키 | 타입 | 필수 | 설명 |
| --- | --- | --- | --- |
| `schema` | `1` (리터럴) | 필수 | 형식 버전. 형식이 바뀌면 올리고 이 문서 6절에 기록 |
| `meta` | 객체 | 필수 | 식별, 컨셉, 무드 |
| `color` | `{ light, dark }` | 필수 | 색 토큰 두 벌 |
| `contrastPairs` | 배열 | 필수 | 대비 검사 대상 쌍 |
| `font` | 객체 | 필수 | 서체 스택, 숫자 설정 |
| `type` | 객체 | 필수 | 타입 스케일 9단계 |
| `space` | 객체 | 필수 | 간격 |
| `radius` | 객체 | 필수 | 라운드 기준, 배수, 컴포넌트 매핑 |
| `shadow` | `{ light, dark }` | 필수 | 그림자 4단계 두 벌 |
| `border` | 객체 | 필수 | 테두리 두께 |
| `motion` | 객체 | 필수 | duration, easing, spring, stagger |
| `illustration` | 객체 | 필수 | 카테고리 일러스트 화풍과 팔레트 |
| `layout` | 객체 | 필수 | 폭, 여백, 데스크톱 2단, 하단 액션 영역 |

모든 하위 키도 필수입니다(선택 키는 표에 "선택"으로 표시). 숫자는 단위 없이 쓰고, 단위는 아래 표에 고정되어 있습니다. 생성기가 단위를 붙입니다.

### 2.2 `meta`

| 키 | 타입 | 예시 | 규칙 |
| --- | --- | --- | --- |
| `id` | kebab-case 문자열 | `a` | `data-design` 속성 값. 시안은 `a`, `b`, `c`, 확정본은 `final`, 템플릿은 `template` |
| `name` | 문자열 1~40자 | `Terracotta Table` | |
| `concept` | 문자열 1~80자 | `크림 바탕에 테라코타 한 색, 손맛 있는 그림이 먼저 보이는 식탁` | 본문 1절과 같은 문장 |
| `mood` | 문자열 정확히 3개 | `[따뜻한, 손맛, 활기]` | |
| `version` | `x.y.z` | `0.1.0` | 값을 바꾸면 올림 |
| `status` | `template` \| `candidate` \| `final` | `candidate` | |
| `basedOn` | 문자열 배열 | `[]`, `[a, c]` | 확정본이 어느 시안(조합)에서 왔는지. 시안은 빈 배열 |

### 2.3 `color`

`color.light`와 `color.dark`는 같은 구조이며 세 묶음을 가집니다. **색 표기는 모두 `oklch(L C H)` 또는 `oklch(L C H / A%)`** 입니다(L 0~1 소수, C 0~0.4, H 0~360, A는 `12%` 또는 `0.12`). hex, rgb, hsl, 퍼센트 L은 실패합니다.

**`shadcn`** (31개, shadcn base-vega 변수 전부, 현재 `tokens.css`와 같은 목록)

`background`, `foreground`, `card`, `card-foreground`, `popover`, `popover-foreground`, `primary`, `primary-foreground`, `secondary`, `secondary-foreground`, `muted`, `muted-foreground`, `accent`, `accent-foreground`, `destructive`, `border`, `input`, `ring`, `chart-1`~`chart-5`, `sidebar`, `sidebar-foreground`, `sidebar-primary`, `sidebar-primary-foreground`, `sidebar-accent`, `sidebar-accent-foreground`, `sidebar-border`, `sidebar-ring`

- 포인트 컬러는 `primary` 하나입니다. `chart-*`, `ring`, `sidebar-primary`는 같은 색상환 안의 명도 변주로만 둡니다.

**`app`** (15개, 앱 전용 의미 색)

| 키 | 쓰임 |
| --- | --- |
| `success`, `success-surface`, `success-foreground` | 확정, 완료. 실색(아이콘, 점) / 옅은 바탕 / 바탕 위 글자 |
| `warning`, `warning-surface`, `warning-foreground` | 웨이팅, 기피 경고, 추정 배지 |
| `info`, `info-surface`, `info-foreground` | 할인, 제보 같은 중립 안내 |
| `vote-bar`, `vote-bar-track`, `vote-bar-foreground` | 득표 바 채움 / 트랙 / 바 안 숫자 |
| `skeleton`, `skeleton-highlight` | 스켈레톤 바탕과 쉬머 하이라이트 |
| `overlay` | 바텀시트 뒤 딤 (알파 필수 아님, 보통 40~60%) |

오류는 shadcn `destructive`를 그대로 씁니다.

**`category`** (12개, 각각 `{ surface, ink }`)

| slug | 이름 | slug | 이름 |
| --- | --- | --- | --- |
| `hansik` | 한식 | `gukbap` | 국밥/탕 |
| `jungsik` | 중식 | `gogi` | 고기 |
| `ilsik` | 일식 | `asian` | 아시안 |
| `yangsik` | 양식 | `fastfood` | 패스트푸드 |
| `bunsik` | 분식 | `salad` | 샐러드/건강식 |
| `cafe` | 카페/베이커리 | `pub` | 술집 |

- `surface`: 카드 일러스트 영역 색면. `ink`: 색면 위 일러스트 선과 카테고리 라벨 글자.
- slug는 코드 전체(일러스트 파일명 `cat-<slug>.svg`, 카카오 카테고리 매핑, 목업 데이터)에서 같은 값을 씁니다. 목록은 `CATEGORY_LABELS`가 정본입니다.
- 12색이 무지개가 되지 않게 채도(C)는 낮게(라이트 0.03~0.06 권장), 색상(H)만 나눕니다.

### 2.4 `contrastPairs` (결정: 프런트매터에 명시)

대비 검사 대상은 **프런트매터에 명시적 쌍 목록 + 최소 대비 값**으로 둡니다. 스크립트 규칙(이름 패턴 추론)으로 두지 않은 이유는, 시안마다 실제로 겹쳐 쓰는 조합이 다르고(예: B는 `muted` 위 글자를 많이 씀) 문서만 보고 어떤 조합을 보장하는지 알 수 있어야 하기 때문입니다. 다만 빠뜨림을 막기 위해 **필수 쌍은 스키마가 강제**합니다.

| 키 | 타입 | 필수 | 설명 |
| --- | --- | --- | --- |
| `fg` | 색 참조 | 필수 | 생성 CSS 변수 이름에서 `--`를 뺀 것. 예: `muted-foreground`, `cat-hansik-ink` |
| `bg` | 색 참조 | 필수 | 같음 |
| `min` | `3` \| `4.5` \| `7` | 필수 | WCAG 2.x 대비. 본문 글자 4.5, 큰 글자(24px 이상 또는 19px 굵게)와 UI 경계, 아이콘 3 |
| `theme` | `both` \| `light` \| `dark` | 선택 | 생략하면 `both` |
| `note` | 문자열 | 선택 | 어디에 쓰는 조합인지 |

- **필수 쌍**: `REQUIRED_CONTRAST_PAIRS` 24쌍(본문, 카드, 팝오버, primary, secondary, muted 3종, accent, destructive 2종, primary/ring 경계, sidebar 3종, 의미 색 6종, 득표 바 2종) + 카테고리 `cat-<slug>-ink` on `cat-<slug>-surface` 12쌍(4.5). 필수 쌍은 빼거나, `min`을 낮추거나, 한 테마로 좁힐 수 없습니다.
- 알파가 있는 색(`border`, `overlay` 등)은 대비 쌍에 넣지 않습니다. 검사기(T1.15)는 알파 1 색만 계산하고, 넣으면 실패로 봅니다.
- 계산은 oklch를 sRGB로 바꾼 뒤 WCAG 상대 휘도 공식으로 합니다(T1.15).

### 2.5 `font`

| 키 | 타입 | 예시 | 규칙 |
| --- | --- | --- | --- |
| `sans.family` | 문자열 | `Pretendard Variable` | 본문 서체 |
| `sans.fallback` | 문자열 배열(1개 이상) | `[Pretendard, -apple-system, ...]` | |
| `heading.family`, `heading.fallback` | 같음 | | 제목 서체 |
| `heading.kind` | `sans` \| `serif` | `sans` | `serif`는 `meta.id`가 `b`이거나 `basedOn`에 `b`가 있을 때만 통과 |
| `numeric.use` | `sans` \| `heading` | `sans` | 숫자용 별도 서체는 두지 않습니다 |
| `numeric.tabular` | `true` (리터럴) | `true` | 숫자는 항상 `tabular-nums` |
| `numeric.slashedZero` | 불리언 | `false` | |

### 2.6 `type` (타입 스케일)

단계 9개가 모두 필요합니다: `display`, `title`, `heading`, `body`, `body-sm`, `label`, `caption`, `numeric-lg`, `numeric-md`.

| 하위 키 | 단위 | 범위 | 예시 |
| --- | --- | --- | --- |
| `size` | rem | 0.625~4 | `1.5` |
| `lineHeight` | 배수(단위 없음) | 1~2 | `1.3` |
| `weight` | 정수 | 100~900 | `700` |
| `tracking` | em | -0.08~0.2 | `-0.015` |
| `font` | `sans` \| `heading` \| `numeric` | | `heading` |

- 쓰임 기준: `display` 랜딩 큰 제목, `title` 화면 제목, `heading` 카드 식당명과 섹션 제목, `body` 본문, `body-sm` 이유 한 줄, `label` 버튼과 칩, `caption` 메타와 배지, `numeric-lg` 카드 주인공 숫자(도보 분, 가격, 👍%), `numeric-md` 득표 수와 카운트다운.

### 2.7 `space`, `radius`, `shadow`, `border`

| 키 | 타입/단위 | 예시 | 설명 |
| --- | --- | --- | --- |
| `space.base` | rem | `0.25` | Tailwind `--spacing`. 바꾸면 모든 `p-4` 류가 따라 바뀌므로 0.25 유지 권장 |
| `space.scale.{2xs,xs,sm,md,lg,xl,2xl,3xl}` | rem | `md: 1` | 의미 간격. 카드 안쪽, 섹션 사이 등은 본문 4절에서 단계를 지정 |
| `radius.base` | rem | `0.875` | shadcn `--radius` (= `lg`) |
| `radius.scale.{sm,md,lg,xl,2xl,3xl,4xl}` | 배수 | `xl: 1.4` | `--radius`에 곱함. 기본값은 현재 `globals.css`와 같음 |
| `radius.components.{card,button,chip,badge,input,sheet,tab-bar}` | 단계 이름 \| `full` \| `none` | `card: xl` | 컴포넌트별 라운드 |
| `shadow.{light,dark}.{sm,md,lg,sheet}` | box-shadow 문자열 \| `none` | `"0 2px 8px oklch(0.24 0.012 60 / 8%)"` | 색은 oklch만. hex, rgba, hsl 금지 |
| `border.{hairline,default,strong}` | px | `default: 1` | 0.5~3 |

### 2.8 `motion`

| 키 | 타입/단위 | 예시 | 규칙 |
| --- | --- | --- | --- |
| `duration.{fast,base,slow}` | 정수 ms | `fast: 150` | 80~600, `fast < base < slow`. CLAUDE.md 6.2 권장 범위 150~300 |
| `easing.{standard,enter,exit,emphasized}` | `[x1, y1, x2, y2]` | `[0.2, 0, 0, 1]` | cubic-bezier. x는 0~1 |
| `spring.{swipe,sheet,shuffle,press,bar}` | `{ stiffness, damping, mass }` | `{ stiffness: 300, damping: 30, mass: 1 }` | Motion `type: "spring"` 값 그대로. stiffness 50~1000, damping 5~100, mass 0.1~5 |
| `stagger` | 정수 ms | `40` | 0~120, 목록 등장 간격 |
| `reducedMotion` | `instant` (리터럴) | `instant` | `prefers-reduced-motion`에서 즉시 상태 변화 |

- spring 쓰임: `swipe` 카드 스와이프와 되돌림, `sheet` 바텀시트 스냅, `shuffle` 다시 뽑기, `press` 눌림 피드백, `bar` 득표 바 길이.

### 2.9 `illustration`

| 키 | 타입/단위 | 예시 | 규칙 |
| --- | --- | --- | --- |
| `style` | `painted` \| `line` \| `flat` | `painted` | A 채색, B 선화, C 플랫 |
| `strokeWidth` | px (viewBox 96 기준) | `1.5` | 0~6. painted는 0 가능 |
| `cardAreaRatio` | 비율 | `0.45` | 카드 높이 중 일러스트 영역. 0~0.7 |
| `placement` | `top` \| `side` \| `corner` | `top` | 카드 안 위치 |
| `palette.surface` | 색 참조 | `cat-{slug}-surface` | `{slug}` 자리표시자 허용. 12종 모두로 풀려야 통과 |
| `palette.ink` | 색 참조 | `cat-{slug}-ink` | 같음 |
| `palette.accent` | 색 참조 \| `null` | `primary` | 강조 한 점. 없으면 `null` |

### 2.10 `layout`

| 키 | 단위 | 예시 | 규칙 |
| --- | --- | --- | --- |
| `maxWidth` | px | `480` | 모바일 콘텐츠 최대 폭, 360~640 |
| `minWidth` | px | `360` | 360 고정 |
| `gutter` | px | `16` | 좌우 여백, 12~32 |
| `desktop.breakpoint` | px | `1024` | 이 폭부터 좌 리스트 + 우 지도 2단 |
| `desktop.columns` | `[리스트, 지도]` fr | `[2, 3]` | |
| `desktop.listMaxWidth` | px | `440` | |
| `bottomActionZone.ratio` | 비율 | `0.333` | 주요 액션을 두는 하단 영역, 0.25~0.4 |
| `bottomActionZone.minTouch` | px | `44` | 44 이상 |
| `tabBarHeight` | px | `64` | 안전 영역 제외, 48~88 |

## 3. 생성 CSS 변수 명명 규칙

### 3.1 이름

| 출처 | 생성 변수 | 예시 |
| --- | --- | --- |
| `color.*.shadcn.<key>` | `--<key>` | `--muted-foreground` |
| `color.*.app.<key>` | `--<key>` | `--vote-bar-track` |
| `color.*.category.<slug>.<surface\|ink>` | `--cat-<slug>-<surface\|ink>` | `--cat-hansik-surface` |
| `font.sans`, `font.heading` | `--lm-font-sans`, `--lm-font-heading` | 값은 family + fallback 스택 |
| `font.numeric` | `--lm-font-numeric`, `--lm-numeric-features` | `"tnum" 1` (+ `"zero" 1`) |
| `type.<step>.<prop>` | `--lm-type-<step>-<size\|line-height\|weight\|tracking>` | `--lm-type-title-size: 1.5rem` |
| `type.<step>.font` | `--lm-type-<step>-font` | `var(--lm-font-heading)` (T1.9에서 추가) |
| `space.base` | `--lm-space-base` | `0.25rem` |
| `space.scale.<step>` | `--lm-space-<step>` | `--lm-space-md: 1rem` |
| `radius.base` | `--radius` | shadcn 표준 이름 유지 |
| `radius.scale.<step>` | `--lm-radius-<step>` | `calc(var(--radius) * 1.4)` |
| `radius.components.<c>` | `--lm-radius-<c>` | `--lm-radius-card: var(--lm-radius-xl)`, `full`은 `9999px`, `none`은 `0` |
| `shadow.*.<step>` | `--lm-shadow-<step>` | 테마별 블록에 들어감 |
| `border.<step>` | `--lm-border-<step>` | `1px` |
| `motion.duration.<step>` | `--lm-duration-<step>` | `220ms` |
| `motion.easing.<step>` | `--lm-ease-<step>` | `cubic-bezier(0.2, 0, 0, 1)` |
| `motion.spring.<preset>.<prop>` | `--lm-spring-<preset>-<stiffness\|damping\|mass>` | 단위 없음. JS는 CSS 대신 파싱한 객체를 직접 씀(T2.11) |
| `motion.stagger` | `--lm-stagger` | `40ms` |
| `illustration.strokeWidth` | `--lm-illust-stroke` | `1.5px` |
| `illustration.cardAreaRatio` | `--lm-illust-area` | 단위 없음 |
| `layout.<key>` (중첩은 하이픈으로) | `--lm-layout-<key>` | `--lm-layout-gutter: 16px`, `--lm-layout-bottom-action-zone-ratio: 0.333` |

- 원칙: **색은 접두사 없음**(shadcn 컴포넌트와 Tailwind 색 유틸리티가 그대로 읽게), **카테고리 색은 `cat-`**, **색이 아닌 토큰은 모두 `--lm-`** 접두사. camelCase 키는 kebab-case로 바꿉니다.
- 같은 이름이 두 번 생기면 생성기는 실패합니다.

### 3.2 선택자

| 파일 | 라이트 | 다크 |
| --- | --- | --- |
| 시안(`a`, `b`, `c`) | `[data-design="a"]`, 강제 `[data-design="a"][data-theme="light"]` | `:where(.dark) [data-design="a"]`, `[data-design="a"]:where(.dark)`, 강제 `[data-design="a"][data-theme="dark"]`, 그리고 `@media (prefers-color-scheme: dark)` 안의 `:where(:root:not(.light):not(.dark)) [data-design="a"]` |
| 확정본 | `:root` | `.dark`, `@media (prefers-color-scheme: dark) { :root:not(.light):not(.dark) }` (현재 `tokens.css`와 같은 구조) |

- 테마와 무관한 토큰(type, space, radius, border, motion, illustration, layout)은 라이트 블록에만 한 번 씁니다. 다크 블록에는 `color`와 `shadow`만 들어갑니다.
- 시안 생성 파일은 `src/styles/design-candidates.css`, 확정본은 `src/styles/tokens.css`입니다. 둘 다 `pnpm tokens` 생성물이라 직접 고치지 않습니다(`--check`로 어긋남 검사, `--only a`로 한 시안만 검증).
- 시안 명시도: 전역 다크 선택자는 `:where()`로 감싸 `[data-design]`과 같은 (0,1,0)이고 뒤에 있어 라이트를 이깁니다. `data-theme` 강제는 (0,2,0)이라 전역 `.dark`, 시스템 다크와 무관하게 이깁니다. 디자인 랩 스위처(T1.14)는 같은 요소에 `data-design`과 `data-theme`을 함께 붙입니다. 단, 지금 Tailwind `dark:` 변형은 `data-theme`을 모르므로 시안 화면은 `dark:` 대신 토큰 변수로 테마 차이를 냅니다(`dark` 변형에 `[data-theme="dark"]`를 더할지는 T1.19에서 정함).

### 3.3 Tailwind `@theme inline` 연결 (T1.19에서 `globals.css`에 반영)

| 생성 변수 | `@theme inline` 항목 | 쓰는 법 |
| --- | --- | --- |
| `--<color>`, `--cat-*` | `--color-<같은 이름>: var(--<같은 이름>)` | `bg-vote-bar-track`, `text-cat-hansik-ink` |
| `--lm-font-*` | `--font-sans`, `--font-heading`, `--font-numeric` | `font-heading` |
| `--lm-type-<step>-*` | `--text-<step>: var(--lm-type-<step>-size)`, `--text-<step>--line-height`, `--text-<step>--font-weight`, `--text-<step>--letter-spacing` | `text-title`, `text-numeric-lg tabular-nums` |
| `--lm-space-base` | `--spacing: var(--lm-space-base)` | `p-4` |
| `--lm-radius-<step>` | `--radius-<step>: var(--lm-radius-<step>)` | `rounded-xl` |
| `--lm-radius-<c>` | `--radius-<c>: var(--lm-radius-<c>)` | `rounded-card`, `rounded-chip` |
| `--lm-shadow-<step>` | `--shadow-<step>: var(--lm-shadow-<step>)` | `shadow-md`, `shadow-sheet` |
| `--lm-ease-<step>` | `--ease-<step>: var(--lm-ease-<step>)` | `ease-standard` |
| `--lm-duration-*`, `--lm-border-*`, `--lm-layout-*` | 연결하지 않음 | `duration-(--lm-duration-base)`, `border-(length:--lm-border-hairline)`, `max-w-(--lm-layout-max-width)` |

- 시안 전환(`data-design`)이 동작하려면 `@theme inline`은 값 대신 `var(...)`만 가리켜야 합니다. 값을 `@theme`에 직접 쓰지 않습니다.

## 4. 본문 섹션 템플릿

본문에는 아래 2단계 제목이 **글자 그대로** 있어야 합니다. 제목 아래 3단계 제목은 자유입니다. 본문은 습니다체로 쓰고, 화면 문구 예문에는 tasks.md 2.2절 금지 문자(Em dash, 중간점)를 쓰지 않습니다.

| 제목 | 써야 하는 것 |
| --- | --- |
| `## 1. 컨셉` | 컨셉 한 줄과 무드 키워드 3개(`meta`와 같은 값). 주 레퍼런스에서 무엇을 가져왔는지 1~2문장 |
| `## 2. 색 사용 규칙` | 포인트 컬러를 쓰는 곳과 쓰지 않는 곳(한 화면 포인트 버튼 1개), 의미 색의 용도, `contrastPairs` 실측 대비 수치 표(라이트/다크) |
| `## 3. 타이포` | 서체와 선택 이유, 스케일 단계별 쓰임, 숫자 표현(`tabular-nums`, 숫자와 단위 크기 차이) |
| `## 4. 레이아웃` | 그리드와 여백 단계, 하단 1/3 액션 영역에 두는 요소, 데스크톱 2단 비율, 360px 대응 |
| `## 5. 컴포넌트 규칙` | 추천 카드, 버튼, 칩, 바텀시트, 하단 탭, 득표 바, 배지 각각 1~3줄: 쓰는 토큰과 상태(기본, 눌림, 비활성, 포커스) |
| `## 6. 카테고리 일러스트 시스템` | 화풍, 12종 주 모티프(음식과 그릇, 마스코트 금지), 색면과 선 규칙, 다크 대응, 사진 없는 카드에서 차지하는 비율(PRD 8.3) |
| `## 7. 모션` | 모션 성격 한 줄, 프리셋별 사용 지점(스와이프, 셔플, 시트, 득표 바, 확정 축하), 쓰는 동적 컴포넌트(tasks.md 2.4절), reduced motion 대체 |
| `## 8. 문구 톤` | tasks.md 2.2절을 따른다는 선언과 시안 분위기에 맞는 예문 3개(추천 이유, 빈 상태, 확정 축하) |
| `## 9. Do / Don't` | 꼭 지킬 것 3~5개, 하면 안 되는 것 3~5개 (CLAUDE.md 6.3 금지 목록과 겹치지 않는 시안 고유 항목 위주) |

## 5. 검증

```bash
pnpm vitest run src/lib/design     # 템플릿이 스키마를 통과하는지, 거부 규칙이 동작하는지
```

- 코드에서 읽을 때는 `parseDesignDoc(source)`를 씁니다. 프런트매터 검증 실패와 본문 섹션 누락을 모두 사람이 읽을 수 있는 메시지로 던집니다.
- 대비 수치 계산(T1.15)과 CSS 생성(T1.9)은 이 스키마를 통과한 객체만 입력으로 받습니다.

## 6. 변경 이력

| 날짜 | schema | 내용 |
| --- | --- | --- |
| 2026-10-28 | 1 | 최초 확정 (T1.3) |
