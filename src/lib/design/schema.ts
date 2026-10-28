/**
 * DESIGN.md 프런트매터 스키마 (T1.3).
 *
 * 형식 정의서: docs/design/candidates/FORMAT.md
 * 소비자: scripts/build-tokens.ts(T1.9), 대비 검사(T1.15), 모션 프리셋(T2.11).
 *
 * - 색은 oklch 문자열만 허용한다(하드코딩 hex/rgb 금지 규칙과 같은 이유).
 * - 단위는 키마다 고정이다(FORMAT.md 2절 표). 문자열 단위 대신 숫자로 받아 생성기가 단위를 붙인다.
 * - Node type stripping으로도 읽히도록 erasable 문법만 쓴다(enum, namespace 금지).
 */
import { parseDocument } from "yaml";
import { z } from "zod";

/* ------------------------------------------------------------------ */
/* 상수: 키 목록                                                       */
/* ------------------------------------------------------------------ */

export const SCHEMA_VERSION = 1;

/** shadcn base-vega가 쓰는 색 변수 전부 (현재 src/styles/tokens.css 기준). */
export const SHADCN_COLOR_KEYS = [
  "background",
  "foreground",
  "card",
  "card-foreground",
  "popover",
  "popover-foreground",
  "primary",
  "primary-foreground",
  "secondary",
  "secondary-foreground",
  "muted",
  "muted-foreground",
  "accent",
  "accent-foreground",
  "destructive",
  "border",
  "input",
  "ring",
  "chart-1",
  "chart-2",
  "chart-3",
  "chart-4",
  "chart-5",
  "sidebar",
  "sidebar-foreground",
  "sidebar-primary",
  "sidebar-primary-foreground",
  "sidebar-accent",
  "sidebar-accent-foreground",
  "sidebar-border",
  "sidebar-ring",
] as const;

/** 앱 전용 의미 색. */
export const APP_COLOR_KEYS = [
  "success",
  "success-surface",
  "success-foreground",
  "warning",
  "warning-surface",
  "warning-foreground",
  "info",
  "info-surface",
  "info-foreground",
  "vote-bar",
  "vote-bar-track",
  "vote-bar-foreground",
  "skeleton",
  "skeleton-highlight",
  "overlay",
] as const;

/** 카테고리 12종 slug와 한국어 이름 (PRD 8.3, tasks T2.8). src/features/place/categories.ts와 같아야 한다(테스트로 확인). Node 단독 실행 때문에 import하지 않고 복제한다. */
export const CATEGORY_LABELS = {
  hansik: "한식",
  jungsik: "중식",
  ilsik: "일식",
  yangsik: "양식",
  bunsik: "분식",
  gukbap: "국밥/탕",
  gogi: "고기",
  asian: "아시안",
  fastfood: "패스트푸드",
  salad: "샐러드/건강식",
  cafe: "카페/베이커리",
  pub: "술집",
} as const;

export type CategorySlug = keyof typeof CATEGORY_LABELS;

export const CATEGORY_SLUGS = Object.keys(CATEGORY_LABELS) as CategorySlug[];

export const TYPE_STEPS = [
  "display",
  "title",
  "heading",
  "body",
  "body-sm",
  "label",
  "caption",
  "numeric-lg",
  "numeric-md",
] as const;

export const SPACE_STEPS = [
  "2xs",
  "xs",
  "sm",
  "md",
  "lg",
  "xl",
  "2xl",
  "3xl",
] as const;

export const RADIUS_STEPS = [
  "sm",
  "md",
  "lg",
  "xl",
  "2xl",
  "3xl",
  "4xl",
] as const;

export const RADIUS_COMPONENTS = [
  "card",
  "button",
  "chip",
  "badge",
  "input",
  "sheet",
  "tab-bar",
] as const;

export const SHADOW_STEPS = ["sm", "md", "lg", "sheet"] as const;

export const BORDER_STEPS = ["hairline", "default", "strong"] as const;

export const DURATION_STEPS = ["fast", "base", "slow"] as const;

export const EASING_STEPS = [
  "standard",
  "enter",
  "exit",
  "emphasized",
] as const;

export const SPRING_PRESETS = [
  "swipe",
  "sheet",
  "shuffle",
  "press",
  "bar",
] as const;

