// 앱 아이콘과 스플래시 확인 화면 (T8.1 시안, D-18 선택 후 A만 남김, /design-lab/app-icon/a).
//
//   ?tone=sand|olive                          바탕 바꿔 보기 (기본 샌드, 올리브는 게이트에서 비교한 변형)
//   ?state=ready|loading|empty|error|offline  4상태를 아이콘 화면 뜻으로 옮김
//        loading  스플래시를 멈춘 채로 맨 위에 / empty  해당 없음(기본과 같음, 안내 한 줄)
//        error    maskable을 빼먹었을 때 안드로이드가 줄여 넣는 모습 / offline  오프라인 첫 화면(T8.3)의 아이콘 자리
//
// "라이트"로 이름 붙인 틀은 페이지 테마와 무관하게 늘 밝아야 해서 생성 상수(sharePalette) 색을 직접 건다.
// tokens.css에는 .light 범위 선택자가 없고 .dark만 아무 요소에 걸 수 있다(다크 틀은 .dark + 토큰).
import { Suspense } from "react";
import Link from "next/link";
import { WifiOff } from "lucide-react";
import { appIconLabCopy } from "@/copy/design-lab-app-icon";
import { shareCopy } from "@/copy/share";
import { sharePalette as P } from "@/lib/design/share-palette.generated";
import { cn } from "@/lib/utils";
import { parseDesignState, type DesignState } from "@/features/design-lab/mock";
import { DesignScope } from "@/features/design-lab/system/design-scope";
import {
  AppIconArt,
  DEFAULT_TONE,
  type IconTone,
  type IconVariant,
} from "./art";
import { PhoneFrame, SplashReplay } from "./splash-replay";

type SearchParams = Record<string, string | string[] | undefined>;

const t = appIconLabCopy.page;
const IOS_MASK = "rounded-[22.37%]";

const MASKS = {
  circle: "rounded-full",
  squircle: "rounded-[34%]",
  rounded: "rounded-[14%]",
  teardrop: "rounded-[50%_50%_14%_50%]",
} as const;

type Ctx = { variant: IconVariant; tone: IconTone };

function Section({
  id,
  title,
  body,
  children,
}: {
  id: string;
  title: string;
  body?: string;
  children: React.ReactNode;
}) {
  return (
    <section aria-labelledby={id} className="flex flex-col gap-5">
      <div className="flex max-w-[640px] flex-col gap-2">
        <h2 id={id} className="type-heading">
          {title}
        </h2>
        {body ? (
          <p className="type-body-sm text-muted-foreground">{body}</p>
        ) : null}
      </div>
      {children}
    </section>
  );
}

function Caption({ children }: { children: React.ReactNode }) {
  return <p className="type-caption text-muted-foreground">{children}</p>;
}

/* ---------- 홈 화면 ---------- */

function HomeGrid({ variant, tone, dark }: Ctx & { dark: boolean }) {
  const label = appIconLabCopy.iconLabel(appIconLabCopy.names[variant]);
  return (
    <figure className="flex flex-col gap-2">
      <div
        className={cn(
          "grid grid-cols-4 gap-x-4 gap-y-5 rounded-[28px] px-5 py-7",
          dark && "dark bg-muted text-foreground",
        )}
        style={dark ? undefined : { background: P.muted, color: P.foreground }}
      >
        {Array.from({ length: 8 }, (_, i) =>
          i === 1 ? (
            <div key={i} className="flex flex-col items-center gap-1.5">
              <span
                className={cn("overflow-hidden", IOS_MASK)}
                style={{ boxShadow: "0 1px 2px var(--overlay)" }}
              >
                <AppIconArt
                  variant={variant}
                  tone={tone}
                  size={60}
                  label={label}
                />
              </span>
              <span className="text-[11px] leading-none">
                {appIconLabCopy.appName}
              </span>
            </div>
          ) : (
            <div
              key={i}
              aria-hidden
              className="flex flex-col items-center gap-1.5"
            >
              <span
                className={cn("size-[60px] opacity-60", IOS_MASK)}
                style={{ background: dark ? "var(--border)" : P.border }}
              />
              <span
                className="h-[7px] w-10 rounded-full opacity-50"
                style={{ background: dark ? "var(--border)" : P.border }}
              />
            </div>
          ),
        )}
      </div>
      <figcaption>
        <Caption>{dark ? t.wallDark : t.wallLight}</Caption>
      </figcaption>
    </figure>
  );
}

/* ---------- 크기별 ---------- */

