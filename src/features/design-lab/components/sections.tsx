"use client";
// 컴포넌트 갤러리 섹션 본문 (T2.10). 목업 문구만 쓴다.
// 섹션 순서와 id는 GALLERY_SECTIONS가 정본이다. 각 섹션 루트에 data-gallery-section="<id>"가 붙는다(T2.16 스냅샷 단위).
// 견본(Specimen) 이름은 코드 이름 그대로 caption으로 단다.
import { BookmarkIcon, InfoIcon } from "lucide-react";
import Link from "next/link";
import { useId, useState, type ReactNode } from "react";
import { PageHeader, TabBarView } from "@/components/app-shell";
import {
  AvoidWarningBadge,
  BadgeFor,
  DealBadge,
  EstimateBadge,
  PlaceBadges,
  ReportBadge,
  WaitingBadge,
} from "@/components/badges/place-badges";
import {
  BADGE_PRIORITY,
  type PlaceBadge,
} from "@/components/badges/pick-badges";
import {
  CardSkeleton,
  EmptyState,
  ErrorState,
  ListSkeleton,
  OfflineState,
  SheetSkeleton,
} from "@/components/states";
import { Avatar, AvatarFallback, AvatarGroup } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button, buttonVariants } from "@/components/ui/button";
import { Chip, ChipGroup } from "@/components/ui/chip";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Drawer,
  DrawerBackdrop,
  DrawerContent,
  DrawerDescription,
  DrawerHandle,
  DrawerPopup,
  DrawerPortal,
  DrawerTitle,
  DrawerTrigger,
  DrawerViewport,
} from "@/components/ui/drawer";
import { Input } from "@/components/ui/input";
import {
  Sheet,
  SheetBody,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { Slider } from "@/components/ui/slider";
import { toast } from "@/components/ui/sonner";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Toggle } from "@/components/ui/toggle";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { commonCopy } from "@/copy/common";
import {
  designLabComponentsCopy as copy,
  type GallerySectionId,
} from "@/copy/design-lab-components";
import { CATEGORY_SLUGS, categoryLabel } from "@/features/place/categories";
import { CategoryIllustration } from "@/features/place/illustrations";
import { formatShortWon, formatWalkMinutes } from "@/lib/format";
import { useOnlineStatus } from "@/lib/network";
import { cn } from "@/lib/utils";

const s = copy.samples;
const names = copy.specimens;

/* ---------- 틀 ---------- */

function Section({
  id,
  index,
  children,
}: {
  id: GallerySectionId;
  index: number;
  children: ReactNode;
}) {
  const { title, body } = copy.sections[id];
  return (
    <section
      id={id}
      data-gallery-section={id}
      aria-labelledby={`${id}-title`}
      className="flex scroll-mt-8 flex-col gap-10 border-t border-border pt-10"
    >
      <header className="flex flex-col gap-2">
        <span
          aria-hidden
          className="type-caption text-muted-foreground tabular-nums"
        >
          {String(index + 1).padStart(2, "0")}
        </span>
        <h2 id={`${id}-title`} className="type-heading break-keep">
          {title}
        </h2>
        <p className="max-w-prose type-body-sm break-keep text-muted-foreground">
          {body}
        </p>
      </header>
      {children}
    </section>
  );
}

/** 견본 하나: 위에 코드 이름(caption), 아래에 실물 */
function Specimen({
  name,
  className,
  children,
}: {
  name: string;
  className?: string;
  children: ReactNode;
}) {
  return (
    <figure className={cn("flex min-w-0 flex-col gap-4", className)}>
      <figcaption className="type-caption text-muted-foreground">
        <code className="font-sans">{name}</code>
      </figcaption>
      {children}
    </figure>
  );
}

/** 섹션 안 견본 격자. 데스크톱에서 2열 */
function Grid({ children }: { children: ReactNode }) {
  return (
    <div className="grid gap-x-12 gap-y-10 md:grid-cols-2">{children}</div>
  );
}

function Row({ children }: { children: ReactNode }) {
  return <div className="flex flex-wrap items-center gap-3">{children}</div>;
}