/**
 * 반드시 대비 검사에 넣어야 하는 쌍. 시안 작성자는 이 목록에 쌍을 더할 수 있지만 뺄 수 없다.
 * 카테고리 ink/surface 12쌍은 별도로 자동 요구한다(requiredCategoryPairs).
 */
export const REQUIRED_CONTRAST_PAIRS: readonly ContrastPairInput[] = [
  { fg: "foreground", bg: "background", min: 4.5 },
  { fg: "card-foreground", bg: "card", min: 4.5 },
  { fg: "popover-foreground", bg: "popover", min: 4.5 },
  { fg: "primary-foreground", bg: "primary", min: 4.5 },
  { fg: "secondary-foreground", bg: "secondary", min: 4.5 },
  { fg: "muted-foreground", bg: "background", min: 4.5 },
  { fg: "muted-foreground", bg: "card", min: 4.5 },
  { fg: "muted-foreground", bg: "muted", min: 4.5 },
  { fg: "accent-foreground", bg: "accent", min: 4.5 },
  { fg: "destructive", bg: "background", min: 4.5 },
  { fg: "destructive", bg: "card", min: 4.5 },
  { fg: "primary", bg: "background", min: 3 },
  { fg: "ring", bg: "background", min: 3 },
  { fg: "sidebar-foreground", bg: "sidebar", min: 4.5 },
  { fg: "sidebar-primary-foreground", bg: "sidebar-primary", min: 4.5 },
  { fg: "sidebar-accent-foreground", bg: "sidebar-accent", min: 4.5 },
  { fg: "success-foreground", bg: "success-surface", min: 4.5 },
  { fg: "warning-foreground", bg: "warning-surface", min: 4.5 },
  { fg: "info-foreground", bg: "info-surface", min: 4.5 },
  { fg: "success", bg: "card", min: 3 },
  { fg: "warning", bg: "card", min: 3 },
  { fg: "info", bg: "card", min: 3 },
  { fg: "vote-bar", bg: "vote-bar-track", min: 3 },
  { fg: "vote-bar-foreground", bg: "vote-bar", min: 4.5 },
];

export function requiredCategoryPairs(): ContrastPairInput[] {
  return CATEGORY_SLUGS.map((slug) => ({
    fg: `cat-${slug}-ink`,
    bg: `cat-${slug}-surface`,
    min: 4.5,
  }));
}

/* ------------------------------------------------------------------ */
/* 기본 타입                                                           */
/* ------------------------------------------------------------------ */

/**
 * oklch(L C H) 또는 oklch(L C H / A) 형식.
 * L: 0~1 소수, C: 0~0.4, H: 0~360, A: 0~100% 또는 0~1.
 */
const OKLCH_RE =
  /^oklch\(\s*(\d*\.?\d+)\s+(\d*\.?\d+)\s+(\d*\.?\d+)\s*(?:\/\s*(\d*\.?\d+)(%?)\s*)?\)$/;

export type Oklch = { l: number; c: number; h: number; alpha: number };

export function parseOklch(value: string): Oklch | null {
  const m = OKLCH_RE.exec(value.trim());
  if (!m) return null;
  const l = Number(m[1]);
  const c = Number(m[2]);
  const h = Number(m[3]);
  let alpha = 1;
  if (m[4] !== undefined) {
    alpha = m[5] === "%" ? Number(m[4]) / 100 : Number(m[4]);
  }
  if (
    l < 0 ||
    l > 1 ||
    c < 0 ||
    c > 0.4 ||
    h < 0 ||
    h > 360 ||
    alpha < 0 ||
    alpha > 1
  ) {
    return null;
  }
  return { l, c, h, alpha };
}

export const oklchColor = z.string().refine((v) => parseOklch(v) !== null, {
  message:
    "색은 oklch(L C H) 또는 oklch(L C H / A%) 형식이어야 합니다 (L 0~1, C 0~0.4, H 0~360)",
});

const SLUG_RE = /^[a-z][a-z0-9-]*$/;
const SEMVER_RE = /^\d+\.\d+\.\d+$/;

/** 생성 CSS 변수 이름 기준의 색 참조 (예: "muted-foreground", "cat-hansik-ink"). */
const colorRef = z
  .string()
  .regex(SLUG_RE, "색 참조는 생성 변수 이름에서 -- 를 뺀 kebab-case입니다");

