"use client";
// PoC 2: 바텀시트 스냅 포인트 (T2.13, Base UI Drawer, T0.27).
//
// - 스냅 3단계: 살짝(12rem, 식당명과 높이 버튼), 절반(뷰포트 55%), 전체(1). snapToSequentialPoints로 빠르게 튕겨도 한 단계씩.
// - 스크롤 잠금: modal(기본 true)이면 Base UI가 문서 스크롤을 잠근다. "지도 조작 막기"를 끄면 비모달(지도와 함께 조작).
// - 내부 스크롤과 끌기 충돌: 전체 높이가 아닐 때는 본문을 overflow-hidden으로 둬서 어디를 끌어도 시트가 움직인다.
//   전체 높이(data-expanded)에서만 본문이 스크롤되고, 맨 위에서 아래로 끌면 Base UI가 시트 끌기로 넘긴다.
// - 마우스 끌기는 Drawer.Content 밖(손잡이, 머리)에서만 된다(본문은 글자 선택용, Base UI 동작).
// - 끌기 대체 조작: 머리의 높이 버튼 3개(aria-pressed). 바뀐 높이는 aria-live로 알린다. Esc와 닫기 버튼으로 닫는다.
// - 키보드: Drawer.VirtualKeyboardProvider가 입력칸을 키보드 위로 올린다.
// - 축소 모드: 공용 DrawerPopup이 motion-reduce:transition-none. 앱 설정 축소는 data-reduced로 같은 처리를 한다.
import { Drawer as DrawerPrimitive } from "@base-ui/react/drawer";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Drawer,
  DrawerBackdrop,
  DrawerClose,
  DrawerContent,
  DrawerDescription,
  DrawerHandle,
  DrawerPopup,
  DrawerPortal,
  DrawerTitle,
  DrawerViewport,
} from "@/components/ui/drawer";
import { Input } from "@/components/ui/input";
import { Toggle } from "@/components/ui/toggle";
import { designLabPocCopy } from "@/copy/design-lab-poc";
import { MOCK_DETAIL_PLACE } from "@/features/design-lab/mock";
import {
  MapLines,
  MapPin,
  NumberRow,
  PIN_POSITIONS,
  PlaceHeading,
} from "@/features/design-lab/system/b/parts";
import { categoryLabel } from "@/features/place/categories";
import { formatWon } from "@/lib/format";
import { useMotionReduced } from "@/lib/motion";
import { cn } from "@/lib/utils";

const copy = designLabPocCopy.sheet;
const place = MOCK_DETAIL_PLACE;

const SNAPS = [
  { id: "peek", value: "12rem" },
  { id: "half", value: 0.55 },
  { id: "full", value: 1 },
] as const;
type SnapId = (typeof SNAPS)[number]["id"];
const SNAP_POINTS = SNAPS.map((s) => s.value);

function snapIdOf(value: DrawerPrimitive.Root.SnapPoint | null): SnapId {
  return SNAPS.find((s) => s.value === value)?.id ?? "peek";
}