/** 화면 단위 컴포넌트(상태, 셸)를 올려 두는 면 */
function Stage({
  className,
  children,
}: {
  className?: string;
  children: ReactNode;
}) {
  return (
    <div
      className={cn(
        "rounded-card border border-border bg-card text-card-foreground",
        className,
      )}
    >
      {children}
    </div>
  );
}

/* ---------- 섹션 ---------- */

const COLOR_SWATCHES = [
  { key: "background", className: "bg-background" },
  { key: "card", className: "bg-card" },
  { key: "muted", className: "bg-muted" },
  { key: "skeleton", className: "bg-skeleton" },
  { key: "border", className: "bg-border" },
  { key: "primary", className: "bg-primary" },
] as const;

function Foundations() {
  const f = copy.foundations;
  return (
    <Grid>
      <Specimen name={names.typeScale}>
        <div className="flex flex-col gap-3">
          <p className="type-display break-keep">{f.typeSample}</p>
          <p className="type-title break-keep">{f.typeSample}</p>
          <p className="type-heading break-keep">{f.typeSample}</p>
          <p className="type-body">{f.typeSample}</p>
          <p className="type-caption text-muted-foreground">{f.typeSample}</p>
          <p className="flex items-baseline gap-6 tabular-nums">
            <span className="type-numeric-lg">{f.numericSample}</span>
            <span className="type-numeric-md">{f.numericSample}</span>
          </p>
        </div>
      </Specimen>
      <Specimen name={names.colors}>
        <ul className="grid grid-cols-3 gap-x-4 gap-y-5">
          {COLOR_SWATCHES.map(({ key, className }) => (
            <li key={key} className="flex flex-col gap-2">
              <span
                aria-hidden
                className={cn(
                  "h-14 rounded-card border border-border",
                  className,
                )}
              />
              <span className="type-caption text-muted-foreground">
                {f.colors[key]}
              </span>
            </li>
          ))}
        </ul>
        <Row>
          <Link
            href="/design-lab/system/tokens"
            className={buttonVariants({ variant: "link" })}
          >
            {f.tokensLink}
          </Link>
        </Row>
      </Specimen>
    </Grid>
  );
}

function Buttons() {
  return (
    <Grid>
      <Specimen name={names.buttonVariants}>
        <Row>
          <Button variant="primary">{s.directions}</Button>
          <Button>{s.other}</Button>
          <Button variant="ghost">{s.quiet}</Button>
          <Button variant="link">{s.link}</Button>
        </Row>
      </Specimen>
      <Specimen name={names.buttonSizes}>
        <Row>
          <Button variant="primary" disabled>
            {s.disabled}
          </Button>
          <Button size="sm">{s.other}</Button>
          <Button variant="destructive" size="sm">
            {commonCopy.dialogs.discard.confirm}
          </Button>
          <Button size="icon" aria-label={commonCopy.actions.share}>
            <BookmarkIcon aria-hidden />
          </Button>
          <Button size="icon-sm" variant="ghost" aria-label={s.save}>
            <BookmarkIcon aria-hidden />
          </Button>
        </Row>
      </Specimen>
    </Grid>
  );
}

function Chips() {
  return (
    <Grid>
      <Specimen name={names.chipGroup}>
        <ChipGroup
          multiple
          aria-label={s.categoryGroup}
          defaultValue={[s.categories[1]]}
        >
          {s.categories.map((c) => (
            <Chip key={c} value={c}>
              {c}
            </Chip>
          ))}
          <Chip disabled value={s.disabledChip}>
            {s.disabledChip}
          </Chip>
        </ChipGroup>
      </Specimen>
      <Specimen name={names.toggle}>
        <Row>
          <Toggle variant="quiet" aria-label={s.save}>
            <BookmarkIcon aria-hidden />
          </Toggle>
          <Toggle variant="quiet" aria-label={s.save} defaultPressed>
            <BookmarkIcon aria-hidden />
          </Toggle>
        </Row>
      </Specimen>
    </Grid>
  );
}