/** 정확히 지정한 키만 받는 객체 (빠진 키, 남는 키 모두 오류). */
function exactRecord<const K extends readonly string[], V extends z.ZodType>(
  keys: K,
  value: V,
) {
  const shape = Object.fromEntries(keys.map((k) => [k, value])) as {
    [P in K[number]]: V;
  };
  return z.strictObject(shape);
}

/* ------------------------------------------------------------------ */
/* 섹션 스키마                                                          */
/* ------------------------------------------------------------------ */

export const metaSchema = z.strictObject({
  /** data-design 속성 값. 시안은 a, b, c. 확정본은 final. */
  id: z.string().regex(SLUG_RE),
  name: z.string().min(1).max(40),
  /** 컨셉 한 줄. */
  concept: z.string().min(1).max(80),
  /** 무드 키워드 정확히 3개. */
  mood: z.tuple([z.string().min(1), z.string().min(1), z.string().min(1)]),
  version: z.string().regex(SEMVER_RE, "version은 1.0.0 형식입니다"),
  status: z.enum(["template", "candidate", "final"]),
  /** 확정본이 어느 시안(조합)에서 왔는지. 시안 파일은 빈 배열. */
  basedOn: z.array(z.string().regex(SLUG_RE)),
});

const categoryColorSchema = z.strictObject({
  /** 카드 일러스트 영역 색면. */
  surface: oklchColor,
  /** 색면 위 일러스트 선, 카테고리 라벨 글자. */
  ink: oklchColor,
});

export const colorThemeSchema = z.strictObject({
  shadcn: exactRecord(SHADCN_COLOR_KEYS, oklchColor),
  app: exactRecord(APP_COLOR_KEYS, oklchColor),
  category: exactRecord(
    CATEGORY_SLUGS as unknown as readonly CategorySlug[],
    categoryColorSchema,
  ),
});

export const colorSchema = z.strictObject({
  light: colorThemeSchema,
  dark: colorThemeSchema,
});

const contrastPairSchema = z.strictObject({
  fg: colorRef,
  bg: colorRef,
  /** WCAG 대비 최소값. 본문 4.5, 큰 글자와 UI 경계 3. */
  min: z.union([z.literal(3), z.literal(4.5), z.literal(7)]),
  /** 적용 테마. 생략하면 both. */
  theme: z.enum(["both", "light", "dark"]).optional(),
  note: z.string().optional(),
});

export type ContrastPairInput = z.input<typeof contrastPairSchema>;

const fontStackSchema = z.strictObject({
  /** 첫 번째 family 이름. */
  family: z.string().min(1),
  fallback: z.array(z.string().min(1)).min(1),
  /**
   * next/font가 노출하는 CSS 변수(예: `--font-pretendard`). 선택 (T1.19).
   * next/font는 family를 해시된 이름으로 등록하므로 family 문자열만으로는 저장소 폰트 파일을 찾지 못한다.
   * 있으면 생성기가 `var(<cssVar>, <family>), <fallback...>`을 출력한다.
   */
  cssVar: z
    .string()
    .regex(
      /^--[a-z][a-z0-9-]*$/,
      "cssVar는 --로 시작하는 소문자 CSS 변수 이름이어야 합니다 (예: --font-pretendard)",
    )
    .optional(),
});

export const fontSchema = z.strictObject({
  sans: fontStackSchema,
  heading: fontStackSchema.extend({
    /** serif는 시안 B(또는 B를 바탕으로 한 확정본)만 허용. */
    kind: z.enum(["sans", "serif"]),
  }),
  numeric: z.strictObject({
    /** 숫자에 쓸 스택. sans 또는 heading을 가리킨다(별도 서체 금지). */
    use: z.enum(["sans", "heading"]),
    tabular: z.literal(true),
    slashedZero: z.boolean(),
  }),
});

const typeStepSchema = z.strictObject({
  /** rem */
  size: z.number().min(0.625).max(4),
  /** 단위 없는 배수 */
  lineHeight: z.number().min(1).max(2),
  weight: z.number().int().min(100).max(900),
  /** em */
  tracking: z.number().min(-0.08).max(0.2),
  font: z.enum(["sans", "heading", "numeric"]),
});

