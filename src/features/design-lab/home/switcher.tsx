"use client";
// /design-lab/home/compare: 홈 시안 비교 스위처 (T3.1). G1 스위처(system/switcher.tsx)와 같은 틀(ScreenViewport, DesignScope)을 쓴다.
// 쿼리: ?v=a&state=ready&theme=system&view=frame&reduce=1 (기본값은 생략). 리로드 없이 바꾸고 주소에 남긴다.
// 모션 줄이기는 MotionProvider preference="reduce"로 넘겨 OS 설정을 바꾸지 않고 축소 모드를 본다.
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useCallback, useEffect } from "react";
import { designLabCopy } from "@/copy/design-lab";
import { designLabHomeCopy } from "@/copy/design-lab-home";
import { DESIGN_STATES, type DesignState } from "@/features/design-lab/mock";
import {
  DesignScope,
  useRootTheme,
} from "@/features/design-lab/system/design-scope";
import { ScreenViewport } from "@/features/design-lab/system/screen-viewport";
import { cycleState } from "@/features/design-lab/system/switcher-params";
import {
  DESIGN_THEMES,
  SCREEN_VIEWS,
  type DesignTheme,
  type ScreenView,
} from "@/features/design-lab/system/types";
import { MotionProvider } from "@/lib/motion";
import { cn } from "@/lib/utils";
import { HOME_VARIANTS } from "./registry";
import { HOME_VARIANT_IDS, type HomeVariantId } from "./types";

type Option<T extends string> = { value: T; label: string; title?: string };

/** G1 스위처(system/switcher.tsx)와 같은 모양의 분할 버튼 */
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
    <div role="group" aria-label={label} className="flex items-center gap-1.5">
      <span className="text-[0.6875rem] font-medium text-muted-foreground">
        {label}
      </span>
      <div className="flex rounded-md border border-border p-0.5">
        {options.map((o) => (
          <button
            key={o.value}
            type="button"
            title={o.title}
            aria-pressed={o.value === value}
            onClick={() => onChange(o.value)}
            className={cn(
              "h-7 min-w-7 rounded-sm px-2 text-xs font-medium whitespace-nowrap transition-colors outline-none focus-visible:ring-2 focus-visible:ring-ring",
              o.value === value
                ? "bg-foreground text-background"
                : "text-muted-foreground hover:text-foreground",
            )}
          >
            {o.label}
          </button>
        ))}
      </div>
    </div>
  );
}

function isTypingTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  return (
    target.isContentEditable ||
    ["INPUT", "TEXTAREA", "SELECT"].includes(target.tagName)
  );
}

const copy = designLabHomeCopy.switcher;
const systemCopy = designLabCopy.switcher;

type Selection = {
  v: HomeVariantId;
  state: DesignState;
  theme: DesignTheme;
  view: ScreenView;
  reduce: boolean;
};

const DEFAULTS: Selection = {
  v: "a",
  state: "ready",
  theme: "system",
  view: "frame",
  reduce: false,
};

function pick<T extends string>(
  options: readonly T[],
  value: string | null,
  fallback: T,
): T {
  return value !== null && (options as readonly string[]).includes(value)
    ? (value as T)
    : fallback;
}

function parse(params: URLSearchParams): Selection {
  return {
    v: pick(HOME_VARIANT_IDS, params.get("v"), DEFAULTS.v),
    state: pick(DESIGN_STATES, params.get("state"), DEFAULTS.state),
    theme: pick(DESIGN_THEMES, params.get("theme"), DEFAULTS.theme),
    view: pick(SCREEN_VIEWS, params.get("view"), DEFAULTS.view),
    reduce: params.get("reduce") === "1",
  };
}

function serialize(sel: Selection): string {
  const params = new URLSearchParams();
  if (sel.v !== DEFAULTS.v) params.set("v", sel.v);
  if (sel.state !== DEFAULTS.state) params.set("state", sel.state);
  if (sel.theme !== DEFAULTS.theme) params.set("theme", sel.theme);
  if (sel.view !== DEFAULTS.view) params.set("view", sel.view);
  if (sel.reduce) params.set("reduce", "1");
  return params.toString();
}

function standaloneHref(sel: Selection): string {
  const base = `/design-lab/home/${sel.v}`;
  return sel.state === "ready" ? base : `${base}?state=${sel.state}`;
}

