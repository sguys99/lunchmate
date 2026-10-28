// 임시 확인 페이지 (T1.4): 시안 A 일러스트 12종을 현재 테마와 다크로 나란히 본다.
// 토큰 생성기(T1.9) 전이라 a.DESIGN.md를 서버에서 읽어 이 페이지 범위에만 색 변수를 선언한다.
// T1.11 비교 화면이 생기면 삭제한다.
import { readFileSync } from "node:fs";
import path from "node:path";
import { IllustrationA } from "@/features/design-lab/illustrations/a";
import { CATEGORIES, CATEGORY_SLUGS } from "@/features/place/categories";
import { parseDesignDoc, type ColorTheme } from "@/lib/design/schema";

const SCOPE = "ill-a-scope";

function vars(theme: ColorTheme): string {
  const out: string[] = [];
  for (const [k, v] of Object.entries(theme.shadcn)) out.push(`--${k}:${v}`);
  for (const [slug, c] of Object.entries(theme.category)) {
    out.push(
      `--cat-${slug}-surface:${c.surface}`,
      `--cat-${slug}-ink:${c.ink}`,
    );
  }
  return out.join(";");
}

function buildCss(): string {
  const src = readFileSync(
    path.join(process.cwd(), "docs/design/candidates/a.DESIGN.md"),
    "utf8",
  );
  const { tokens } = parseDesignDoc(src);
  const light = vars(tokens.color.light);
  const dark = vars(tokens.color.dark);
  return [
    `.${SCOPE}{${light}}`,
    `.dark .${SCOPE},.${SCOPE}.dark{${dark}}`,
    `@media (prefers-color-scheme: dark){:root:not(.light):not(.dark) .${SCOPE}{${dark}}}`,
  ].join("\n");
}

function Grid({ dark }: { dark: boolean }) {
  return (
    <section
      className={`${SCOPE} ${dark ? "dark" : ""} flex flex-col gap-4 rounded-3xl bg-background p-5 text-foreground`}
    >
      <h2 className="text-sm font-semibold text-muted-foreground">
        {dark ? "다크" : "현재 테마"}
      </h2>
      <ul className="grid grid-cols-2 gap-4 sm:grid-cols-3">
        {CATEGORY_SLUGS.map((slug) => (
          <li
            key={slug}
            className="overflow-hidden rounded-[20px] bg-card shadow-sm"
          >
            <IllustrationA category={slug} className="aspect-[16/10] w-full" />
            <p className="px-3 py-2 text-sm font-semibold">
              {CATEGORIES[slug].label}
            </p>
          </li>
        ))}
      </ul>
    </section>
  );
}

export default function IllustrationsAPage() {
  return (
    <main className="mx-auto flex w-full max-w-6xl flex-col gap-6 bg-background p-4 text-foreground lg:flex-row">
      <style>{buildCss()}</style>
      <Grid dark={false} />
      <Grid dark />
    </main>
  );
}
