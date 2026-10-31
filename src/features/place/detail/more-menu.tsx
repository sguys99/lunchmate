"use client";
// 상세 하단 고정 줄의 "더 보기" 메뉴 (T5.35 PLACE-04, PLACE-05 진입점, D-10).
// Base UI Menu: 화살표 키 이동, Esc와 바깥 누르면 닫힘, 닫히면 트리거로 포커스 복귀. 열림 fast 페이드 + 4px, 축소 모드면 즉시.
// 시트(z-50) 위에 떠야 해서 포지셔너를 z-[60]에 둔다. 홈 큰 카드의 더 보기(T5.20)도 이 메뉴를 쓴다.
import { Menu } from "@base-ui/react/menu";
import { ExternalLink, MoreHorizontal, type LucideIcon } from "lucide-react";
import type { ReactNode } from "react";
import { placeCopy } from "@/copy/place";
import { cn } from "@/lib/utils";

const copy = placeCopy;

export type MoreMenuAction =
  | {
      key: string;
      label: string;
      icon: LucideIcon;
      href: string;
      external?: boolean;
      disabled?: boolean;
    }
  | {
      key: string;
      label: string;
      icon: LucideIcon;
      onSelect: () => void;
      disabled?: boolean;
    };

const itemClass = cn(
  "flex min-h-12 w-full cursor-default items-center gap-3 rounded-lg px-3 text-left type-body-sm text-foreground outline-none select-none",
  "data-highlighted:bg-muted data-disabled:opacity-50",
);

function Item({ action }: { action: MoreMenuAction }) {
  const body: ReactNode = (
    <>
      <action.icon
        aria-hidden
        className="size-4 shrink-0 text-muted-foreground"
        strokeWidth={1.5}
      />
      <span className="min-w-0 flex-1">{action.label}</span>
      {"href" in action && action.external ? (
        <ExternalLink
          aria-hidden
          className="size-3.5 shrink-0 text-muted-foreground"
          strokeWidth={1.5}
        />
      ) : null}
    </>
  );
  if ("href" in action) {
    return (
      <Menu.LinkItem
        href={action.href}
        target={action.external ? "_blank" : undefined}
        rel={action.external ? "noopener noreferrer" : undefined}
        className={itemClass}
      >
        {body}
      </Menu.LinkItem>
    );
  }
  return (
    <Menu.Item
      disabled={action.disabled}
      onClick={action.onSelect}
      className={itemClass}
    >
      {body}
    </Menu.Item>
  );
}

export function PlaceMoreMenu({
  actions,
  reports,
  triggerClassName,
  label = copy.actions.more,
  iconClassName = "size-5",
  side = "top",
  defaultOpen,
}: {
  actions: readonly MoreMenuAction[];
  /** 제보 3종 (PLACE-05). 비우면 묶음을 그리지 않는다 */
  reports: readonly MoreMenuAction[];
  triggerClassName: string;
  /** 트리거 접근성 이름. 기본 "다른 행동 더 보기" */
  label?: string;
  iconClassName?: string;
  /** 메뉴가 뜨는 쪽. 하단 고정 줄은 위, 홈 큰 카드(T5.20)는 아래 */
  side?: "top" | "bottom";
  /** 지연 로딩한 메뉴를 누른 순간 바로 열 때(홈 큰 카드, T5.20) */
  defaultOpen?: boolean;
}) {
  return (
    <Menu.Root defaultOpen={defaultOpen}>
      <Menu.Trigger aria-label={label} className={triggerClassName}>
        <MoreHorizontal
          aria-hidden
          className={iconClassName}
          strokeWidth={1.5}
        />
      </Menu.Trigger>
      <Menu.Portal>
        <Menu.Positioner
          side={side}
          align="end"
          sideOffset={8}
          collisionPadding={12}
          className="z-[60] outline-none"
        >
          <Menu.Popup
            className={cn(
              "w-64 max-w-[calc(100vw-2rem)] origin-(--transform-origin) rounded-card border border-border bg-popover p-2 text-popover-foreground outline-none",
              "transition-[opacity,translate] duration-(--lm-duration-fast) ease-enter data-ending-style:translate-y-1 data-ending-style:opacity-0 data-starting-style:translate-y-1 data-starting-style:opacity-0 motion-reduce:transition-none",
            )}
          >
            {actions.map((a) => (
              <Item key={a.key} action={a} />
            ))}
            {reports.length > 0 ? (
              <Menu.Group className="mt-1 border-t border-border pt-1">
                <Menu.GroupLabel className="px-3 pt-2 pb-1 type-caption text-muted-foreground">
                  {copy.actions.reportGroup}
                </Menu.GroupLabel>
                {reports.map((a) => (
                  <Item key={a.key} action={a} />
                ))}
              </Menu.Group>
            ) : null}
          </Menu.Popup>
        </Menu.Positioner>
      </Menu.Portal>
    </Menu.Root>
  );
}
