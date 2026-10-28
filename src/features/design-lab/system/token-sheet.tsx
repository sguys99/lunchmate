// G1 토큰 견본표 (T1.16 보조 자료). 서버 컴포넌트, /design-lab/system/tokens에서만 쓴다.
// 값은 시안 DESIGN.md 프런트매터를 파싱한 결과(getDesignFrontmatter)에서 가져오고, 대비비는 src/lib/design/contrast.ts로 계산한다.
// 색은 시안 범위([data-design]) 안의 CSS 변수로 칠한다. 테마는 시스템 설정을 따르고, 숫자와 oklch 값은
// 라이트와 다크 둘 다 그려 dark: 변형으로 지금 테마의 값만 보인다(캡처 라이트/다크가 각각 맞는 숫자를 보여 준다).
import type { CSSProperties, ReactNode } from "react";
import { designLabCopy } from "@/copy/design-lab";
import {
  contrastOf,
  formatRatio,
  parseOklchValue,
  resolveRef,
} from "@/lib/design/contrast";
import {
  CATEGORY_LABELS,
  CATEGORY_SLUGS,
  TYPE_STEPS,
  type ColorTheme,
  type DesignFrontmatter,
} from "@/lib/design/schema";
import { cn } from "@/lib/utils";
import { getDesignFrontmatter } from "./tokens.server";
import { DESIGN_IDS, type DesignId } from "./types";

const copy = designLabCopy.tokens;

type ThemeName = "light" | "dark";

/** 견본 색 (DESIGN.md 색 참조 이름 = CSS 변수 이름) */
const CORE_COLORS = [
  "background",
  "card",
  "foreground",
  "muted-foreground",
  "primary",
  "primary-foreground",
  "border",
  "accent",
] as const;

const SEMANTIC_COLORS = [
  "destructive",
  "success",
  "warning",
  "info",
  "success-surface",
  "warning-surface",
  "info-surface",
] as const;

type PairLabel = keyof typeof copy.pairs;

/** 견본표에 그리는 대비 쌍. min이 null이면 글자가 아닌 참고 쌍(경계선) */
const PAIRS: readonly {
  fg: string;
  bg: string;
  min: number | null;
  label: PairLabel;
}[] = [
  { fg: "foreground", bg: "background", min: 4.5, label: "body" },
  { fg: "card-foreground", bg: "card", min: 4.5, label: "card" },
  { fg: "muted-foreground", bg: "background", min: 4.5, label: "muted" },
  { fg: "muted-foreground", bg: "card", min: 4.5, label: "mutedOnCard" },
  {
    fg: "primary-foreground",
    bg: "primary",
    min: 4.5,
    label: "primaryButton",
  },
  { fg: "primary", bg: "background", min: 3, label: "primaryIcon" },
  { fg: "accent-foreground", bg: "accent", min: 4.5, label: "accent" },
  { fg: "border", bg: "background", min: null, label: "border" },
  { fg: "destructive", bg: "card", min: 4.5, label: "destructive" },
  {
    fg: "success-foreground",
    bg: "success-surface",
    min: 4.5,
    label: "success",
  },
  {
    fg: "warning-foreground",
    bg: "warning-surface",
    min: 4.5,
    label: "warning",
  },
  { fg: "info-foreground", bg: "info-surface", min: 4.5, label: "info" },
  { fg: "warning", bg: "card", min: 3, label: "warningIcon" },
];

/** Tailwind가 클래스를 찾을 수 있게 문자열을 그대로 둔다 */
const TYPE_CLASS: Record<(typeof TYPE_STEPS)[number], string> = {
  display: "type-display",
  title: "type-title",
  heading: "type-heading",
  body: "type-body",
  "body-sm": "type-body-sm",
  label: "type-label",
  caption: "type-caption",
  "numeric-lg": "type-numeric-lg",
  "numeric-md": "type-numeric-md",
};

