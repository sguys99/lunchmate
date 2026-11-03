"use client";
// 이름표 알약 (T10.15, D-33 시안 B). 상세 이름 바로 아래(md)와 나 탭 즐겨찾기 둘째 줄(sm).
// - 메모가 있으면 테두리 알약에 메모 아이콘 + 글(한 줄 말줄임), 없으면 점선 "메모 남기기".
// - 누르면 작은 시트(memo-sheet). 오프라인이면 aria-disabled(누르면 아무 일 없음, 안내 한 줄은 부르는 쪽).
// - 터치 영역: 보이는 높이 32(sm 24)에 위아래 투명 영역을 더해 44 이상.
// - 스크린 리더 이름: "내 메모 <글>, <식당> 메모 고치기" 또는 "<식당> 메모 남기기".
import { Plus, StickyNote } from "lucide-react";
import { focusRing } from "@/components/ui/interaction";
import { memoCopy as copy } from "@/copy/memo";
import { cn } from "@/lib/utils";

export function NameTag({
  memo,
  name,
  onOpen,
  onPreload,
  disabled,
  size = "md",
  className,
}: {
  memo: string | null;
  /** 스크린 리더 이름에 쓰는 식당 이름(모르면 "이 식당") */
  name: string;
  onOpen: (el: HTMLElement) => void;
  onPreload?: () => void;
  disabled?: boolean;
  size?: "md" | "sm";
  className?: string;
}) {
  const Icon = memo ? StickyNote : Plus;
  return (
    <button
      type="button"
      onClick={(e) => {
        if (!disabled) onOpen(e.currentTarget);
      }}
      onPointerEnter={onPreload}
      onFocus={onPreload}
      aria-label={memo ? copy.tagLabel(memo, name) : copy.addLabel(name)}
      aria-disabled={disabled || undefined}
      className={cn(
        "relative inline-flex w-fit max-w-full items-center gap-1.5 rounded-chip border text-left transition-colors duration-(--lm-duration-fast) ease-standard hover:bg-muted active:bg-muted aria-disabled:opacity-60 aria-disabled:hover:bg-transparent motion-reduce:transition-none",
        "after:absolute after:inset-x-0 after:content-['']",
        size === "md"
          ? "min-h-8 px-3 type-body-sm after:-inset-y-1.5"
          : "min-h-6 px-2 type-caption after:-inset-y-2.5",
        memo
          ? "border-input text-foreground"
          : "border-dashed border-border text-muted-foreground",
        focusRing,
        className,
      )}
    >
      <Icon
        aria-hidden
        className={cn(
          "shrink-0 text-muted-foreground",
          size === "md" ? "size-4" : "size-3",
        )}
        strokeWidth={1.5}
      />
      <span className="truncate">{memo ?? copy.add}</span>
    </button>
  );
}

/** 이름표 자리 스켈레톤(메모는 우리 DB 값이라 이름과 따로 온다) */
export function NameTagSkeleton({ size = "md" }: { size?: "md" | "sm" }) {
  return (
    <span
      role="status"
      aria-busy
      aria-label={copy.states.loading}
      className={cn(
        "block rounded-chip bg-skeleton",
        size === "md" ? "h-8 w-44" : "h-6 w-28",
      )}
    />
  );
}

/** 저장 결과 한 줄(스크린 리더에도 읽힘). 4px 위로 페이드, 축소 모드는 즉시 */
export function SavedLine({
  text,
  className,
}: {
  text: string;
  className?: string;
}) {
  return (
    <span
      role="status"
      className={cn(
        "type-caption text-muted-foreground",
        text
          ? "motion-safe:animate-in motion-safe:fade-in-0 motion-safe:[animation-duration:var(--lm-duration-slow)] motion-safe:slide-in-from-bottom-1"
          : "sr-only",
        className,
      )}
    >
      {text}
    </span>
  );
}
