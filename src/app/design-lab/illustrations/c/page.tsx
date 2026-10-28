// 시안 C 일러스트 확인용 임시 페이지 (T1.6). [data-design="c"] 생성기(T1.9) 전이라
// c.DESIGN.md를 직접 읽어 이 페이지 안에서만 쓰는 oklch 변수를 만든다. T1.14 스위처가 생기면 지운다.
import { readFileSync } from "node:fs";
import path from "node:path";
import { CATEGORIES, CATEGORY_SLUGS } from "@/features/place/categories";
import { IllustrationC } from "@/features/design-lab/illustrations/c";
import { parseDesignDoc, type ColorTheme } from "@/lib/design/schema";

function themeVars(theme: ColorTheme): string {
  const lines: string[] = [];
  for (const [k, v] of Object.entries(theme.shadcn)) lines.push(`--${k}:${v};`);
  for (const [k, v] of Object.entries(theme.category)) {
    lines.push(`--cat-${k}-surface:${v.surface};`, `--cat-${k}-ink:${v.ink};`);
  }
  return lines.join("");
}

function loadCss(): string {
  const file = path.join(process.cwd(), "docs/design/candidates/c.DESIGN.md");
  const { tokens } = parseDesignDoc(readFileSync(file, "utf8"));
  return [
    `.ic-light{${themeVars(tokens.color.light)}}`,
    `.ic-dark{${themeVars(tokens.color.dark)}}`,
    `.ic-panel{background:var(--background);color:var(--foreground)}`,
    `.ic-cell{background:var(--card);border:1px solid var(--border)}`,
  ].join("\n");
}

const SIZES = ["size-24", "size-14", "size-8"] as const;

function Panel({ mode }: { mode: "light" | "dark" }) {
  return (
    <section
      className={`ic-${mode} ic-panel flex flex-col gap-4 p-4 sm:p-6`}
      aria-label={mode === "light" ? "라이트" : "다크"}
    >
      <h2 className="text-sm font-medium opacity-70">
        {mode === "light" ? "라이트" : "다크"}
      </h2>
      <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        {CATEGORY_SLUGS.map((slug) => (
          <li
            key={slug}
            className="ic-cell flex flex-col items-start gap-2 rounded-lg p-3"
          >
            <div className="flex flex-wrap items-end gap-2">
              {SIZES.map((s) => (
                <IllustrationC key={s} category={slug} className={s} />
              ))}
            </div>
            <span
              className="text-xs font-medium"
              style={{ color: `var(--cat-${slug}-ink)` }}
            >
              {CATEGORIES[slug].label}
            </span>
          </li>
        ))}
      </ul>
    </section>
  );
}

export default function IllustrationsCPage() {
  return (
    <main className="grid min-h-dvh grid-cols-1 xl:grid-cols-2">
      <style>{loadCss()}</style>
      <Panel mode="light" />
      <Panel mode="dark" />
    </main>
  );
}