const RADIUS_SAMPLES = [
  { key: "card", className: "rounded-card" },
  { key: "button", className: "rounded-button" },
  { key: "chip", className: "rounded-chip" },
  { key: "sheet", className: "rounded-sheet" },
] as const;

const SHADOW_SAMPLES = [
  { key: "sm", className: "shadow-sm" },
  { key: "md", className: "shadow-md" },
  { key: "lg", className: "shadow-lg" },
  { key: "sheet", className: "shadow-sheet" },
] as const;

const SPRING_SAMPLES = ["swipe", "sheet", "bar"] as const;

/** 알파가 있거나 참조를 못 풀면 null (contrast.ts checkContrast와 같은 판단) */
function ratioOf(theme: ColorTheme, fg: string, bg: string): number | null {
  const f = resolveRef(theme, fg);
  const b = resolveRef(theme, bg);
  if (!f || !b) return null;
  const pf = parseOklchValue(f);
  const pb = parseOklchValue(b);
  if (!pf || !pb || pf.alpha < 1 || pb.alpha < 1) return null;
  return contrastOf(f, b);
}

function varOf(ref: string): string {
  return `var(--${ref})`;
}

/** 라이트, 다크 값을 둘 다 그리고 지금 테마의 값만 보인다 */
function ByTheme({ render }: { render: (theme: ThemeName) => ReactNode }) {
  return (
    <>
      <span className="dark:hidden">{render("light")}</span>
      <span className="hidden dark:inline">{render("dark")}</span>
    </>
  );
}

function Ratio({ value, min }: { value: number | null; min: number | null }) {
  if (value === null) {
    return <span className="text-muted-foreground">{copy.alpha}</span>;
  }
  const fail = min !== null && value < min;
  return (
    <span className={cn("tabular-nums", fail && "font-bold underline")}>
      {formatRatio(value)}
    </span>
  );
}

function SectionTitle({ children }: { children: ReactNode }) {
  return (
    <h3 className="border-b border-border pb-1.5 type-label">{children}</h3>
  );
}

function Swatch({ name, doc }: { name: string; doc: DesignFrontmatter }) {
  return (
    <li className="flex items-center gap-2.5">
      <span
        aria-hidden
        className="size-8 shrink-0 rounded-md border border-border"
        style={{ background: varOf(name) } as CSSProperties}
      />
      <span className="flex min-w-0 flex-col">
        <span className="type-caption">{name}</span>
        <span className="truncate font-mono text-[0.6875rem] text-muted-foreground">
          <ByTheme render={(t) => resolveRef(doc.color[t], name) ?? ""} />
        </span>
      </span>
    </li>
  );
}

function ColorSection({ doc }: { doc: DesignFrontmatter }) {
  return (
    <section className="flex flex-col gap-3">
      <SectionTitle>{copy.sections.color}</SectionTitle>
      <ul className="grid grid-cols-2 gap-x-3 gap-y-2.5">
        {[...CORE_COLORS, ...SEMANTIC_COLORS].map((name) => (
          <Swatch key={name} name={name} doc={doc} />
        ))}
      </ul>
    </section>
  );
}

function ContrastSection({ doc }: { doc: DesignFrontmatter }) {
  return (
    <section className="flex flex-col gap-3">
      <SectionTitle>{copy.sections.contrast}</SectionTitle>
      <p className="type-caption text-muted-foreground">{copy.contrastNote}</p>
      <ul className="flex flex-col gap-1.5">
        {PAIRS.map((p) => (
          <li
            key={`${p.fg}|${p.bg}`}
            className="flex items-center gap-3 rounded-md border border-border px-3 py-2"
            style={{ background: varOf(p.bg) } as CSSProperties}
          >
            {p.label === "border" ? (
              <span
                aria-hidden
                className="h-5 w-16 shrink-0 rounded-sm border-2"
                style={{ borderColor: varOf(p.fg) } as CSSProperties}
              />
            ) : (
              <span
                className="w-16 shrink-0 type-label"
                style={{ color: varOf(p.fg) } as CSSProperties}
              >
                {copy.sampleText}
              </span>
            )}
            <span
              className="flex min-w-0 flex-1 flex-col"
              style={{ color: varOf(bgText(p.bg)) } as CSSProperties}
            >
              <span className="type-caption">{copy.pairs[p.label]}</span>
              <span className="truncate font-mono text-[0.6875rem] opacity-80">
                {p.fg} / {p.bg}
              </span>
            </span>
            <span
              className="flex shrink-0 flex-col items-end"
              style={{ color: varOf(bgText(p.bg)) } as CSSProperties}
            >
              <span className="type-numeric-md">
                <ByTheme
                  render={(t) => (
                    <Ratio
                      value={ratioOf(doc.color[t], p.fg, p.bg)}
                      min={p.min}
                    />
                  )}
                />
              </span>
              <span className="type-caption opacity-80">
                {p.min === null ? copy.reference : copy.min(p.min)}
              </span>
            </span>
          </li>
        ))}
      </ul>
    </section>
  );
}

