// /design-lab/poc (T2.13). 동적 컴포넌트 PoC 목록. 플래그 차단은 design-lab/layout.tsx.
import Link from "next/link";
import { designLabPocCopy as copy } from "@/copy/design-lab-poc";
import { POC_ENTRIES } from "@/features/design-lab/poc/registry";

export default function PocIndexPage() {
  return (
    <main className="mx-auto flex w-full max-w-(--lm-layout-max-width) flex-1 flex-col gap-10 bg-background px-(--lm-layout-gutter) py-10 text-foreground">
      <header className="flex flex-col gap-2">
        <h1 className="type-title">{copy.index.title}</h1>
        <p className="type-body-sm text-muted-foreground">
          {copy.index.description}
        </p>
      </header>
      <ul className="flex flex-col divide-y divide-border border-y border-border">
        {POC_ENTRIES.map((p) => (
          <li key={p.slug}>
            <Link
              href={`/design-lab/poc/${p.slug}`}
              className="flex flex-col gap-1.5 py-5 outline-none hover:text-primary focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring focus-visible:outline-solid"
            >
              <span className="flex items-baseline justify-between gap-3">
                <span className="type-heading">{p.title}</span>
                <span className="shrink-0 type-caption text-muted-foreground">
                  {p.libs}
                </span>
              </span>
              <span className="line-clamp-2 type-body-sm text-muted-foreground">
                {p.description}
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </main>
  );
}