function Sizes({ variant, tone }: Ctx) {
  return (
    <div className="flex flex-wrap items-end gap-6">
      <figure className="flex flex-col items-start gap-2">
        {/* 512 원본을 절반 크기로: 세부 단계는 512 기준(full) */}
        <span className="flex ring-1 ring-border">
          <AppIconArt variant={variant} tone={tone} size={256} />
        </span>
        <figcaption>
          <Caption>{t.sizeLabels.s512}</Caption>
        </figcaption>
      </figure>
      <figure className="flex flex-col items-start gap-2">
        <span className="flex ring-1 ring-border">
          <AppIconArt variant={variant} tone={tone} size={192} />
        </span>
        <figcaption>
          <Caption>{t.sizeLabels.s192}</Caption>
        </figcaption>
      </figure>
      <figure className="flex flex-col items-start gap-2">
        <span
          className={cn("flex overflow-hidden ring-1 ring-border", IOS_MASK)}
        >
          <AppIconArt variant={variant} tone={tone} size={180} />
        </span>
        <figcaption>
          <Caption>{t.sizeLabels.s180}</Caption>
        </figcaption>
      </figure>
      <figure className="flex flex-col items-start gap-2">
        <span className="flex overflow-hidden rounded-full ring-1 ring-border">
          <AppIconArt variant={variant} tone={tone} size={48} />
        </span>
        <figcaption>
          <Caption>{t.sizeLabels.s48}</Caption>
        </figcaption>
      </figure>
    </div>
  );
}

/* ---------- 마스크 ---------- */

function Masks({ variant, tone }: Ctx) {
  return (
    <div className="grid grid-cols-2 gap-6 sm:grid-cols-4">
      {(Object.keys(MASKS) as (keyof typeof MASKS)[]).map((k) => (
        <figure key={k} className="flex flex-col gap-2">
          <span
            className={cn(
              "relative block size-[132px] overflow-hidden ring-1 ring-border",
              MASKS[k],
            )}
          >
            <AppIconArt variant={variant} tone={tone} size={132} />
            <span
              aria-hidden
              className="absolute inset-[10%] rounded-full border border-dashed border-destructive"
            />
          </span>
          <figcaption>
            <Caption>{t.masks[k]}</Caption>
          </figcaption>
        </figure>
      ))}
    </div>
  );
}

/* ---------- 파비콘 ---------- */

function BrowserTab({ variant, tone, dark }: Ctx & { dark: boolean }) {
  return (
    <figure className="flex flex-col gap-2">
      <div
        className={cn(
          "flex items-end gap-1 rounded-t-xl px-2 pt-2",
          dark && "dark bg-muted text-foreground",
        )}
        style={dark ? undefined : { background: P.track, color: P.foreground }}
      >
        <div
          className={cn(
            "flex h-9 w-56 items-center gap-2 rounded-t-lg px-3",
            dark && "bg-background",
          )}
          style={dark ? undefined : { background: P.card }}
        >
          <AppIconArt variant={variant} tone={tone} size={16} favicon />
          <span className="truncate text-[12px]">{t.tabTitle}</span>
        </div>
        <div className="flex h-9 items-center px-3 opacity-60">
          <AppIconArt variant={variant} tone={tone} size={16} favicon />
        </div>
      </div>
      <figcaption>
        <Caption>{dark ? t.tabDark : t.tabLight}</Caption>
      </figcaption>
    </figure>
  );
}

function Favicons(ctx: Ctx) {
  return (
    <div className="flex flex-wrap items-end gap-8">
      <BrowserTab {...ctx} dark={false} />
      <BrowserTab {...ctx} dark />
      <figure className="flex flex-col gap-2">
        <div className="flex items-end gap-4">
          <AppIconArt {...ctx} size={16} favicon />
          <AppIconArt {...ctx} size={32} favicon />
        </div>
        <figcaption>
          <Caption>
            {t.favicon16}, {t.favicon32}
          </Caption>
        </figcaption>
      </figure>
      <figure className="flex flex-col gap-2">
        <AppIconArt {...ctx} size={128} level="tiny" favicon />
        <figcaption>
          <Caption>{t.faviconZoom}</Caption>
        </figcaption>
      </figure>
    </div>
  );
}

/* ---------- OG 기호 ---------- */

