// 시안 B 일러스트와 제목 세리프 확인용 임시 페이지 (T1.5).
// [data-design="b"] 변수 생성기(T1.9)가 붙기 전이라, b.DESIGN.md를 서버에서 읽어 이 페이지 전용 변수를 만든다.
// 값은 모두 b.DESIGN.md의 oklch 토큰이며 이 파일에 색 값을 직접 쓰지 않는다. T1.11 이후 삭제한다.
import { readFileSync } from "node:fs";
import path from "node:path";
import type { Metadata } from "next";
import { quietStoneCopy as copy } from "@/copy/design-lab-quiet-stone";
import { maruBuri } from "@/features/design-lab/fonts";
import { IllustrationB } from "@/features/design-lab/illustrations/b";
import { MOCK_PLACES } from "@/features/design-lab/mock";
import { CATEGORIES, CATEGORY_SLUGS } from "@/features/place/categories";
import { parseDesignDoc, type ColorTheme } from "@/lib/design/schema";
import { formatPriceBand } from "@/lib/format";
import { cn } from "@/lib/utils";

export const metadata: Metadata = { title: copy.metaTitle };

function themeVars(theme: ColorTheme): string {
  const lines: string[] = [];
  for (const [k, v] of Object.entries(theme.shadcn))
    lines.push(`--${k}: ${v};`);
  for (const [k, v] of Object.entries(theme.app)) lines.push(`--${k}: ${v};`);
  for (const [slug, c] of Object.entries(theme.category)) {
    lines.push(
      `--cat-${slug}-surface: ${c.surface};`,
      `--cat-${slug}-ink: ${c.ink};`,
    );
  }
  return lines.join("");
}

function loadTokens() {
  const file = path.join(process.cwd(), "docs/design/candidates/b.DESIGN.md");
  return parseDesignDoc(readFileSync(file, "utf8")).tokens;
}

/** "9천 원대" → ["9천", "원대"] : 숫자는 크게, 단위는 작게 */
function splitPrice(priceKRW: number): [string, string] {
  const m = /^([\d.]+[천만]?)\s?(.*)$/.exec(formatPriceBand(priceKRW));
  return m ? [m[1] ?? "", m[2] ?? ""] : [formatPriceBand(priceKRW), ""];
}

const serif = { fontFamily: "var(--font-maruburi), serif" } as const;