function Badges() {
  return (
    <Specimen name={names.badgeVariants}>
      <div className="flex flex-wrap gap-2">
        <Badge>{s.badges.default}</Badge>
        <Badge variant="muted">{s.badges.muted}</Badge>
        <Badge variant="success">{s.badges.success}</Badge>
        <Badge variant="warning">{s.badges.warning}</Badge>
        <Badge variant="info">{s.badges.info}</Badge>
        <Badge variant="destructive">{s.badges.destructive}</Badge>
      </div>
    </Specimen>
  );
}

function Inputs() {
  const errorId = useId();
  return (
    <Grid>
      <div className="flex flex-col gap-10">
        <Specimen name={names.input}>
          <label className="flex flex-col gap-2">
            <span className="type-label">{s.nickname}</span>
            <Input placeholder={s.nicknamePlaceholder} />
          </label>
        </Specimen>
        <Specimen name={names.inputError}>
          <label className="flex flex-col gap-2">
            <span className="type-label">{s.nickname}</span>
            <Input defaultValue="a" aria-invalid aria-describedby={errorId} />
            <span id={errorId} className="type-caption text-destructive">
              {s.nicknameError}
            </span>
          </label>
        </Specimen>
      </div>
      <div className="flex flex-col gap-10">
        <Specimen name={names.slider}>
          <Slider
            label={s.walk}
            defaultValue={10}
            min={5}
            max={20}
            formatValue={formatWalkMinutes}
          />
        </Specimen>
        <Specimen name={names.sliderRange}>
          <Slider
            label={s.budget}
            defaultValue={[8000, 12000]}
            min={5000}
            max={30000}
            step={1000}
            formatValue={formatShortWon}
          />
        </Specimen>
        <Specimen name={names.sliderDisabled}>
          <Slider
            label={s.walk}
            defaultValue={15}
            min={5}
            max={20}
            disabled
            formatValue={formatWalkMinutes}
          />
        </Specimen>
      </div>
    </Grid>
  );
}

function TabsSection() {
  return (
    <Grid>
      <Specimen name={names.tabsLine}>
        <Tabs defaultValue="visit">
          <TabsList>
            <TabsTrigger value="visit">{s.tabs.visit}</TabsTrigger>
            <TabsTrigger value="saved">{s.tabs.saved}</TabsTrigger>
            <TabsTrigger value="reviews">{s.tabs.reviews}</TabsTrigger>
          </TabsList>
          {(["visit", "saved", "reviews"] as const).map((key) => (
            <TabsContent
              key={key}
              value={key}
              className="type-body-sm text-muted-foreground"
            >
              {s.panel[key]}
            </TabsContent>
          ))}
        </Tabs>
      </Specimen>
      <Specimen name={names.tabsSegment}>
        <Tabs defaultValue="list">
          <TabsList variant="segment">
            <TabsTrigger value="list">{s.segment.list}</TabsTrigger>
            <TabsTrigger value="map">{s.segment.map}</TabsTrigger>
          </TabsList>
        </Tabs>
      </Specimen>
    </Grid>
  );
}

