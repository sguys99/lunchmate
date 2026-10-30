"use client";
// 설정 하위 화면의 하단 저장 줄 (T4.23~T4.26). 화면의 유일한 primary 면 버튼이다(DESIGN.md 5장 "버튼").
// 하단 탭 바로 위에 붙어(sticky) 엄지 영역에 남는다. 위에 오프라인, 저장 실패 안내 한 줄.
// 저장 중은 버튼 위 2px 진행 선(스피너 금지), 막혀 있으면 aria-disabled(초점은 받음).
import { CloudOff, WifiOff } from "lucide-react";
import type { ReactNode } from "react";
import { buttonClass } from "@/components/ui/button-classes";
import { meCopy } from "@/copy/me";
import { Note } from "@/features/onboarding/steps";
import { cn } from "@/lib/utils";
import type { SaveState } from "./use-settings-save";

export function SaveNotes({ state }: { state: SaveState }) {
  if (!state.online)
    return (
      <Note
        icon={WifiOff}
        live="status"
        title={meCopy.states.offline.title}
        body={meCopy.states.offline.body}
      />
    );
  if (state.error === "limit")
    return (
      <Note
        icon={CloudOff}
        live="alert"
        title={meCopy.states.limit.title}
        body={meCopy.states.limit.body}
      />
    );
  if (state.error)
    return (
      <Note
        icon={CloudOff}
        live="alert"
        title={meCopy.states.saveError.title}
        body={meCopy.states.saveError.body}
      />
    );
  return null;
}

export function SaveBar({
  state,
  onSave,
  label = meCopy.save,
  blocked = false,
  describedBy,
  children,
  className,
}: {
  state: SaveState;
  onSave: () => void;
  label?: string;
  /** 바뀐 값이 없거나 입력이 모자람 */
  blocked?: boolean;
  describedBy?: string;
  /** 버튼 아래 보조 동작(밑줄 글자 버튼) */
  children?: ReactNode;
  className?: string;
}) {
  const disabled = blocked || state.busy || !state.online;
  return (
    <div
      className={cn(
        "sticky bottom-[calc(var(--lm-layout-tab-bar-height)+env(safe-area-inset-bottom,0px))] z-[5] -mx-(--lm-layout-gutter) mt-8 flex flex-col gap-3 border-t border-border bg-background px-(--lm-layout-gutter) pt-3 pb-3 desktop:-mx-10 desktop:px-10",
        className,
      )}
    >
      <SaveNotes state={state} />
      <button
        type="button"
        aria-disabled={disabled || undefined}
        aria-busy={state.busy || undefined}
        aria-describedby={describedBy}
        onClick={() => {
          if (!disabled) onSave();
        }}
        className={cn(
          buttonClass("primary"),
          "relative w-full overflow-hidden",
        )}
      >
        {state.busy ? (
          <span
            aria-hidden
            className="absolute inset-x-0 top-0 h-0.5 bg-primary-foreground/60 motion-safe:animate-pulse"
          />
        ) : null}
        {state.busy ? meCopy.saving : label}
      </button>
      {children}
    </div>
  );
}