function Panel({ mode }: { mode: "light" | "dark" }) {
  const place = MOCK_PLACES[0];
  const [priceNum, priceUnit] = splitPrice(place.priceKRW);
  return (
    <section
      className={cn(
        "qs-panel flex flex-col gap-14 rounded-[28px] bg-background px-4 py-10 text-foreground sm:px-8",
        mode === "light" ? "qs-light" : "qs-dark",
      )}
    >
      <p className="text-[0.8125rem] font-medium text-muted-foreground">
        {mode === "light" ? copy.lightLabel : copy.darkLabel}
      </p>

      {/* 제목 세리프 견본 */}
      <div className="flex flex-col gap-5">
        <p className="text-[0.8125rem] font-medium text-muted-foreground">
          {copy.specimenLabel}
        </p>
        <p
          style={serif}
          className="text-[2.5rem] leading-[1.2] font-light tracking-[-0.02em] text-balance break-keep"
        >
          {copy.specimenDisplay}
        </p>
        <p
          style={serif}
          className="text-[1.875rem] leading-[1.25] font-light tracking-[-0.015em]"
        >
          {copy.specimenTitle}
        </p>
      </div>

      {/* 추천 카드 예시: 큰 단일 카드, 그림자 없이 1px 선 */}
      <div className="flex flex-col gap-5">
        <p className="text-[0.8125rem] font-medium text-muted-foreground">
          {copy.cardLabel}
        </p>
        <article className="relative flex flex-col gap-7 rounded-[24px] border border-border bg-card p-7">
          <div className="flex items-start justify-between gap-4">
            <div className="flex min-w-0 flex-col gap-2 pt-1">
              <span
                className="text-[0.8125rem] font-medium"
                style={{ color: `var(--cat-${place.category}-ink)` }}
              >
                {CATEGORIES[place.category].label}
              </span>
              <h2
                style={serif}
                className="text-[1.375rem] leading-[1.35] font-normal tracking-[-0.01em]"
              >
                {place.name}
              </h2>
            </div>
            <IllustrationB
              category={place.category}
              className="-mt-2 -mr-2 size-24 shrink-0"
            />
          </div>
          <dl className="grid grid-cols-[0.8fr_1.3fr_0.9fr] divide-x divide-border">
            {[
              {
                label: copy.walkLabel,
                num: String(place.walkMinutes),
                unit: copy.walkUnit,
              },
              { label: copy.priceLabel, num: priceNum, unit: priceUnit },
              {
                label: copy.thumbsLabel,
                num: String(place.thumbsUpRate ?? ""),
                unit: copy.thumbsUnit,
              },
            ].map((n) => (
              <div
                key={n.label}
                className="flex min-w-0 flex-col gap-1.5 px-3 first:pl-0 last:pr-0 sm:px-4"
              >
                <dt className="text-[0.8125rem] font-medium text-muted-foreground">
                  {n.label}
                </dt>
                <dd className="flex items-baseline gap-0.5 whitespace-nowrap tabular-nums">
                  <span className="text-[1.75rem] leading-[1.05] font-medium tracking-[-0.02em]">
                    {n.num}
                  </span>
                  <span className="text-[0.9375rem] text-muted-foreground">
                    {n.unit}
                  </span>
                </dd>
              </div>
            ))}
          </dl>
          <p className="text-[0.9375rem] leading-[1.55] text-muted-foreground">
            {place.reason}
          </p>
          <div className="flex items-center gap-3">
            <button
              type="button"
              className="h-12 flex-1 rounded-full bg-primary text-[0.9375rem] font-medium text-primary-foreground"
            >
              {copy.primaryAction}
            </button>
            <button
              type="button"
              className="h-12 rounded-full border border-border px-6 text-[0.9375rem] font-medium"
            >
              {copy.secondaryAction}
            </button>
          </div>
        </article>
      </div>

      {/* 12종 그리드 */}
      <div className="flex flex-col gap-5">
        <p className="text-[0.8125rem] font-medium text-muted-foreground">
          {copy.illustrationsLabel}
        </p>
        <ul className="grid grid-cols-3 gap-x-4 gap-y-8 sm:grid-cols-4">
          {CATEGORY_SLUGS.map((slug) => (
            <li key={slug} className="flex flex-col items-center gap-2">
              <IllustrationB category={slug} className="size-20" />
              <span className="text-[0.8125rem] font-medium text-muted-foreground">
                {CATEGORIES[slug].label}
              </span>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}

export default function QuietStoneIllustrationsPage() {
  const tokens = loadTokens();
  const css = `.qs-light{${themeVars(tokens.color.light)}}.qs-dark{${themeVars(tokens.color.dark)}}`;
  return (
    <main className={cn(maruBuri.variable, "qs-light flex-1 bg-background")}>
      <style>{css}</style>
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-10 px-4 py-12 sm:px-6">
        <header className="flex flex-col gap-3 px-2">
          <p className="text-[0.8125rem] font-medium text-muted-foreground">
            {copy.eyebrow}
          </p>
          <h1
            style={serif}
            className="text-[2.5rem] leading-[1.2] font-light tracking-[-0.02em] text-balance break-keep"
          >
            {copy.title}
          </h1>
          <p className="max-w-xl text-base leading-[1.6] text-muted-foreground">
            {copy.description}
          </p>
        </header>
        <div className="grid gap-6 lg:grid-cols-2">
          <Panel mode="light" />
          <Panel mode="dark" />
        </div>
      </div>
    </main>
  );
}