/** 실제 PollOgArt 비율(1200 x 600, 위 64 좌우 88, 브랜드 28px)을 컨테이너 단위로 줄인 모형 */
function OgMock({
  variant,
  tone,
  width,
  color = false,
}: Ctx & { width?: number; color?: boolean }) {
  const u = (px: number) => `${(px / 1200) * 100}cqw`;
  return (
    <div
      aria-hidden
      className="relative aspect-[2/1] w-full overflow-hidden rounded-lg border border-border"
      style={{
        containerType: "inline-size",
        background: P.background,
        color: P.foreground,
        maxWidth: width,
      }}
    >
      <div
        className="absolute flex items-center justify-between"
        style={{ left: u(88), right: u(88), top: u(64) }}
      >
        <div className="flex items-center" style={{ gap: u(10) }}>
          <span
            className="flex"
            style={{ width: u(24), height: u(24), color: P.foreground }}
          >
            <AppIconArt
              variant={variant}
              tone={tone}
              size={24}
              level="tiny"
              mono={!color}
              favicon={color}
              className="size-full"
            />
          </span>
          <span style={{ fontSize: u(28) }}>{shareCopy.brand}</span>
        </div>
        <span style={{ fontSize: u(28), color: P.mutedForeground }}>
          {t.ogLabel}
        </span>
      </div>
      <p
        className="absolute font-heading font-light"
        style={{
          left: u(88),
          right: u(88),
          top: u(230),
          fontSize: u(84),
          lineHeight: 1.22,
          letterSpacing: "-0.02em",
        }}
      >
        {t.ogTitle}
      </p>
      <div
        className="absolute"
        style={{
          left: u(88),
          top: u(360),
          width: u(64),
          height: u(4),
          background: P.primary,
        }}
      />
    </div>
  );
}

function OgPreview(ctx: Ctx) {
  return (
    <div className="grid gap-6 desktop:grid-cols-[3fr_2fr]">
      <figure className="flex flex-col gap-2">
        <OgMock {...ctx} width={600} />
        <figcaption>
          <Caption>{t.ogFull}</Caption>
        </figcaption>
      </figure>
      <div className="flex flex-col gap-6">
        <figure className="flex flex-col gap-2">
          <OgMock {...ctx} width={260} />
          <figcaption>
            <Caption>{t.ogBubble}</Caption>
          </figcaption>
        </figure>
        <figure className="flex flex-col gap-2">
          <OgMock {...ctx} width={260} color />
          <figcaption>
            <Caption>{t.ogColor}</Caption>
          </figcaption>
        </figure>
      </div>
    </div>
  );
}

/* ---------- 스플래시 ---------- */

function IosSplash({ variant, tone, dark }: Ctx & { dark: boolean }) {
  return (
    <figure className="flex flex-col gap-2">
      <PhoneFrame
        className={cn(dark && "dark")}
        style={
          dark ? undefined : { background: P.background, color: P.foreground }
        }
      >
        <div className="flex h-full flex-col items-center justify-center gap-3">
          <span className={cn("overflow-hidden", IOS_MASK)}>
            <AppIconArt variant={variant} tone={tone} size={56} />
          </span>
        </div>
      </PhoneFrame>
      <figcaption>
        <Caption>{dark ? t.splashIosDark : t.splashIosLight}</Caption>
      </figcaption>
    </figure>
  );
}

function AndroidSplash({ variant, tone, dark }: Ctx & { dark: boolean }) {
  return (
    <figure className="flex max-w-[195px] flex-col gap-2">
      <PhoneFrame
        className={cn(dark && "dark")}
        style={
          dark ? undefined : { background: P.background, color: P.foreground }
        }
      >
        <div className="flex h-full flex-col items-center justify-center">
          <span className="overflow-hidden rounded-full">
            <AppIconArt variant={variant} tone={tone} size={64} />
          </span>
        </div>
        <p className="absolute inset-x-0 bottom-8 text-center text-[12px]">
          {appIconLabCopy.appName}
        </p>
      </PhoneFrame>
      <figcaption className="flex flex-col gap-1">
        <Caption>{dark ? t.splashAndroidDark : t.splashAndroidLight}</Caption>
        {dark ? <Caption>{t.androidDarkNote}</Caption> : null}
      </figcaption>
    </figure>
  );
}

function Splashes(ctx: Ctx) {
  return (
    <div className="flex flex-wrap gap-6">
      <IosSplash {...ctx} dark={false} />
      <IosSplash {...ctx} dark />
      <AndroidSplash {...ctx} dark={false} />
      <AndroidSplash {...ctx} dark />
    </div>
  );
}

/* ---------- 상태 ---------- */

