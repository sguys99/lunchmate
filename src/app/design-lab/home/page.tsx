// /design-lab/home: 오늘(홈) 시안 목록 (T3.1). 4안 링크와 한 줄 의도, 상태별 단독 화면, 비교 스위처.
// 상위 design-lab/layout.tsx가 플래그로 막는다.
import type { Metadata } from "next";
import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { focusRing } from "@/components/ui/interaction";
import { designLabCopy } from "@/copy/design-lab";
import { designLabHomeCopy as copy } from "@/copy/design-lab-home";
import { HOME_VARIANT_IDS } from "@/features/design-lab/home/types";
import { DESIGN_STATES } from "@/features/design-lab/mock";

export const metadata: Metadata = { title: copy.index.metaTitle };

const stateLabels = designLabCopy.switcher.states;
const smallLink = `type-caption text-muted-foreground underline decoration-border underline-offset-3 hover:text-foreground ${focusRing} rounded-sm`;

export default function HomeLabIndexPage() {
  return (
    <main className="mx-auto flex w-full max-w-2xl flex-1 flex-col gap-10 bg-background px-(--lm-layout-gutter) py-10 text-foreground">
      <header className="flex flex-col gap-3">
        <Link
          href="/design-lab"
          className={`-ml-1 inline-flex h-11 w-fit items-center gap-1 type-caption text-muted-foreground hover:text-foreground ${focusRing} rounded-sm`}
        >
          <ChevronLeft aria-hidden className="size-4" strokeWidth={1.5} />
          {copy.index.back}
        </Link>
        <p className="type-caption text-muted-foreground">
          {copy.index.eyebrow}
        </p>
        <h1 className="type-title">{copy.index.title}</h1>
        <p className="type-body-sm text-muted-foreground">
          {copy.index.description}
        </p>
      </header>

      <ol className="flex flex-col divide-y divide-border border-y border-border">
        {HOME_VARIANT_IDS.map((id) => {
          const v = copy.variants[id];
          return (
            <li key={id} className="flex flex-col gap-3 py-6">
              <Link
                href={`/design-lab/home/${id}`}
                className={`group flex items-baseline gap-4 ${focusRing} rounded-sm`}
              >
                <span className="w-6 shrink-0 type-label text-muted-foreground tabular-nums">
                  {id.toUpperCase()}
                </span>
                <span className="flex min-w-0 flex-col gap-1.5">
                  <span className="type-heading group-hover:text-primary">
                    {v.name}
                  </span>
                  <span className="type-body-sm text-muted-foreground">
                    {v.intent}
                  </span>
                </span>
              </Link>
              <p className="flex flex-wrap items-center gap-x-3 gap-y-1 pl-10">
                <span className="type-caption text-muted-foreground">
                  {copy.index.states}
                </span>
                {DESIGN_STATES.filter((s) => s !== "ready").map((s) => (
                  <Link
                    key={s}
                    href={`/design-lab/home/${id}?state=${s}`}
                    className={smallLink}
                  >
                    {stateLabels[s]}
                  </Link>
                ))}
                {/* D1~D3: 어제 피드백이 없는 날 */}
                {id.length > 1 ? (
                  <Link
                    href={`/design-lab/home/${id}?feedback=none`}
                    className={smallLink}
                  >
                    {copy.index.noFeedback}
                  </Link>
                ) : null}
                <Link
                  href={`/design-lab/home/compare?v=${id}`}
                  className={smallLink}
                >
                  {copy.index.compareTitle}
                </Link>
              </p>
            </li>
          );
        })}
      </ol>

      <section className="flex flex-col gap-2">
        <h2 className="type-heading">{copy.index.compareTitle}</h2>
        <p className="type-body-sm text-muted-foreground">
          {copy.index.compareBody}
        </p>
        <Link
          href="/design-lab/home/compare"
          className={`w-fit type-label underline underline-offset-4 hover:text-primary ${focusRing} rounded-sm`}
        >
          {copy.index.compareLink}
        </Link>
      </section>
    </main>
  );
}