function Overlays() {
  return (
    <Grid>
      <Specimen name={names.dialog}>
        <Row>
          <Dialog>
            <DialogTrigger render={<Button size="sm" />}>
              {s.dialog}
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>{commonCopy.dialogs.discard.title}</DialogTitle>
                <DialogDescription>
                  {commonCopy.dialogs.discard.body}
                </DialogDescription>
              </DialogHeader>
              <DialogFooter>
                <DialogClose render={<Button variant="primary" />}>
                  {commonCopy.dialogs.discard.confirm}
                </DialogClose>
                <DialogClose render={<Button />}>
                  {commonCopy.actions.cancel}
                </DialogClose>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </Row>
      </Specimen>

      <Specimen name={names.sheet}>
        <Row>
          <Sheet>
            <SheetTrigger render={<Button size="sm" />}>{s.sheet}</SheetTrigger>
            <SheetContent>
              <SheetHeader>
                <SheetTitle>{s.sheetTitle}</SheetTitle>
                <SheetDescription>{s.sheetBody}</SheetDescription>
              </SheetHeader>
              <SheetBody className="flex flex-col gap-7">
                <ChipGroup multiple aria-label={s.categoryGroup}>
                  {s.categories.map((c) => (
                    <Chip key={c} value={c}>
                      {c}
                    </Chip>
                  ))}
                </ChipGroup>
              </SheetBody>
              <SheetFooter>
                <Button variant="primary">{commonCopy.actions.done}</Button>
              </SheetFooter>
            </SheetContent>
          </Sheet>
          <Sheet>
            <SheetTrigger render={<Button size="sm" />}>
              {s.sheetBottom}
            </SheetTrigger>
            <SheetContent side="bottom">
              <SheetHeader>
                <SheetTitle>{s.sheetTitle}</SheetTitle>
                <SheetDescription>{s.sheetBody}</SheetDescription>
              </SheetHeader>
              <SheetBody>
                <Slider
                  label={s.walk}
                  defaultValue={10}
                  min={5}
                  max={20}
                  formatValue={formatWalkMinutes}
                />
              </SheetBody>
              <SheetFooter>
                <Button variant="primary">{commonCopy.actions.done}</Button>
              </SheetFooter>
            </SheetContent>
          </Sheet>
        </Row>
      </Specimen>

      <Specimen name={names.drawer}>
        <Row>
          <Drawer>
            <DrawerTrigger render={<Button size="sm" />}>
              {s.drawer}
            </DrawerTrigger>
            <DrawerPortal>
              <DrawerBackdrop className="z-50" />
              <DrawerViewport className="z-50">
                <DrawerPopup>
                  <DrawerHandle />
                  <DrawerContent className="flex flex-col gap-3 pt-3">
                    <DrawerTitle>{s.drawerTitle}</DrawerTitle>
                    <DrawerDescription>{s.drawerBody}</DrawerDescription>
                    <SheetSkeleton className="pt-4" />
                  </DrawerContent>
                </DrawerPopup>
              </DrawerViewport>
            </DrawerPortal>
          </Drawer>
        </Row>
      </Specimen>

      <Specimen name={`${names.tooltip}, ${names.toast}`}>
        <Row>
          <Tooltip>
            <TooltipTrigger
              render={
                <Button size="icon-sm" variant="ghost" aria-label={s.tooltip} />
              }
            >
              <InfoIcon aria-hidden />
            </TooltipTrigger>
            <TooltipContent>{s.tooltipBody}</TooltipContent>
          </Tooltip>
          <Button
            size="sm"
            onClick={() => toast.success(commonCopy.toasts.linkCopied)}
          >
            {s.toast}
          </Button>
          <Button
            size="sm"
            onClick={() =>
              toast.error(commonCopy.states.error.title, {
                description: commonCopy.toasts.retryLater,
                action: { label: commonCopy.actions.retry, onClick: () => {} },
              })
            }
          >
            {s.toastError}
          </Button>
        </Row>
      </Specimen>
    </Grid>
  );
}

function Avatars() {
  const sizes = ["sm", "default", "lg", "xl"] as const;
  return (
    <Grid>
      <Specimen name={names.avatarSizes}>
        <div className="flex items-center gap-4">
          {sizes.map((size, i) => (
            <Avatar key={size} size={size}>
              <AvatarFallback>{s.avatarLetters[i]}</AvatarFallback>
            </Avatar>
          ))}
        </div>
      </Specimen>
      <Specimen name={names.avatarGroup}>
        <AvatarGroup>
          {s.avatarGroup.map((letter) => (
            <Avatar key={letter}>
              <AvatarFallback>{letter}</AvatarFallback>
            </Avatar>
          ))}
        </AvatarGroup>
      </Specimen>
    </Grid>
  );
}

