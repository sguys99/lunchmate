// /design-lab/landing (T3.4): 랜딩 시안 3안 목록. 플래그 차단은 design-lab/layout.tsx.
import type { Metadata } from "next";
import Link from "next/link";
import { landingLabCopy } from "@/copy/design-lab-landing";

const copy = landingLabCopy.index;
const IDS = ["a", "b", "c"] as const;
const STATE_QUERIES = [
  ["ready", ""],
  ["loading", "?state=loading"],
  ["offline", "?state=offline"],
  ["error", "?state=error"],
  ["inapp", "?inapp=kakao"],
] as const;

export const metadata: Metadata = { title: copy.metaTitle };

export default function LandingIndexPage() {
  return (
    <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-10 bg-background px-6 py-10 text-foreground">
      <header className="flex flex-col gap-3">
        <Link
          href="/design-lab"
          className="type-caption text-muted-foreground hover:text-foreground"
        >
          {copy.back}
        </Link>
        <p className="type-caption text-muted-foreground">{copy.eyebrow}</p>
        <h1 className="type-title">{copy.title}</h1>
        <p className="type-body-sm text-muted-foreground">{copy.description}</p>
      </header>

      <ol className="flex flex-col divide-y divide-border border-y border-border">
        {IDS.map((id) => {
          const d = copy.designs[id];
          return (
            <li key={id} className="flex flex-col gap-3 py-6">
              <Link
                href={`/design-lab/landing/${id}`}
                className="type-heading hover:underline"
              >
                {d.name}
              </Link>
              <p className="type-body-sm text-muted-foreground">{d.intent}</p>
              <p className="flex flex-wrap gap-x-5 gap-y-1">
                {STATE_QUERIES.map(([key, query]) => (
                  <Link
                    key={key}
                    href={`/design-lab/landing/${id}${query}`}
                    className="type-caption text-muted-foreground underline decoration-border underline-offset-4 hover:text-foreground"
                  >
                    {copy.states[key]}
                  </Link>
                ))}
              </p>
            </li>
          );
        })}
      </ol>
    </main>
  );
}