export function BottomSheetPoc() {
  const [open, setOpen] = useState(false);
  const [modal, setModal] = useState(true);
  const [snap, setSnap] = useState<DrawerPrimitive.Root.SnapPoint | null>(
    SNAPS[0].value,
  );
  const [announce, setAnnounce] = useState("");
  const reduced = useMotionReduced();
  const current = snapIdOf(snap);

  function changeSnap(next: DrawerPrimitive.Root.SnapPoint | null) {
    setSnap(next);
    const id = snapIdOf(next);
    if (next !== null) setAnnounce(copy.snapAnnounce[id]);
  }

  return (
    <div className="mt-8 flex flex-col gap-8">
      <div className="flex flex-wrap items-center gap-3">
        <Button
          variant="primary"
          onClick={() => {
            setSnap(SNAPS[0].value);
            setOpen(true);
          }}
        >
          {copy.open}
        </Button>
        <Toggle pressed={modal} onPressedChange={setModal}>
          {copy.modalLabel}
        </Toggle>
      </div>

      {/* 지도 자리 (시트 뒤 배경) */}
      <div
        aria-hidden
        className="relative h-[60svh] min-h-80 overflow-hidden rounded-card border border-border bg-muted"
      >
        <MapLines />
        <MapPin label={place.name} active position={PIN_POSITIONS[0]} />
      </div>

      <section className="flex flex-col gap-3">
        <h2 className="type-heading">{copy.devicesTitle}</h2>
        <p className="type-body-sm text-muted-foreground">{copy.devicesBody}</p>
        <ol className="flex list-decimal flex-col gap-2 pl-5 type-body-sm">
          {copy.devices.map((d) => (
            <li key={d}>{d}</li>
          ))}
        </ol>
      </section>

      <p aria-live="polite" className="sr-only">
        {announce}
      </p>

      <Drawer
        open={open}
        onOpenChange={setOpen}
        modal={modal}
        disablePointerDismissal={!modal}
        snapPoints={SNAP_POINTS}
        snapPoint={snap}
        onSnapPointChange={changeSnap}
        snapToSequentialPoints
      >
        <DrawerPrimitive.VirtualKeyboardProvider>
          <DrawerPortal>
            {modal ? <DrawerBackdrop /> : null}
            <DrawerViewport
              className={cn("z-30", !modal && "pointer-events-none")}
            >
              <DrawerPopup
                data-reduced={reduced || undefined}
                className={cn(
                  "group/popup pointer-events-auto h-[calc(100dvh-1rem)] max-h-[calc(100dvh-1rem)] touch-none",
                  "data-reduced:transition-none",
                )}
              >
                <div className="shrink-0 px-(--lm-layout-gutter) pb-4 select-none">
                  <DrawerHandle className="mt-3 mb-4 h-1 w-9" />
                  <PlaceHeading
                    place={place}
                    categoryLabel={categoryLabel(place.category)}
                    illustrationClassName="hidden"
                    title={
                      <DrawerTitle className="type-heading text-balance break-keep">
                        {place.name}
                      </DrawerTitle>
                    }
                  />
                  <div className="mt-4 flex items-center justify-between gap-2">
                    <div
                      role="group"
                      aria-label={copy.snapGroup}
                      className="flex gap-1"
                    >
                      {SNAPS.map((s) => (
                        <Button
                          key={s.id}
                          size="sm"
                          variant={current === s.id ? "secondary" : "ghost"}
                          aria-pressed={current === s.id}
                          onClick={() => changeSnap(s.value)}
                          className="px-3"
                        >
                          {copy.snaps[s.id]}
                        </Button>
                      ))}
                    </div>
                    <DrawerClose render={<Button size="sm" variant="ghost" />}>
                      {copy.close}
                    </DrawerClose>
                  </div>
                </div>

                {/* 전체 높이가 아니면 스크롤하지 않는다: 본문 어디를 끌어도 시트가 움직인다 */}
                <DrawerContent className="overflow-hidden border-t border-border pt-6 group-data-expanded/popup:overflow-y-auto">
                  <div className="flex flex-col gap-8">
                    <NumberRow place={place} />
                    <DrawerDescription className="type-body-sm text-muted-foreground">
                      {place.reason}
                    </DrawerDescription>

                    <section className="flex flex-col gap-3">
                      <h3 className="type-caption text-muted-foreground">
                        {copy.menuTitle}
                      </h3>
                      <ul className="flex flex-col divide-y divide-border">
                        {place.menu.map((item) => (
                          <li
                            key={item.name}
                            className="flex items-baseline justify-between py-3 type-body"
                          >
                            <span>{item.name}</span>
                            <span className="text-muted-foreground tabular-nums">
                              {formatWon(item.priceKRW)}
                            </span>
                          </li>
                        ))}
                      </ul>
                    </section>

                    <section className="flex flex-col gap-3">
                      <h3 className="type-caption text-muted-foreground">
                        {copy.infoTitle}
                      </h3>
                      <ul className="flex flex-col gap-2 type-body-sm">
                        {[place.address, place.hours, place.phone].map((v) => (
                          <li key={v}>{v}</li>
                        ))}
                      </ul>
                    </section>

                    <label className="flex flex-col gap-2">
                      <span className="type-caption text-muted-foreground">
                        {copy.memoLabel}
                      </span>
                      <Input placeholder={copy.memoPlaceholder} />
                      <span className="type-caption text-muted-foreground">
                        {copy.memoHelp}
                      </span>
                    </label>

                    {/* 전체 높이에서 스크롤이 생기도록 채우는 자리 */}
                    {Array.from({ length: 6 }, (_, i) => (
                      <p
                        key={i}
                        className="rounded-card border border-border px-5 py-6 type-body-sm text-muted-foreground"
                      >
                        {copy.filler}
                      </p>
                    ))}
                  </div>
                </DrawerContent>
              </DrawerPopup>
            </DrawerViewport>
          </DrawerPortal>
        </DrawerPrimitive.VirtualKeyboardProvider>
      </Drawer>
    </div>
  );
}
