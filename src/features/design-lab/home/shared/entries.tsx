// 홈 하단 진입점 (REC-10, T3.1): 친구랑 정하기, 회식 모드. 목업이라 이동하지 않는다.
// layout
// - rows: 헤어라인으로 나눈 두 줄(라벨 + 한 줄 설명 + 화살표). 조용한 목록
// - pills: 테두리 알약 두 개를 나란히. 높이 48
import { ChevronRight, UsersRound, Wine } from "lucide-react";
import { focusRing, pressMotion } from "@/components/ui/interaction";
import { designLabHomeCopy } from "@/copy/design-lab-home";
import { cn } from "@/lib/utils";

const copy = designLabHomeCopy.screen;

const ENTRIES = [
  {
    key: "poll",
    label: copy.actions.pollWithFriends,
    body: copy.entries.poll,
    Icon: UsersRound,
  },
  {
    key: "party",
    label: copy.actions.party,
    body: copy.entries.party,
    Icon: Wine,
  },
] as const;

export function EntryLinks({
  layout = "rows",
  className,
}: {
  layout?: "rows" | "pills";
  className?: string;
}) {
  if (layout === "pills") {
    return (
      <nav aria-label={copy.entries.label} className={className}>
        <ul className="grid grid-cols-2 gap-2">
          {ENTRIES.map(({ key, label, Icon }) => (
            <li key={key} className="flex">
              <button
                type="button"
                data-entry={key}
                className={cn(
                  "inline-flex h-12 flex-1 items-center justify-center gap-2 rounded-button border border-border px-3 type-label whitespace-nowrap text-foreground hover:bg-muted",
                  pressMotion,
                  focusRing,
                )}
              >
                <Icon
                  aria-hidden
                  className="size-4 text-muted-foreground"
                  strokeWidth={1.5}
                />
                {label}
              </button>
            </li>
          ))}
        </ul>
      </nav>
    );
  }
  return (
    <nav aria-label={copy.entries.label} className={className}>
      <ul className="flex flex-col border-t border-border">
        {ENTRIES.map(({ key, label, body, Icon }) => (
          <li key={key} className="border-b border-border">
            <button
              type="button"
              data-entry={key}
              className={cn(
                "group flex min-h-16 w-full items-center gap-4 py-3 text-left",
                focusRing,
              )}
            >
              <Icon
                aria-hidden
                className="size-5 shrink-0 text-muted-foreground"
                strokeWidth={1.5}
              />
              <span className="flex min-w-0 flex-1 flex-col gap-0.5">
                <span className="type-label">{label}</span>
                <span className="truncate type-caption text-muted-foreground">
                  {body}
                </span>
              </span>
              <ChevronRight
                aria-hidden
                className="size-4 shrink-0 text-muted-foreground transition-transform duration-(--lm-duration-fast) ease-standard group-hover:translate-x-0.5 motion-reduce:transition-none"
                strokeWidth={1.5}
              />
            </button>
          </li>
        ))}
      </ul>
    </nav>
  );
}