/** 대비 행의 설명 글자색: 배경과 짝이 맞는 글자 토큰 */
function bgText(bg: string): string {
  switch (bg) {
    case "primary":
      return "primary-foreground";
    case "accent":
      return "accent-foreground";
    case "card":
      return "card-foreground";
    case "success-surface":
      return "success-foreground";
    case "warning-surface":
      return "warning-foreground";
    case "info-surface":
      return "info-foreground";
    default:
      return "foreground";
  }
}

function CategorySection({ doc }: { doc: DesignFrontmatter }) {
  return (
    <section className="flex flex-col gap-3">
      <SectionTitle>{copy.sections.category}</SectionTitle>
      <ul className="grid grid-cols-3 gap-1.5">
        {CATEGORY_SLUGS.map((slug) => (
          <li
            key={slug}
            className="flex aspect-[4/3] flex-col justify-between rounded-md p-2"
            style={
              {
                background: varOf(`cat-${slug}-surface`),
                color: varOf(`cat-${slug}-ink`),
              } as CSSProperties
            }
          >
            <span className="type-caption break-keep">
              {CATEGORY_LABELS[slug]}
            </span>
            <span className="self-end text-xs font-semibold tabular-nums">
              <ByTheme
                render={(t) => (
                  <Ratio
                    value={ratioOf(
                      doc.color[t],
                      `cat-${slug}-ink`,
                      `cat-${slug}-surface`,
                    )}
                    min={4.5}
                  />
                )}
              />
            </span>
          </li>
        ))}
      </ul>
    </section>
  );
}

function px(rem: number): string {
  return `${Math.round(rem * 16 * 100) / 100}px`;
}

function TypeSection({ doc }: { doc: DesignFrontmatter }) {
  const headingSerif = doc.font.heading.kind === "serif";
  return (
    <section className="flex flex-col gap-3">
      <SectionTitle>{copy.sections.type}</SectionTitle>
      <ul className="flex flex-col divide-y divide-border">
        {TYPE_STEPS.map((step) => {
          const t = doc.type[step];
          const face =
            t.font === "heading"
              ? headingSerif
                ? copy.serif
                : copy.sans
              : t.font === "numeric"
                ? copy.numeric
                : copy.sans;
          return (
            <li key={step} className="flex flex-col gap-1 py-2.5">
              <span className="flex items-baseline justify-between gap-2 font-mono text-[0.6875rem] text-muted-foreground">
                <span>{step}</span>
                <span className="tabular-nums">
                  {px(t.size)} / {t.lineHeight} / {t.weight} / {face}
                </span>
              </span>
              <span
                className={cn(
                  TYPE_CLASS[step],
                  step.startsWith("numeric") && "tabular-nums",
                )}
              >
                {copy.typeSamples[step]}
              </span>
            </li>
          );
        })}
      </ul>
    </section>
  );
}

function radiusText(doc: DesignFrontmatter, key: string): string {
  const components: Record<string, string> = doc.radius.components;
  const step = components[key] ?? "";
  const scale: Record<string, number> = doc.radius.scale;
  const value = scale[step];
  if (value === undefined) return step;
  return `${step} ${px(value * doc.radius.base)}`;
}