function StateBlock({ state, ...ctx }: Ctx & { state: DesignState }) {
  if (state === "ready") return null;
  return (
    <Section id="icon-state" title={t.stateHeading} body={t.states[state]}>
      {state === "loading" ? (
        <SplashReplay {...ctx} hold />
      ) : state === "error" ? (
        <div className="flex flex-wrap gap-8">
          <figure className="flex flex-col gap-2">
            <span
              className="flex size-[132px] items-center justify-center rounded-full border border-border"
              style={{ background: P.card }}
            >
              <span className={cn("overflow-hidden", IOS_MASK)}>
                <AppIconArt {...ctx} size={88} />
              </span>
            </span>
            <figcaption>
              <Caption>{t.errorMaskable}</Caption>
            </figcaption>
          </figure>
          <figure className="flex flex-col items-start gap-2">
            <span className="overflow-hidden rounded-full">
              <AppIconArt {...ctx} size={132} />
            </span>
            <figcaption>
              <Caption>{t.errorGood}</Caption>
            </figcaption>
          </figure>
        </div>
      ) : state === "offline" ? (
        <PhoneFrame>
          <div className="flex h-full flex-col items-center justify-center gap-4 px-5 text-center">
            <span className={cn("overflow-hidden", IOS_MASK)}>
              <AppIconArt {...ctx} size={48} />
            </span>
            <div className="flex flex-col items-center gap-1.5">
              <p className="flex items-center gap-1.5 type-label">
                <WifiOff aria-hidden className="size-4" strokeWidth={1.5} />
                {t.offlineTitle}
              </p>
              <p className="type-caption text-muted-foreground">
                {t.offlineBody}
              </p>
            </div>
          </div>
        </PhoneFrame>
      ) : null}
    </Section>
  );
}

/* ---------- 화면 ---------- */

function first(raw: SearchParams, key: string) {
  const v = raw[key];
  return typeof v === "string" ? v : v?.[0];
}

async function Screen({
  variant,
  searchParams,
}: {
  variant: IconVariant;
  searchParams: Promise<SearchParams>;
}) {
  const raw = await searchParams;
  const state = parseDesignState(raw);
  const q = first(raw, "tone");
  const tone: IconTone =
    q === "sand" || q === "olive" ? q : DEFAULT_TONE[variant];
  const ctx: Ctx = { variant, tone };

  return (
    <DesignScope className="min-h-dvh flex-1 bg-background text-foreground">
      <main className="mx-auto flex w-full max-w-[1120px] flex-col gap-14 px-6 py-10 desktop:px-10">
        <header className="flex max-w-[640px] flex-col gap-3">
          <p className="type-caption text-muted-foreground">{t.eyebrow}</p>
          <div className="flex items-center gap-4">
            <span className={cn("overflow-hidden", IOS_MASK)}>
              <AppIconArt {...ctx} size={56} />
            </span>
            <h1 className="type-title">{appIconLabCopy.names[variant]}</h1>
          </div>
          <p className="type-body-sm text-muted-foreground">
            {appIconLabCopy.intents[variant]}
          </p>
          <nav
            aria-label={t.toneLabel}
            className="flex flex-wrap items-center gap-2"
          >
            {(["sand", "olive"] as const).map((k) => (
              <Link
                key={k}
                href={`?tone=${k}`}
                aria-current={k === tone ? "true" : undefined}
                className={cn(
                  "inline-flex min-h-11 items-center rounded-full border px-4 type-label",
                  k === tone
                    ? "border-foreground text-foreground"
                    : "border-input text-muted-foreground hover:text-foreground",
                )}
              >
                {t.tones[k]}
              </Link>
            ))}
          </nav>
          <Caption>{t.toneNote}</Caption>
        </header>

        {state === "empty" ? (
          <p role="status" className="type-body-sm text-muted-foreground">
            {t.states.empty}
          </p>
        ) : (
          <StateBlock state={state} {...ctx} />
        )}

        <Section id="icon-home" title={t.homeHeading} body={t.homeBody}>
          <div className="grid max-w-[760px] gap-6 sm:grid-cols-2">
            <HomeGrid {...ctx} dark={false} />
            <HomeGrid {...ctx} dark />
          </div>
        </Section>

        <Section id="icon-sizes" title={t.sizesHeading} body={t.sizesBody}>
          <Sizes {...ctx} />
        </Section>

        <Section id="icon-masks" title={t.maskHeading} body={t.maskBody}>
          <Masks {...ctx} />
        </Section>

        <Section
          id="icon-favicon"
          title={t.faviconHeading}
          body={t.faviconBody}
        >
          <Favicons {...ctx} />
        </Section>

        <Section id="icon-og" title={t.ogHeading} body={t.ogBody}>
          <OgPreview {...ctx} />
        </Section>

        <Section id="icon-splash" title={t.splashHeading} body={t.splashBody}>
          <Splashes {...ctx} />
        </Section>

        <Section id="icon-replay" title={t.replayHeading} body={t.replayBody}>
          <SplashReplay {...ctx} />
        </Section>
      </main>
    </DesignScope>
  );
}

export function AppIconLabRoute(props: {
  variant: IconVariant;
  searchParams: Promise<SearchParams>;
}) {
  return (
    <Suspense>
      <Screen {...props} />
    </Suspense>
  );
}
