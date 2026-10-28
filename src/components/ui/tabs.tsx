"use client";
// shadcn base-vega Tabs, DESIGN.md 토큰으로 재스타일 (T2.5). 하단 탭 바는 앱 셸(T2.6)이 따로 만든다.
// "선택 상태는 테두리나 밑줄로 표시하고, 올리브 면은 주 버튼과 1위 득표 바에만"(DESIGN.md 9장)을 따른다.
//
// variant
// - line(기본): 아래 1px 선 위에 활성 탭만 2px primary 밑줄. 글자는 비활성 muted-foreground, 활성 foreground.
// - segment: 알약 테두리 안에서 활성 탭에 card 면 + 1px 선(면 톤 한 단계). 두세 개 보기 전환용.
// 표시 막대(Tabs.Indicator)는 활성 탭 위치로 base 260ms standard로 미끄러진다. reduced motion이면 즉시 이동.
// 탭 높이 44px(터치 기준).
import { Tabs as TabsPrimitive } from "@base-ui/react/tabs";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";
import { focusRing, hitArea44 } from "./interaction";

function Tabs({
  className,
  orientation = "horizontal",
  ...props
}: TabsPrimitive.Root.Props) {
  return (
    <TabsPrimitive.Root
      data-slot="tabs"
      data-orientation={orientation}
      orientation={orientation}
      className={cn("group/tabs flex flex-col gap-5", className)}
      {...props}
    />
  );
}

const tabsListVariants = cva(
  "group/tabs-list relative isolate flex items-stretch text-muted-foreground",
  {
    variants: {
      variant: {
        line: "w-full gap-6 border-b border-border",
        segment: "w-fit gap-0 rounded-button border border-border p-1",
      },
    },
    defaultVariants: {
      variant: "line",
    },
  },
);

function TabsList({
  className,
  variant = "line",
  children,
  ...props
}: TabsPrimitive.List.Props & VariantProps<typeof tabsListVariants>) {
  return (
    <TabsPrimitive.List
      data-slot="tabs-list"
      data-variant={variant}
      className={cn(tabsListVariants({ variant }), className)}
      {...props}
    >
      {children}
      <TabsPrimitive.Indicator
        data-slot="tabs-indicator"
        renderBeforeHydration
        className={cn(
          "absolute left-0 -z-10 w-(--active-tab-width) translate-x-(--active-tab-left) transition-[translate,width] duration-(--lm-duration-base) ease-standard motion-reduce:transition-none",
          variant === "segment"
            ? "top-(--active-tab-top) h-(--active-tab-height) rounded-button border border-border bg-card"
            : "bottom-[-1px] h-0.5 bg-primary",
        )}
      />
    </TabsPrimitive.List>
  );
}

function TabsTrigger({ className, ...props }: TabsPrimitive.Tab.Props) {
  return (
    <TabsPrimitive.Tab
      data-slot="tabs-trigger"
      className={cn(
        "inline-flex min-h-11 items-center justify-center gap-1.5 type-label whitespace-nowrap select-none",
        "transition-colors duration-(--lm-duration-fast) ease-standard motion-reduce:transition-none",
        "hover:text-foreground disabled:pointer-events-none disabled:opacity-50 data-disabled:pointer-events-none data-disabled:opacity-50 data-active:text-foreground",
        "group-data-[variant=line]/tabs-list:px-0.5",
        "group-data-[variant=segment]/tabs-list:min-h-10 group-data-[variant=segment]/tabs-list:rounded-button group-data-[variant=segment]/tabs-list:px-4",
        "[&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
        hitArea44,
        focusRing,
        "rounded-sm",
        className,
      )}
      {...props}
    />
  );
}

function TabsContent({ className, ...props }: TabsPrimitive.Panel.Props) {
  return (
    <TabsPrimitive.Panel
      data-slot="tabs-content"
      className={cn("flex-1 outline-none", focusRing, className)}
      {...props}
    />
  );
}

export { Tabs, TabsContent, TabsList, TabsTrigger, tabsListVariants };
