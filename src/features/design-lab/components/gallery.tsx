"use client";
// 공통 컴포넌트 갤러리 초안 (T2.5 확인용, T2.10이 이어받아 4상태와 테마 전환을 더한다).
import { BookmarkIcon, InfoIcon } from "lucide-react";
import type { ReactNode } from "react";
import { Avatar, AvatarFallback, AvatarGroup } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
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
import { Skeleton } from "@/components/ui/skeleton";
import { Slider } from "@/components/ui/slider";
import { Toaster, toast } from "@/components/ui/sonner";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Toggle } from "@/components/ui/toggle";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { commonCopy } from "@/copy/common";
import { designLabComponentsCopy as copy } from "@/copy/design-lab-components";
import { formatShortWon, formatWalkMinutes } from "@/lib/format";

const s = copy.samples;

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="flex flex-col gap-5">
      <h2 className="type-caption text-muted-foreground">{title}</h2>
      {children}
    </section>
  );
}

export function ComponentsGallery() {
  return (
    <TooltipProvider>
      <Section title={copy.sections.button}>
        <div className="flex flex-wrap items-center gap-3">
          <Button variant="primary">{s.directions}</Button>
          <Button>{s.other}</Button>
          <Button variant="ghost">{s.quiet}</Button>
          <Button variant="link">{s.link}</Button>
        </div>
        <div className="flex flex-wrap items-center gap-3">
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
        </div>
      </Section>

      <Section title={copy.sections.chip}>
        <ChipGroup
          multiple
          aria-label={s.categoryGroup}
          defaultValue={["국밥"]}
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
        <div className="flex gap-2">
          <Toggle variant="quiet" aria-label={s.save}>
            <BookmarkIcon aria-hidden />
          </Toggle>
          <Toggle variant="quiet" aria-label={s.save} defaultPressed>
            <BookmarkIcon aria-hidden />
          </Toggle>
        </div>
      </Section>

      <Section title={copy.sections.badge}>
        <div className="flex flex-wrap gap-2">
          <Badge>{s.badges.default}</Badge>
          <Badge variant="muted">{s.badges.muted}</Badge>
          <Badge variant="success">{s.badges.success}</Badge>
          <Badge variant="warning">{s.badges.warning}</Badge>
          <Badge variant="info">{s.badges.info}</Badge>
          <Badge variant="destructive">{s.badges.destructive}</Badge>
        </div>
      </Section>

      <Section title={copy.sections.tabs}>
        <Tabs defaultValue="visit">
          <TabsList>
            <TabsTrigger value="visit">{s.tabs.visit}</TabsTrigger>
            <TabsTrigger value="saved">{s.tabs.saved}</TabsTrigger>
            <TabsTrigger value="reviews">{s.tabs.reviews}</TabsTrigger>
          </TabsList>
          <TabsContent
            value="visit"
            className="type-body-sm text-muted-foreground"
          >
            {s.panel.visit}
          </TabsContent>
          <TabsContent
            value="saved"
            className="type-body-sm text-muted-foreground"
          >
            {s.panel.saved}
          </TabsContent>
          <TabsContent
            value="reviews"
            className="type-body-sm text-muted-foreground"
          >
            {s.panel.reviews}
          </TabsContent>
        </Tabs>
        <Tabs defaultValue="list">
          <TabsList variant="segment">
            <TabsTrigger value="list">{s.segment.list}</TabsTrigger>
            <TabsTrigger value="map">{s.segment.map}</TabsTrigger>
          </TabsList>
        </Tabs>
      </Section>

      <Section title={copy.sections.slider}>
        <Slider
          label={s.walk}
          defaultValue={10}
          min={5}
          max={20}
          formatValue={formatWalkMinutes}
        />
        <Slider
          label={s.budget}
          defaultValue={[8000, 12000]}
          min={5000}
          max={30000}
          step={1000}
          formatValue={formatShortWon}
        />
        <Slider
          label={s.walk}
          defaultValue={15}
          min={5}
          max={20}
          disabled
          formatValue={formatWalkMinutes}
        />
      </Section>

      <Section title={copy.sections.input}>
        <label className="flex flex-col gap-2">
          <span className="type-label">{s.nickname}</span>
          <Input placeholder={s.nicknamePlaceholder} />
        </label>
        <label className="flex flex-col gap-2">
          <span className="type-label">{s.nickname}</span>
          <Input
            defaultValue="a"
            aria-invalid
            aria-describedby="nickname-error"
          />
          <span id="nickname-error" className="type-caption text-destructive">
            {s.nicknameError}
          </span>
        </label>
      </Section>

      <Section title={copy.sections.skeleton}>
        <div
          aria-busy
          aria-label={commonCopy.states.loading.label}
          className="flex flex-col gap-4 rounded-card border border-border bg-card p-7"
        >
          <div className="flex items-start justify-between gap-4">
            <div className="flex flex-1 flex-col gap-3">
              <Skeleton className="h-3 w-12" />
              <Skeleton className="h-6 w-3/4" />
            </div>
            <Skeleton className="size-20 rounded-full" />
          </div>
          <div className="grid grid-cols-3 gap-4">
            <Skeleton className="h-8" />
            <Skeleton className="h-8" />
            <Skeleton className="h-8" />
          </div>
          <Skeleton className="h-4 w-2/3" />
        </div>
      </Section>

      <Section title={copy.sections.avatar}>
        <div className="flex items-center gap-4">
          <Avatar size="sm">
            <AvatarFallback>민</AvatarFallback>
          </Avatar>
          <Avatar>
            <AvatarFallback>지</AvatarFallback>
          </Avatar>
          <Avatar size="lg">
            <AvatarFallback>하</AvatarFallback>
          </Avatar>
          <Avatar size="xl">
            <AvatarFallback>윤</AvatarFallback>
          </Avatar>
          <AvatarGroup>
            <Avatar>
              <AvatarFallback>가</AvatarFallback>
            </Avatar>
            <Avatar>
              <AvatarFallback>나</AvatarFallback>
            </Avatar>
            <Avatar>
              <AvatarFallback>다</AvatarFallback>
            </Avatar>
          </AvatarGroup>
        </div>
      </Section>

      <Section title={copy.sections.overlay}>
        <div className="flex flex-wrap items-center gap-3">
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
                description: commonCopy.states.error.body,
                action: { label: commonCopy.actions.retry, onClick: () => {} },
              })
            }
          >
            {s.toastError}
          </Button>
        </div>
      </Section>

      <Section title={copy.sections.dialog}>
        <div className="flex flex-wrap gap-3">
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
        </div>
      </Section>

      <Toaster />
    </TooltipProvider>
  );
}