export function HomeSwitcher() {
  const searchParams = useSearchParams();
  const sel = parse(new URLSearchParams(searchParams.toString()));
  useRootTheme(sel.theme);

  const update = useCallback((patch: Partial<Selection>) => {
    const current = parse(new URLSearchParams(window.location.search));
    const qs = serialize({ ...current, ...patch });
    window.history.replaceState(
      null,
      "",
      qs ? `?${qs}` : window.location.pathname,
    );
  }, []);

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (e.metaKey || e.ctrlKey || e.altKey || isTypingTarget(e.target))
        return;
      const current = parse(new URLSearchParams(window.location.search));
      const key = e.key.toLowerCase();
      const variant = HOME_VARIANT_IDS[Number.parseInt(key, 10) - 1];
      if (variant) update({ v: variant });
      else if (key === "[") update({ state: cycleState(current.state, -1) });
      else if (key === "]") update({ state: cycleState(current.state, 1) });
      else if (key === "o") update({ theme: "system" });
      else if (key === "l") update({ theme: "light" });
      else if (key === "d") update({ theme: "dark" });
      else if (key === "f")
        update({ view: current.view === "frame" ? "full" : "frame" });
      else if (key === "m") update({ reduce: !current.reduce });
      else return;
      e.preventDefault();
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [update]);

  const Home = HOME_VARIANTS[sel.v];
  const frame = sel.view === "frame";

  return (
    <div className="flex h-dvh flex-col bg-muted text-foreground">
      <header
        aria-label={copy.toolbarLabel}
        className="flex shrink-0 flex-wrap items-center gap-x-4 gap-y-2 border-b border-border bg-background px-4 py-2"
      >
        <Segmented
          label={copy.groups.variant}
          value={sel.v}
          onChange={(v) => update({ v })}
          options={HOME_VARIANT_IDS.map((id) => ({
            value: id,
            label: id.toUpperCase(),
            title: designLabHomeCopy.variants[id].name,
          }))}
        />
        <span className="text-xs font-medium">
          {designLabHomeCopy.variants[sel.v].name}
        </span>
        <Segmented
          label={copy.groups.state}
          value={sel.state}
          onChange={(state) => update({ state })}
          options={DESIGN_STATES.map((id) => ({
            value: id,
            label: systemCopy.states[id],
          }))}
        />
        <Segmented
          label={copy.groups.theme}
          value={sel.theme}
          onChange={(theme) => update({ theme })}
          options={DESIGN_THEMES.map((id) => ({
            value: id,
            label: systemCopy.themes[id],
          }))}
        />
        <Segmented
          label={copy.groups.view}
          value={sel.view}
          onChange={(view) => update({ view })}
          options={SCREEN_VIEWS.map((id) => ({
            value: id,
            label: systemCopy.views[id],
          }))}
        />
        <button
          type="button"
          aria-pressed={sel.reduce}
          onClick={() => update({ reduce: !sel.reduce })}
          className={cn(
            "h-7 rounded-md border border-border px-2 text-xs font-medium outline-none focus-visible:ring-2 focus-visible:ring-ring",
            sel.reduce
              ? "bg-foreground text-background"
              : "text-muted-foreground hover:text-foreground",
          )}
        >
          {copy.reduce}
        </button>
        <Link
          href={standaloneHref(sel)}
          target="_blank"
          className="text-xs font-medium text-muted-foreground underline underline-offset-4 hover:text-foreground"
        >
          {systemCopy.openStandalone}
        </Link>
        <p className="ml-auto hidden text-[0.6875rem] text-muted-foreground lg:block">
          {copy.shortcuts}
        </p>
      </header>

      <div
        className={cn(
          "flex min-h-0 flex-1 overflow-auto",
          frame && "items-start justify-center p-6",
        )}
      >
        <ScreenViewport view={sel.view}>
          <DesignScope className="h-full overflow-y-auto">
            <MotionProvider preference={sel.reduce ? "reduce" : "system"}>
              {/* 시안이나 상태를 바꾸면 화면 상태(넘긴 카드, 회차)를 처음부터 */}
              <Home key={`${sel.v}-${sel.state}`} state={sel.state} />
            </MotionProvider>
          </DesignScope>
        </ScreenViewport>
      </div>
    </div>
  );
}
