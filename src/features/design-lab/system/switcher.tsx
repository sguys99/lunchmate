"use client";
// /design-lab/system 시안 스위처 (T1.14).
// 같은 페이지에서 화면, 상태, 테마, 보기를 바로 바꾼다(리로드 없음). 선택값은 URL 쿼리에 남긴다.
// G1 확정 후(T1.20) 토큰은 루트 tokens.css 하나라 컨트롤 바와 화면이 같은 토큰을 쓴다.
// 시안 선택 그룹은 DESIGN_IDS가 2개 이상일 때만 보인다(G3 홈 시안에서 재사용).
// 테마 강제는 <html> 클래스로 건다(useRootTheme). 컨트롤 바도 함께 바뀐다.
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useCallback, useEffect } from "react";
import { designLabCopy } from "@/copy/design-lab";
import { DESIGN_STATES } from "@/features/design-lab/mock";
import { cn } from "@/lib/utils";
import { DesignScope, useRootTheme } from "./design-scope";
import { DESIGN_SCREENS } from "./registry";
import { ScreenViewport } from "./screen-viewport";
import {
  cycleState,
  parseSelection,
  serializeSelection,
  standaloneHref,
  type SwitcherSelection,
} from "./switcher-params";
import {
  DESIGN_IDS,
  DESIGN_SCREEN_IDS,
  DESIGN_THEMES,
  SCREEN_VIEWS,
  type DesignScreenTokens,
} from "./types";

const copy = designLabCopy.switcher;

type Option<T extends string> = { value: T; label: string; title?: string };

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

const MULTI_DESIGN = DESIGN_IDS.length > 1;

export function DesignSwitcher({ tokens }: { tokens: DesignScreenTokens }) {
  const searchParams = useSearchParams();
  const sel = parseSelection(searchParams);
  useRootTheme(sel.theme);

  // 현재 주소를 기준으로 고친다(키보드 핸들러가 오래된 sel을 잡지 않게).
  // history.replaceState는 Next가 useSearchParams와 동기화한다. 서버 왕복 없이 즉시 바뀐다.
  const update = useCallback((patch: Partial<SwitcherSelection>) => {
    const current = parseSelection(new URLSearchParams(window.location.search));
    const qs = serializeSelection({ ...current, ...patch });
    window.history.replaceState(
      null,
      "",
      qs ? `?${qs}` : window.location.pathname,
    );
  }, []);

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (e.metaKey || e.ctrlKey || e.altKey || isTypingTarget(e.target)) {
        return;
      }
      const current = parseSelection(
        new URLSearchParams(window.location.search),
      );
      const key = e.key.toLowerCase();
      const design = MULTI_DESIGN
        ? DESIGN_IDS[Number.parseInt(key, 10) - 1]
        : undefined;
      if (design) update({ design });
      else if (key === "h") update({ screen: "home" });
      else if (key === "s") update({ screen: "sheet" });
      else if (key === "[") update({ state: cycleState(current.state, -1) });
      else if (key === "]") update({ state: cycleState(current.state, 1) });
      else if (key === "o") update({ theme: "system" });
      else if (key === "l") update({ theme: "light" });
      else if (key === "d") update({ theme: "dark" });
      else if (key === "f")
        update({ view: current.view === "frame" ? "full" : "frame" });
      else return;
      e.preventDefault();
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [update]);

  const Screen = DESIGN_SCREENS[sel.design][sel.screen];
  const frame = sel.view === "frame";

  return (
    <div className="flex h-dvh flex-col bg-muted text-foreground">
      <header
        aria-label={copy.toolbarLabel}
        className="flex shrink-0 flex-wrap items-center gap-x-4 gap-y-2 border-b border-border bg-background px-4 py-2"
      >
        {MULTI_DESIGN ? (
          <Segmented
            label={copy.groups.design}
            value={sel.design}
            onChange={(design) => update({ design })}
            options={DESIGN_IDS.map((id) => ({
              value: id,
              label: id.toUpperCase(),
            }))}
          />
        ) : null}
        <span className="text-xs font-medium">
          {copy.finalLabel(tokens.meta.name)}
        </span>
        <Segmented
          label={copy.groups.screen}
          value={sel.screen}
          onChange={(screen) => update({ screen })}
          options={DESIGN_SCREEN_IDS.map((id) => ({
            value: id,
            label: copy.screens[id],
          }))}
        />
        <Segmented
          label={copy.groups.state}
          value={sel.state}
          onChange={(state) => update({ state })}
          options={DESIGN_STATES.map((id) => ({
            value: id,
            label: copy.states[id],
          }))}
        />
        <Segmented
          label={copy.groups.theme}
          value={sel.theme}
          onChange={(theme) => update({ theme })}
          options={DESIGN_THEMES.map((id) => ({
            value: id,
            label: copy.themes[id],
          }))}
        />
        <Segmented
          label={copy.groups.view}
          value={sel.view}
          onChange={(view) => update({ view })}
          options={SCREEN_VIEWS.map((id) => ({
            value: id,
            label: copy.views[id],
          }))}
        />
        <Link
          href={standaloneHref(sel)}
          target="_blank"
          className="text-xs font-medium text-muted-foreground underline underline-offset-4 hover:text-foreground"
        >
          {copy.openStandalone}
        </Link>
        <p className="ml-auto hidden text-[0.6875rem] text-muted-foreground lg:block">
          {MULTI_DESIGN ? copy.shortcutsMulti : copy.shortcuts}
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
            <Screen state={sel.state} tokens={tokens} />
          </DesignScope>
        </ScreenViewport>
      </div>
    </div>
  );
}