function States() {
  const online = useOnlineStatus();
  const [pressed, setPressed] = useState("");
  const press = (label: string) => () => setPressed(copy.states.pressed(label));
  const sample = copy.states.emptySample;

  return (
    <div className="flex flex-col gap-10">
      <Grid>
        <Specimen name={names.cardSkeleton}>
          <CardSkeleton />
        </Specimen>
        <Specimen name={names.listSkeleton}>
          <ListSkeleton rows={4} />
        </Specimen>
        <Specimen name={names.sheetSkeleton}>
          {/* 시트 모양 틀: 위쪽 라운드, popover 면, 손잡이. 안쪽 여백은 시트가 준다 */}
          <div className="rounded-t-sheet border border-b-0 border-border bg-popover px-(--lm-layout-gutter) pt-3 shadow-sheet">
            <div className="mx-auto mb-5 h-1 w-9 rounded-full bg-border" />
            <SheetSkeleton />
          </div>
        </Specimen>
        <Specimen name={names.empty}>
          <Stage className="px-7 pt-6 pb-8">
            <EmptyState headingLevel="h3" />
          </Stage>
        </Specimen>
        <Specimen name={names.emptyDomain}>
          <Stage className="px-7 pt-6 pb-8">
            <EmptyState
              headingLevel="h3"
              title={sample.title}
              body={sample.body}
              visual={<CategoryIllustration slug="gukbap" />}
              action={{
                label: sample.action,
                variant: "primary",
                onClick: press(sample.action),
              }}
            />
          </Stage>
        </Specimen>
        <Specimen name={names.error}>
          <Stage className="px-7 pt-6 pb-8">
            <ErrorState
              headingLevel="h3"
              action={{ onClick: press(commonCopy.states.error.action) }}
            />
          </Stage>
        </Specimen>
        <Specimen name={names.offline}>
          <Stage className="px-7 pt-6 pb-8">
            <OfflineState
              headingLevel="h3"
              action={{ onClick: press(commonCopy.states.offline.action) }}
            />
          </Stage>
        </Specimen>
        <Specimen name={names.online}>
          {online ? (
            <p className="type-body-sm text-muted-foreground">
              {copy.states.onlineNow}
            </p>
          ) : (
            <OfflineState headingLevel="h3" />
          )}
        </Specimen>
      </Grid>
      <p aria-live="polite" className="type-caption text-muted-foreground">
        {pressed}
      </p>
    </div>
  );
}

const BADGE_CANDIDATES: PlaceBadge[] = [
  { kind: "deal" },
  { kind: "report" },
  { kind: "waiting", level: "long", minutesAgo: 12 },
  { kind: "estimate" },
];

function PlaceBadgesSection() {
  const b = copy.placeBadges;
  return (
    <Grid>
      <Specimen name={names.badgeAll} className="md:col-span-2">
        <Row>
          <EstimateBadge />
          <ReportBadge />
          <DealBadge />
          <WaitingBadge level="long" />
          <AvoidWarningBadge />
        </Row>
      </Specimen>
      <Specimen name={names.waiting}>
        <div className="flex flex-col gap-3">
          <Row>
            <WaitingBadge level="walkIn" />
            <WaitingBadge level="short" />
            <WaitingBadge level="long" />
          </Row>
          <Row>
            <WaitingBadge level="walkIn" minutesAgo={3} />
            <WaitingBadge level="short" minutesAgo={8} />
            <WaitingBadge level="long" minutesAgo={12} />
          </Row>
        </div>
      </Specimen>
      <Specimen name={names.badgeTooltip}>
        <p className="type-body-sm text-muted-foreground">{b.tooltipHint}</p>
        <Row>
          <EstimateBadge withTooltip />
          <DealBadge withTooltip />
          <WaitingBadge level="short" minutesAgo={8} withTooltip />
          <AvoidWarningBadge withTooltip />
        </Row>
      </Specimen>
      <Specimen name={names.placeBadges}>
        <Stage className="flex flex-col gap-3 p-6">
          <p className="type-heading">{b.sampleName}</p>
          <PlaceBadges badges={BADGE_CANDIDATES} />
        </Stage>
        <div className="flex flex-col gap-2">
          <span className="type-caption text-muted-foreground">
            {b.candidatesLabel}
          </span>
          <Row>
            {BADGE_CANDIDATES.map((badge) => (
              <BadgeFor key={badge.kind} badge={badge} />
            ))}
          </Row>
        </div>
      </Specimen>
      <Specimen name={names.priority}>
        <ol className="flex flex-col gap-1.5 type-body-sm text-muted-foreground tabular-nums">
          {BADGE_PRIORITY.map((key, i) => (
            <li key={key} className="flex gap-3">
              <span className="w-4 text-right">{i + 1}</span>
              <code className="font-sans text-foreground">{key}</code>
            </li>
          ))}
        </ol>
      </Specimen>
    </Grid>
  );
}

