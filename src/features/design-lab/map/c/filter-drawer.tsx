"use client";
// 지도 시안 C의 필터 시트 (T5.1, MAP-03). Base UI Drawer(모달)라 map-c.tsx가 "필터"를 누른 뒤 동적 import한다
// (tasks.md 2.4절 "지도 탭 진입 시 지연 로딩", D-08과 같은 방식). 지도 첫 로드에 Drawer가 들어가지 않는다.
// - 고를 때마다 지도와 목록이 바로 바뀌고, 바닥 주 버튼에 결과 수("8곳 보기")가 보인다. 0곳이면 버튼이 꺼진다.
// - 시트 열림은 공용 DrawerPopup(slow 300 enter), 축소 모드면 즉시.
import {
  Drawer,
  DrawerBackdrop,
  DrawerContent,
  DrawerDescription,
  DrawerHandle,
  DrawerPopup,
  DrawerPortal,
  DrawerTitle,
  DrawerViewport,
} from "@/components/ui/drawer";
import { buttonClass } from "@/components/ui/button-classes";
import { Chip } from "@/components/ui/chip";
import { focusRing } from "@/components/ui/interaction";
import { mapLabCopy } from "@/copy/design-lab-map";
import { useDesignPortalContainer } from "@/features/design-lab/system/design-scope";
import type { CategorySlug } from "@/features/place/categories";
import { cn } from "@/lib/utils";
import { CategoryChips, type FilterToggleKey } from "../shared/parts";
import type { MapFilters } from "../shared/places";

const copy = mapLabCopy.filters;

export type FilterDrawerProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  filters: MapFilters;
  categories: readonly CategorySlug[];
  resultCount: number;
  onToggle: (key: FilterToggleKey) => void;
  onCategory: (slug: CategorySlug | null) => void;
  onReset: () => void;
};

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="flex flex-col gap-3">
      <h3 className="type-caption text-muted-foreground">{title}</h3>
      {children}
    </section>
  );
}

export default function FilterDrawer({
  open,
  onOpenChange,
  filters,
  categories,
  resultCount,
  onToggle,
  onCategory,
  onReset,
}: FilterDrawerProps) {
  const container = useDesignPortalContainer();
  return (
    <Drawer open={open} onOpenChange={onOpenChange}>
      <DrawerPortal container={container}>
        <DrawerBackdrop className="z-40" />
        <DrawerViewport className="z-40">
          <DrawerPopup className="max-h-[calc(100%-3rem)]">
            <DrawerHandle className="mt-3 mb-2 h-1 w-9" />
            <div className="flex items-baseline justify-between px-(--lm-layout-gutter) pt-2 pb-4">
              <DrawerTitle className="type-title">
                {copy.sheetTitle}
              </DrawerTitle>
              <button
                type="button"
                onClick={onReset}
                className={cn(
                  "inline-flex h-11 items-center px-1 type-label text-muted-foreground underline decoration-border underline-offset-4 hover:text-foreground",
                  focusRing,
                )}
              >
                {copy.reset}
              </button>
            </div>
            <DrawerContent className="flex flex-col gap-8 pb-6">
              <DrawerDescription>{copy.sheetBody}</DrawerDescription>
              <Section title={copy.categoryTitle}>
                <CategoryChips
                  value={filters.category}
                  categories={categories}
                  onChange={onCategory}
                  wrap
                />
              </Section>
              <Section title={copy.priceTitle}>
                <div className="flex flex-wrap gap-2">
                  <Chip
                    pressed={!filters.cheap}
                    onPressedChange={() => filters.cheap && onToggle("cheap")}
                  >
                    {copy.priceOptions.any}
                  </Chip>
                  <Chip
                    pressed={filters.cheap}
                    onPressedChange={() => !filters.cheap && onToggle("cheap")}
                  >
                    {copy.priceOptions.under10k}
                  </Chip>
                </div>
              </Section>
              <Section title={copy.walkTitle}>
                <div className="flex flex-wrap gap-2">
                  <Chip
                    pressed={!filters.near}
                    onPressedChange={() => filters.near && onToggle("near")}
                  >
                    {copy.walkOptions.any}
                  </Chip>
                  <Chip
                    pressed={filters.near}
                    onPressedChange={() => !filters.near && onToggle("near")}
                  >
                    {copy.walkOptions.under5}
                  </Chip>
                </div>
              </Section>
              <Section title={copy.moreTitle}>
                <div className="flex flex-wrap gap-2">
                  <Chip
                    pressed={filters.top}
                    onPressedChange={() => onToggle("top")}
                  >
                    {copy.top}
                  </Chip>
                  <Chip
                    pressed={filters.favorites}
                    onPressedChange={() => onToggle("favorites")}
                  >
                    {copy.favorites}
                  </Chip>
                </div>
              </Section>
            </DrawerContent>
            <div className="shrink-0 border-t border-border px-(--lm-layout-gutter) pt-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
              <button
                type="button"
                aria-disabled={resultCount === 0 || undefined}
                onClick={() => {
                  if (resultCount > 0) onOpenChange(false);
                }}
                className={cn(buttonClass("primary"), "w-full")}
              >
                {resultCount > 0 ? copy.apply(resultCount) : copy.applyNone}
              </button>
            </div>
          </DrawerPopup>
        </DrawerViewport>
      </DrawerPortal>
    </Drawer>
  );
}