export const typeSchema = exactRecord(TYPE_STEPS, typeStepSchema);

export const spaceSchema = z.strictObject({
  /** rem. Tailwind --spacing (기본 0.25). */
  base: z.number().positive().max(0.5),
  /** rem */
  scale: exactRecord(SPACE_STEPS, z.number().min(0).max(8)),
});

const radiusStepRef = z.enum([...RADIUS_STEPS, "full", "none"]);

export const radiusSchema = z.strictObject({
  /** rem. shadcn --radius (= lg). */
  base: z.number().min(0).max(2),
  /** --radius에 곱하는 배수. */
  scale: exactRecord(RADIUS_STEPS, z.number().min(0).max(4)),
  /** 컴포넌트별로 쓸 단계. */
  components: exactRecord(RADIUS_COMPONENTS, radiusStepRef),
});

/** box-shadow 문자열. 색은 oklch만 허용하고 hex/rgb/hsl 금지. */
const shadowValue = z
  .string()
  .min(1)
  .refine(
    (v) =>
      v === "none" ||
      (/oklch\(/.test(v) && !/#[0-9a-f]{3,8}\b|rgba?\(|hsla?\(/i.test(v)),
    {
      message: "그림자는 none 또는 oklch 색을 쓴 box-shadow 문자열입니다",
    },
  );

export const shadowSchema = z.strictObject({
  light: exactRecord(SHADOW_STEPS, shadowValue),
  dark: exactRecord(SHADOW_STEPS, shadowValue),
});

/** px */
export const borderSchema = exactRecord(
  BORDER_STEPS,
  z.number().min(0.5).max(3),
);

const cubicBezier = z
  .tuple([
    z.number().min(0).max(1),
    z.number(),
    z.number().min(0).max(1),
    z.number(),
  ])
  .describe("cubic-bezier(x1, y1, x2, y2)");

const springSchema = z.strictObject({
  stiffness: z.number().min(50).max(1000),
  damping: z.number().min(5).max(100),
  mass: z.number().min(0.1).max(5),
});

export const motionSchema = z
  .strictObject({
    /** ms */
    duration: exactRecord(DURATION_STEPS, z.number().int().min(80).max(600)),
    easing: exactRecord(EASING_STEPS, cubicBezier),
    spring: exactRecord(SPRING_PRESETS, springSchema),
    /** 리스트 등장 간격 ms. */
    stagger: z.number().int().min(0).max(120),
    /** prefers-reduced-motion에서의 대체. MVP는 instant(즉시 상태 변화)만 허용. */
    reducedMotion: z.literal("instant"),
  })
  .refine(
    (m) =>
      m.duration.fast < m.duration.base && m.duration.base < m.duration.slow,
    {
      message: "motion.duration은 fast < base < slow 순서여야 합니다",
      path: ["duration"],
    },
  );

/** "cat-{slug}-surface" 처럼 {slug} 자리표시자를 허용하는 색 참조. */
const illustColorRef = z
  .string()
  .regex(/^[a-z][a-z0-9-]*(\{slug\}[a-z0-9-]*)?$/);

export const illustrationSchema = z.strictObject({
  style: z.enum(["painted", "line", "flat"]),
  /** px (viewBox 96 기준). painted는 0 가능. */
  strokeWidth: z.number().min(0).max(6),
  /** 카드 높이 중 일러스트 영역 비율. */
  cardAreaRatio: z.number().min(0).max(0.7),
  placement: z.enum(["top", "side", "corner"]),
  palette: z.strictObject({
    /** 색면 */
    surface: illustColorRef,
    /** 선, 주 형태 */
    ink: illustColorRef,
    /** 강조 한 점 (없으면 null). */
    accent: illustColorRef.nullable(),
  }),
});

export const layoutSchema = z.strictObject({
  /** px. 모바일 콘텐츠 최대 폭. */
  maxWidth: z.number().int().min(360).max(640),
  /** px. 지원 최소 폭. */
  minWidth: z.literal(360),
  /** px. 좌우 여백. */
  gutter: z.number().int().min(12).max(32),
  desktop: z.strictObject({
    /** px. 이 폭부터 2단. */
    breakpoint: z.number().int().min(768).max(1440),
    /** [리스트, 지도] fr 비율. */
    columns: z.tuple([z.number().positive(), z.number().positive()]),
    /** px. 좌측 리스트 최대 폭. */
    listMaxWidth: z.number().int().min(320).max(640),
  }),
  bottomActionZone: z.strictObject({
    /** 화면 높이 대비 하단 액션 영역 비율. */
    ratio: z.number().min(0.25).max(0.4),
    /** px. 최소 터치 영역. */
    minTouch: z.number().int().min(44),
  }),
  /** px. 하단 탭 높이(안전 영역 제외). */
  tabBarHeight: z.number().int().min(48).max(88),
});

/* ------------------------------------------------------------------ */
/* 최상위 스키마                                                        */
/* ------------------------------------------------------------------ */

const ALL_COLOR_REFS = new Set<string>([
  ...SHADCN_COLOR_KEYS,
  ...APP_COLOR_KEYS,
  ...CATEGORY_SLUGS.flatMap((s) => [`cat-${s}-surface`, `cat-${s}-ink`]),
]);

function pairKey(p: { fg: string; bg: string }): string {
  return `${p.fg}|${p.bg}`;
}

/** 색 참조(생성 변수 이름에서 -- 를 뺀 것)를 한 테마의 oklch 값으로 푼다. 없으면 undefined. */
export function resolveColorRef(
  theme: ColorTheme,
  ref: string,
): string | undefined {
  const cat = /^cat-([a-z]+)-(surface|ink)$/.exec(ref);
  if (cat) {
    const slug = cat[1] as CategorySlug;
    const part = cat[2] as "surface" | "ink";
    return theme.category[slug]?.[part];
  }
  const shadcn: Record<string, string> = theme.shadcn;
  const app: Record<string, string> = theme.app;
  return shadcn[ref] ?? app[ref];
}

export const designFrontmatterSchema = z
  .strictObject({
    schema: z.literal(SCHEMA_VERSION),
    meta: metaSchema,
    color: colorSchema,
    contrastPairs: z.array(contrastPairSchema).min(1),
    font: fontSchema,
    type: typeSchema,
    space: spaceSchema,
    radius: radiusSchema,
    shadow: shadowSchema,
    border: borderSchema,
    motion: motionSchema,
    illustration: illustrationSchema,
    layout: layoutSchema,
  })
  .superRefine((d, ctx) => {
    // 1) 대비 쌍 참조가 실제 색 키인지
    d.contrastPairs.forEach((p, i) => {
      for (const side of ["fg", "bg"] as const) {
        if (!ALL_COLOR_REFS.has(p[side])) {
          ctx.addIssue({
            code: "custom",
            message: `알 수 없는 색 참조: ${p[side]}`,
            path: ["contrastPairs", i, side],
          });
          continue;
        }
        // 알파가 있는 색은 바탕에 따라 대비가 달라지므로 검사 대상에서 뺀다
        for (const t of ["light", "dark"] as const) {
          if ((p.theme ?? "both") !== "both" && p.theme !== t) continue;
          const value = resolveColorRef(d.color[t], p[side]);
          if (value !== undefined && (parseOklch(value)?.alpha ?? 1) < 1) {
            ctx.addIssue({
              code: "custom",
              message: `알파가 있는 색은 대비 쌍에 넣을 수 없습니다: ${p[side]} (${t})`,
              path: ["contrastPairs", i, side],
            });
          }
        }
      }
    });

    // 2) 필수 대비 쌍이 모두 있고, min이 필수값 이상인지
    const declared = new Map(d.contrastPairs.map((p) => [pairKey(p), p]));
    for (const req of [
      ...REQUIRED_CONTRAST_PAIRS,
      ...requiredCategoryPairs(),
    ]) {
      const got = declared.get(pairKey(req));
      if (!got) {
        ctx.addIssue({
          code: "custom",
          message: `필수 대비 쌍 누락: ${req.fg} on ${req.bg} (min ${req.min})`,
          path: ["contrastPairs"],
        });
      } else if (got.min < req.min) {
        ctx.addIssue({
          code: "custom",
          message: `대비 최소값을 낮출 수 없습니다: ${req.fg} on ${req.bg}는 ${req.min} 이상`,
          path: ["contrastPairs"],
        });
      } else if ((got.theme ?? "both") !== "both") {
        ctx.addIssue({
          code: "custom",
          message: `필수 대비 쌍은 라이트와 다크 모두 검사합니다: ${req.fg} on ${req.bg}`,
          path: ["contrastPairs"],
        });
      }
    }

    // 3) 세리프 제목은 시안 B 계열만
    const fromB = d.meta.id === "b" || d.meta.basedOn.includes("b");
    if (d.font.heading.kind === "serif" && !fromB) {
      ctx.addIssue({
        code: "custom",
        message:
          "제목 세리프는 시안 B(또는 B를 바탕으로 한 확정본)에서만 쓸 수 있습니다",
        path: ["font", "heading", "kind"],
      });
    }

    // 4) 일러스트 팔레트 참조가 실제 색 키로 풀리는지
    const p = d.illustration.palette;
    for (const [k, ref] of Object.entries(p)) {
      if (ref === null) continue;
      const resolved = ref.includes("{slug}")
        ? CATEGORY_SLUGS.map((s) => ref.replace("{slug}", s))
        : [ref];
      for (const r of resolved) {
        if (!ALL_COLOR_REFS.has(r)) {
          ctx.addIssue({
            code: "custom",
            message: `일러스트 팔레트 참조를 풀 수 없습니다: ${r}`,
            path: ["illustration", "palette", k],
          });
          break;
        }
      }
    }
  });

export type DesignFrontmatter = z.infer<typeof designFrontmatterSchema>;
export type ColorTheme = z.infer<typeof colorThemeSchema>;

/* ------------------------------------------------------------------ */
/* 파서                                                                */
/* ------------------------------------------------------------------ */

const FRONTMATTER_RE = /^---\r?\n([\s\S]*?)\r?\n---\r?\n?([\s\S]*)$/;

export type ParsedDesignDoc = {
  frontmatter: unknown;
  body: string;
};

/** DESIGN.md 텍스트를 프런트매터(YAML 객체)와 본문으로 나눈다. 검증은 하지 않는다. */
export function splitDesignDoc(source: string): ParsedDesignDoc {
  const m = FRONTMATTER_RE.exec(source);
  if (!m)
    throw new Error(
      "DESIGN.md는 --- 로 감싼 YAML 프런트매터로 시작해야 합니다",
    );
  const doc = parseDocument(m[1] ?? "", { uniqueKeys: true });
  if (doc.errors.length > 0) {
    throw new Error(
      `YAML 오류: ${doc.errors.map((e) => e.message).join("; ")}`,
    );
  }
  return { frontmatter: doc.toJS() as unknown, body: m[2] ?? "" };
}

/** 본문에 반드시 있어야 하는 2단계 제목 (FORMAT.md 4절). */
export const REQUIRED_BODY_SECTIONS = [
  "## 1. 컨셉",
  "## 2. 색 사용 규칙",
  "## 3. 타이포",
  "## 4. 레이아웃",
  "## 5. 컴포넌트 규칙",
  "## 6. 카테고리 일러스트 시스템",
  "## 7. 모션",
  "## 8. 문구 톤",
  "## 9. Do / Don't",
] as const;

export function missingBodySections(body: string): string[] {
  const lines = new Set(body.split(/\r?\n/).map((l) => l.trim()));
  return REQUIRED_BODY_SECTIONS.filter((h) => !lines.has(h));
}

/** 프런트매터 검증 + 본문 섹션 확인. 실패하면 사람이 읽을 수 있는 메시지로 throw. */
export function parseDesignDoc(source: string): {
  tokens: DesignFrontmatter;
  body: string;
} {
  const { frontmatter, body } = splitDesignDoc(source);
  const result = designFrontmatterSchema.safeParse(frontmatter);
  if (!result.success) {
    const msg = result.error.issues
      .map((i) => `- ${i.path.join(".") || "(root)"}: ${i.message}`)
      .join("\n");
    throw new Error(`DESIGN.md 프런트매터 검증 실패\n${msg}`);
  }
  const missing = missingBodySections(body);
  if (missing.length > 0) {
    throw new Error(`DESIGN.md 본문 섹션 누락: ${missing.join(", ")}`);
  }
  return { tokens: result.data, body };
}
