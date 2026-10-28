// 카테고리 일러스트 확인 페이지 (T2.8). 운영 모듈 src/features/place/illustrations를 그대로 쓴다.
// 다크 패널은 tokens.css의 .dark 변수를 그 패널에만 걸어서 라이트와 나란히 본다.
import type { Metadata } from "next";
import { designLabCopy } from "@/copy/design-lab";
import { MOCK_PLACES } from "@/features/design-lab/mock";
import { CATEGORY_SLUGS, categoryLabel } from "@/features/place/categories";
import { CategoryIllustration } from "@/features/place/illustrations";
import { cn } from "@/lib/utils";

const copy = designLabCopy.illustrations;

export const metadata: Metadata = { title: copy.metaTitle };

function Label({ children }: { children: React.ReactNode }) {
  return <p className="type-caption text-muted-foreground">{children}</p>;
}

function Panel({ mode }: { mode: "light" | "dark" }) {
  return (
    <section
      data-panel={mode}
      className={cn(
        "flex flex-col gap-12 rounded-[28px] border border-border bg-background px-4 py-8 text-foreground sm:px-8",
        mode === "dark" && "dark",
      )}
    >
      <Label>{mode === "light" ? copy.light : copy.dark}</Label>

      <div className="flex flex-col gap-5" data-block="card">
        <Label>{copy.cardSize}</Label>
        <ul className="grid grid-cols-3 gap-x-2 gap-y-6 sm:grid-cols-4">
          {CATEGORY_SLUGS.map((slug) => (
            <li key={slug} className="flex flex-col items-center gap-1.5">
              <CategoryIllustration slug={slug} />
              <span className="type-caption text-muted-foreground">
                {categoryLabel(slug)}
              </span>
            </li>
          ))}
        </ul>
      </div>

      <div className="flex flex-col gap-5" data-block="large">
        <Label>{copy.largeSize}</Label>
        <ul className="grid grid-cols-2 gap-4 sm:grid-cols-3">
          {CATEGORY_SLUGS.slice(0, 6).map((slug) => (
            <li key={slug} className="flex justify-center">
              <CategoryIllustration slug={slug} size={144} />
            </li>
          ))}
        </ul>
      </div>

      <div className="flex flex-col gap-5" data-block="icon">
        <Label>{copy.iconSize}</Label>
        <ul className="grid grid-cols-6 gap-y-4">
          {CATEGORY_SLUGS.map((slug) => (
            <li key={slug} className="flex justify-center">
              <CategoryIllustration slug={slug} size={40} />
            </li>
          ))}
          {CATEGORY_SLUGS.map((slug) => (
            <li key={`${slug}-32`} className="flex justify-center">
              <CategoryIllustration slug={slug} size={32} />
            </li>
          ))}
        </ul>
      </div>

      <div className="flex flex-col gap-3" data-block="list">
        <Label>{copy.listSample}</Label>
        <ul className="flex flex-col divide-y divide-border">
          {MOCK_PLACES.slice(0, 4).map((place) => (
            <li key={place.id} className="flex items-center gap-3 py-3">
              <CategoryIllustration slug={place.category} size={40} />
              <div className="flex min-w-0 flex-col">
                <span className="type-body truncate">{place.name}</span>
                <span className="type-caption text-muted-foreground">
                  {categoryLabel(place.category)}
                  <span className="mx-2 inline-block h-3 w-px translate-y-0.5 bg-border" />
                  {copy.listMeta(place.walkMinutes)}
                </span>
              </div>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}

export default function IllustrationsPage() {
  return (
    <main className="flex-1 bg-background">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-10 px-4 py-12 sm:px-6">
        <header className="flex flex-col gap-3 px-2">
          <p className="type-caption text-muted-foreground">{copy.eyebrow}</p>
          <h1 className="type-display text-balance break-keep">{copy.title}</h1>
          <p className="type-body max-w-xl text-muted-foreground">
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