function Illustrations() {
  return (
    <div className="flex flex-col gap-10">
      <Specimen name={names.illustrationCard}>
        <ul className="grid grid-cols-3 gap-x-2 gap-y-6 sm:grid-cols-4 lg:grid-cols-6">
          {CATEGORY_SLUGS.map((slug) => (
            <li key={slug} className="flex flex-col items-center gap-1.5">
              <CategoryIllustration slug={slug} />
              <span className="type-caption text-muted-foreground">
                {categoryLabel(slug)}
              </span>
            </li>
          ))}
        </ul>
      </Specimen>
      <Specimen name={names.illustrationIcon}>
        <ul className="grid grid-cols-6 gap-y-4 lg:grid-cols-12">
          {CATEGORY_SLUGS.map((slug) => (
            <li key={slug} className="flex justify-center">
              <CategoryIllustration slug={slug} size={40} />
            </li>
          ))}
        </ul>
      </Specimen>
      <Row>
        <Link
          href="/design-lab/illustrations"
          className={buttonVariants({ variant: "link" })}
        >
          {copy.foundations.illustrationsLink}
        </Link>
      </Row>
    </div>
  );
}

function AppShellSection() {
  return (
    <Grid>
      <Specimen name={names.pageHeader}>
        <Stage className="px-6 pt-8 pb-6">
          <PageHeader eyebrow={s.headerEyebrow} title={s.headerTitle} />
        </Stage>
      </Specimen>
      <Specimen name={names.pageHeaderBack}>
        <Stage className="px-6 pt-4 pb-6">
          <PageHeader
            backHref="/design-lab/components"
            title={s.headerDetailTitle}
            action={
              <Button size="sm" variant="ghost">
                {s.headerAction}
              </Button>
            }
          />
        </Stage>
      </Specimen>
      <Specimen name={names.tabBar}>
        <Stage className="overflow-hidden bg-background">
          <TabBarView
            activeId="today"
            preview
            label={s.tabBarPreviewActive}
            className="static border-t-0"
          />
        </Stage>
      </Specimen>
      <Specimen name={names.tabBarNone}>
        <Stage className="overflow-hidden bg-background">
          <TabBarView
            activeId={null}
            preview
            label={s.tabBarPreviewNone}
            className="static border-t-0"
          />
        </Stage>
      </Specimen>
    </Grid>
  );
}

/** 섹션 순서. 목차와 본문이 함께 쓴다 */
export const GALLERY_SECTIONS: readonly {
  id: GallerySectionId;
  Body: () => ReactNode;
}[] = [
  { id: "foundations", Body: Foundations },
  { id: "button", Body: Buttons },
  { id: "chip", Body: Chips },
  { id: "badge", Body: Badges },
  { id: "input", Body: Inputs },
  { id: "tabs", Body: TabsSection },
  { id: "overlay", Body: Overlays },
  { id: "avatar", Body: Avatars },
  { id: "states", Body: States },
  { id: "placeBadges", Body: PlaceBadgesSection },
  { id: "illustrations", Body: Illustrations },
  { id: "appShell", Body: AppShellSection },
];

export function GallerySections() {
  return (
    <>
      {GALLERY_SECTIONS.map(({ id, Body }, i) => (
        <Section key={id} id={id} index={i}>
          <Body />
        </Section>
      ))}
    </>
  );
}
