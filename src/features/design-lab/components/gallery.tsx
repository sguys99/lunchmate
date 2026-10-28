"use client";
// /design-lab/components 컴포넌트 갤러리 (T2.5 초안, T2.10 완성).
// 모든 공통 컴포넌트와 상태를 한 페이지에서 본다. 시각 회귀(T2.16)와 axe 검사(T2.17)의 기준 페이지다.
//
// - 보기 설정(테마, 모션, 정지)은 쿼리로 고정할 수 있다(params.ts). 페이지 안 막대로 바꾸면 쿼리도 바뀐다(리로드 없음).
// - 테마: <html>에 .light/.dark를 건다(useRootTheme, 포털로 뜨는 대화상자와 토스트까지 따른다).
//   첫 렌더부터 다크가 보이도록 theme=dark면 갤러리 루트에도 .dark를 건다(서버 렌더 결정성).
// - 모션: motion=reduce면 MotionProvider preference="reduce"(Motion 프리셋)와 CSS 전환, 애니메이션 0초.
//   CSS의 motion-reduce: 변형은 OS 설정만 보므로 앱 설정을 흉내 내려면 아래 MOTION_CSS가 필요하다.
//   static=1이면 무한 반복 애니메이션(스켈레톤 호흡)까지 없애고 캐럿도 숨긴다(결정적 스냅샷용).
//   속성은 갤러리 루트와 <html> 둘 다에 둔다. 루트는 서버 렌더부터, <html>은 포털까지 덮는다.
import Link from "next/link";
import { useEffect, useState } from "react";
import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { designLabComponentsCopy as copy } from "@/copy/design-lab-components";
import { useRootTheme } from "@/features/design-lab/system/design-scope";
import { MotionProvider } from "@/lib/motion";
import { cn } from "@/lib/utils";
import {
  GALLERY_MOTIONS,
  GALLERY_THEMES,
  effectiveMotion,
  serializeGalleryOptions,
  type GalleryOptions,
} from "./params";
import { GALLERY_SECTIONS, GallerySections } from "./sections";

const t = copy.toolbar;

/** 앱 설정 "줄이기"와 정지 모드를 CSS 전환과 애니메이션에도 적용한다 (색 없음, 시간 값만) */
const MOTION_CSS = `
[data-gallery-motion="reduce"] *, [data-gallery-motion="reduce"] *::before, [data-gallery-motion="reduce"] *::after {
  animation-duration: 0s !important; animation-iteration-count: 1 !important; animation-delay: 0s !important;
  transition-duration: 0s !important; transition-delay: 0s !important; scroll-behavior: auto !important;
}
[data-gallery-motion="static"] *, [data-gallery-motion="static"] *::before, [data-gallery-motion="static"] *::after {
  animation: none !important; transition: none !important; scroll-behavior: auto !important; caret-color: transparent !important;
}`;

/** <html>에 모션 단계를 건다. 포털(대화상자, 시트, 토스트)도 같은 규칙을 받게 하려는 것이다 */
function useRootMotion(motion: string) {
  useEffect(() => {
    const root = document.documentElement;
    root.dataset.galleryMotion = motion;
    return () => {
      delete root.dataset.galleryMotion;
    };
  }, [motion]);
}

type Option<T extends string> = { value: T; label: string };