function ShapeSection({ doc }: { doc: DesignFrontmatter }) {
  const shadows: Record<string, string> = doc.shadow.light;
  return (
    <section className="flex flex-col gap-3">
      <SectionTitle>{copy.sections.shape}</SectionTitle>
      <ul className="grid grid-cols-4 gap-2">
        {RADIUS_SAMPLES.map(({ key, className }) => (
          <li key={key} className="flex flex-col items-center gap-1.5">
            <span
              aria-hidden
              className={cn(
                "h-12 w-full border border-border bg-card",
                className,
              )}
            />
            <span className="type-caption">{copy.radiusLabels[key]}</span>
            <span className="font-mono text-[0.6875rem] text-muted-foreground">
              {radiusText(doc, key)}
            </span>
          </li>
        ))}
      </ul>
      <ul className="grid grid-cols-4 gap-2 pt-2">
        {SHADOW_SAMPLES.map(({ key, className }) => (
          <li key={key} className="flex flex-col items-center gap-1.5">
            <span
              aria-hidden
              className={cn("h-12 w-full rounded-md bg-card", className)}
            />
            <span className="font-mono text-[0.6875rem] text-muted-foreground">
              {key}
              {shadows[key] === "none" ? ` ${copy.shadowNone}` : ""}
            </span>
          </li>
        ))}
      </ul>
    </section>
  );
}

function MotionSection({ doc }: { doc: DesignFrontmatter }) {
  const { duration, spring, stagger, easing } = doc.motion;
  const rows: [string, string][] = [
    [copy.duration, `${duration.fast} / ${duration.base} / ${duration.slow}ms`],
    ...SPRING_SAMPLES.map((k): [string, string] => [
      `${copy.spring} ${copy.springLabels[k]}`,
      copy.springValue(spring[k].stiffness, spring[k].damping),
    ]),
    [copy.stagger, `${stagger}ms`],
    [copy.easing, `cubic-bezier(${easing.standard.join(", ")})`],
  ];
  return (
    <section className="flex flex-col gap-3">
      <SectionTitle>{copy.sections.motion}</SectionTitle>
      <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1.5">
        {rows.map(([k, v]) => (
          <div key={k} className="contents">
            <dt className="type-caption text-muted-foreground">{k}</dt>
            <dd className="font-mono text-xs tabular-nums">{v}</dd>
          </div>
        ))}
      </dl>
    </section>
  );
}

function DesignColumn({ id }: { id: DesignId }) {
  const doc = getDesignFrontmatter(id);
  return (
    <article
      data-design={id}
      aria-labelledby={`tokens-${id}`}
      className="flex min-w-0 flex-col gap-6 rounded-xl border border-border bg-background p-4 type-body font-sans text-foreground"
    >
      <header className="flex flex-col gap-1">
        <h2 id={`tokens-${id}`} className="type-heading">
          {copy.designHeading(id.toUpperCase(), doc.meta.name)}
        </h2>
        <p className="type-body-sm text-muted-foreground">{doc.meta.concept}</p>
      </header>
      <ColorSection doc={doc} />
      <ContrastSection doc={doc} />
      <CategorySection doc={doc} />
      <TypeSection doc={doc} />
      <ShapeSection doc={doc} />
      <MotionSection doc={doc} />
    </article>
  );
}

export function TokenSheet() {
  return (
    <main className="mx-auto flex w-full max-w-[90rem] flex-1 flex-col gap-5 bg-background px-4 py-6 text-foreground">
      <header className="flex flex-col gap-1.5">
        <h1 className="text-2xl font-bold tracking-tight">{copy.title}</h1>
        <p className="text-sm text-muted-foreground">{copy.description}</p>
      </header>
      <div className="grid gap-4 lg:grid-cols-3">
        {DESIGN_IDS.map((id) => (
          <DesignColumn key={id} id={id} />
        ))}
      </div>
    </main>
  );
}
