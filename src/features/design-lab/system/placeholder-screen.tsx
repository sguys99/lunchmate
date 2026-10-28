"use client";
// 자리표시 화면 (T1.14). 시안 담당이 home-screen.tsx, sheet-screen.tsx를 채우면 더 이상 쓰지 않는다.
// 토큰 색, 타입, 라운드, 그림자가 실제로 바뀌는지 확인하는 최소 화면이다.
import { designLabCopy } from "@/copy/design-lab";
import { commonCopy } from "@/copy/common";
import { cn } from "@/lib/utils";
import { DesktopSplit } from "./desktop-split";
import { getHomeContent, getSheetContent } from "./states";
import { ACTIVE_TAB_BY_SCREEN, DESIGN_TABS } from "./tabs";
import type { DesignScreenId, DesignScreenProps } from "./types";

const copy = designLabCopy.placeholder;
const switcherCopy = designLabCopy.switcher;

function StateBody({
  screen,
  state,
}: Pick<DesignScreenProps, "state"> & { screen: DesignScreenId }) {
  const content =
    screen === "home" ? getHomeContent(state) : getSheetContent(state);
  switch (content.kind) {
    case "loading":
      return (
        <div
          role="status"
          aria-label={content.label}
          className="flex flex-col gap-2"
        >
          <div className="h-5 w-2/3 rounded-sm bg-skeleton" />
          <div className="h-4 w-1/2 rounded-sm bg-skeleton" />
        </div>
      );
    case "ready":
      return "picks" in content ? (
        <ul className="flex flex-col gap-1">
          {content.picks.map((p) => (
            <li key={p.id} className="type-heading">
              {p.name}
            </li>
          ))}
        </ul>
      ) : (
        <p className="type-heading">{content.place.name}</p>
      );
    case "empty":
      if ("message" in content) {
        return (
          <>
            <p className="type-heading">{content.place.name}</p>
            <p className="type-body-sm text-muted-foreground">
              {content.message}
            </p>
          </>
        );
      }
      return <MessageBody {...content} />;
    case "error":
    case "offline":
      return <MessageBody {...content} />;
  }
}

function MessageBody({
  title,
  body,
  action,
}: {
  title: string;
  body: string;
  action: string;
}) {
  return (
    <>
      <p className="type-heading">{title}</p>
      <p className="type-body-sm text-muted-foreground">{body}</p>
      <button
        type="button"
        className="mt-2 h-11 self-start rounded-button bg-primary px-5 type-label text-primary-foreground"
      >
        {action}
      </button>
    </>
  );
}

export function PlaceholderScreen({
  screen,
  state,
  tokens,
}: DesignScreenProps & { screen: DesignScreenId }) {
  const active = ACTIVE_TAB_BY_SCREEN[screen];
  return (
    <div className="flex flex-1 flex-col">
      <DesktopSplit
        list={
          <div className="mx-auto flex w-full max-w-(--lm-layout-max-width) flex-1 flex-col gap-4 px-(--lm-layout-gutter) py-8">
            <p className="type-caption text-muted-foreground">
              {copy.eyebrow(
                tokens.meta.id.toUpperCase(),
                switcherCopy.screens[screen],
              )}
            </p>
            <h1 className="type-title">{tokens.meta.name}</h1>
            <p className="type-body-sm text-muted-foreground">
              {tokens.meta.concept}
            </p>
            <section className="flex flex-col gap-2 rounded-card bg-card p-5 text-card-foreground shadow-md">
              <span className="self-start rounded-chip bg-accent px-3 py-1 type-caption text-accent-foreground">
                {copy.stateLabel(switcherCopy.states[state])}
              </span>
              <StateBody screen={screen} state={state} />
            </section>
            <p className="type-caption text-muted-foreground">{copy.body}</p>
          </div>
        }
      />
      <nav
        aria-label={commonCopy.tabBarLabel}
        className="sticky bottom-0 grid h-(--lm-layout-tab-bar-height) shrink-0 grid-cols-4 border-t border-border bg-background"
      >
        {DESIGN_TABS.map(({ id, label, Icon }) => (
          <button
            key={id}
            type="button"
            aria-current={id === active ? "page" : undefined}
            className={cn(
              "flex flex-col items-center justify-center gap-1 type-caption",
              id === active ? "text-primary" : "text-muted-foreground",
            )}
          >
            <Icon aria-hidden className="size-5" />
            {label}
          </button>
        ))}
      </nav>
    </div>
  );
}
