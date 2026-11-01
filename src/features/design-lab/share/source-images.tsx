"use client";
// 서버 OG 원본 이미지와 안전 영역 선 (T7.4 시안).
// 2:1(1200 x 600)을 다른 서비스가 1.91:1로 자르면 좌우 약 27px씩 잘린다. 그 경계와 가운데 1:1 영역을 점선으로 겹쳐 본다.
import { useState } from "react";
import { shareLabCopy } from "@/copy/design-lab-share";
import { Skeleton } from "@/components/ui/skeleton";

const t = shareLabCopy.page;

export type SourceImage = { src: string; alt: string; caption: string };

export function SourceImages({
  images,
  loading,
  initialSafe,
}: {
  images: readonly SourceImage[];
  loading: boolean;
  initialSafe: boolean;
}) {
  const [safe, setSafe] = useState(initialSafe);
  return (
    <div className="flex flex-col gap-5">
      <button
        type="button"
        aria-pressed={safe}
        onClick={() => setSafe((v) => !v)}
        className="self-start rounded-chip border border-border px-4 py-2 type-label focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring aria-pressed:border-primary aria-pressed:text-primary"
      >
        {t.safeToggle}
      </button>
      <div className="grid gap-6 desktop:grid-cols-2">
        {images.map((img) => (
          <figure key={img.caption} className="flex flex-col gap-2">
            <div className="relative overflow-hidden rounded-md border border-border">
              {loading ? (
                <Skeleton className="aspect-[2/1] w-full" />
              ) : (
                // 시안 라우트가 그린 PNG. 실제 화면에서는 og:image 메타로만 쓴다
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={img.src}
                  alt={img.alt}
                  width={1200}
                  height={600}
                  className="block aspect-[2/1] w-full"
                />
              )}
              {safe && !loading ? (
                <div
                  aria-hidden
                  className="pointer-events-none absolute inset-0"
                >
                  <div className="absolute inset-y-0 right-[2.25%] left-[2.25%] border-x border-dashed border-destructive" />
                  <div className="absolute inset-y-0 right-1/4 left-1/4 border-x border-dashed border-info" />
                </div>
              ) : null}
            </div>
            <figcaption className="type-caption text-muted-foreground">
              {img.caption}
            </figcaption>
          </figure>
        ))}
      </div>
      <div className="flex flex-col gap-2">
        <h3 className="type-label">{t.smallHeading}</h3>
        <p className="type-body-sm text-muted-foreground">{t.smallBody}</p>
        <div className="flex flex-wrap gap-4">
          {images.map((img) =>
            loading ? (
              <Skeleton
                key={img.caption}
                className="h-[130px] w-[260px] rounded-sm"
              />
            ) : (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                key={img.caption}
                src={img.src}
                alt=""
                width={260}
                height={130}
                className="rounded-sm border border-border"
              />
            ),
          )}
        </div>
      </div>
    </div>
  );
}