function Segmented<T extends string>({
  label,
  options,
  value,
  onChange,
}: {
  label: string;
  options: readonly Option<T>[];
  value: T;
  onChange: (value: T) => void;
}) {
  return (
    <div role="group" aria-label={label} className="flex items-center gap-3">
      <span aria-hidden className="w-8 type-caption text-muted-foreground">
        {label}
      </span>
      <div className="flex rounded-chip border border-border p-0.5">
        {options.map((o) => {
          const active = o.value === value;
          return (
            <button
              key={o.value}
              type="button"
              aria-pressed={active}
              onClick={() => onChange(o.value)}
              className={cn(
                "h-10 min-w-12 rounded-chip px-3.5 type-caption whitespace-nowrap",
                "transition-colors duration-(--lm-duration-fast) ease-standard motion-reduce:transition-none",
                "outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring focus-visible:outline-solid",
                active
                  ? "bg-foreground text-background"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              {o.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}

const THEME_OPTIONS = GALLERY_THEMES.map((value) => ({
  value,
  label: t.themes[value],
}));
const MOTION_OPTIONS = GALLERY_MOTIONS.map((value) => ({
  value,
  label: t.motions[value],
}));
const STILL_OPTIONS = [
  { value: "off", label: t.stills.off },
  { value: "on", label: t.stills.on },
] as const;

export function ComponentsGallery({ initial }: { initial: GalleryOptions }) {
  const [options, setOptions] = useState(initial);
  const motion = effectiveMotion(options);
  useRootTheme(options.theme);
  useRootMotion(motion);

  const update = (patch: Partial<GalleryOptions>) => {
    const next = { ...options, ...patch };
    setOptions(next);
    const qs = serializeGalleryOptions(next);
    const { pathname, hash } = window.location;
    window.history.replaceState(
      null,
      "",
      `${pathname}${qs ? `?${qs}` : ""}${hash}`,
    );
  };

  return (
    <div
      data-gallery-root
      data-gallery-motion={motion}
      data-gallery-theme={options.theme}
      className={cn(
        "flex flex-1 flex-col bg-background text-foreground",
        options.theme === "dark" && "dark",
      )}
    >
      <style>{MOTION_CSS}</style>
      <MotionProvider preference={motion === "system" ? "system" : "reduce"}>
        <TooltipProvider>
          <main className="mx-auto flex w-full max-w-6xl flex-col gap-14 px-6 pt-12 pb-24 lg:px-10 lg:pt-16">
            <header className="flex flex-col gap-8">
              <div className="flex flex-col gap-3">
                <Link
                  href="/design-lab"
                  className="w-fit type-caption text-muted-foreground underline-offset-4 hover:text-foreground hover:underline"
                >
                  {copy.backToLab}
                </Link>
                <h1 className="type-display break-keep">{copy.title}</h1>
                <p className="max-w-xl type-body break-keep text-muted-foreground">
                  {copy.description}
                </p>
              </div>
              <div
                role="toolbar"
                aria-label={t.label}
                className="flex flex-wrap gap-x-8 gap-y-3"
              >
                <Segmented
                  label={t.theme}
                  options={THEME_OPTIONS}
                  value={options.theme}
                  onChange={(theme) => update({ theme })}
                />
                <Segmented
                  label={t.motion}
                  options={MOTION_OPTIONS}
                  value={options.motion}
                  onChange={(m) => update({ motion: m })}
                />
                <Segmented
                  label={t.still}
                  options={STILL_OPTIONS}
                  value={options.still ? "on" : "off"}
                  onChange={(v) => update({ still: v === "on" })}
                />
              </div>
              <p className="type-caption text-muted-foreground">
                {copy.queryHint}
              </p>
            </header>

            <div className="flex flex-col gap-10 lg:grid lg:grid-cols-[11rem_minmax(0,1fr)] lg:gap-16">
              <nav
                aria-label={copy.tocLabel}
                className="-mx-6 overflow-x-auto px-6 lg:sticky lg:top-10 lg:mx-0 lg:self-start lg:overflow-visible lg:px-0"
              >
                <ol className="flex gap-5 whitespace-nowrap lg:flex-col lg:gap-1">
                  {GALLERY_SECTIONS.map(({ id }, i) => (
                    <li key={id}>
                      <a
                        href={`#${id}`}
                        className="flex min-h-11 items-center gap-3 type-caption text-muted-foreground outline-none hover:text-foreground focus-visible:outline-2 focus-visible:outline-ring focus-visible:outline-solid lg:min-h-9"
                      >
                        <span aria-hidden className="tabular-nums">
                          {String(i + 1).padStart(2, "0")}
                        </span>
                        {copy.sections[id].title}
                      </a>
                    </li>
                  ))}
                </ol>
              </nav>
              <div className="flex min-w-0 flex-col gap-16">
                <GallerySections />
              </div>
            </div>
          </main>
          <Toaster />
        </TooltipProvider>
      </MotionProvider>
    </div>
  );
}
