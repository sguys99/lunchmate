"use client";
// 공통 4상태 확인 화면 (T2.7). 목업 문구만 쓴다. 버튼을 누르면 토스트 대신 아래 한 줄로 알린다.
import { useState, type ReactNode } from "react";
import {
  CardSkeleton,
  EmptyState,
  ErrorState,
  ListSkeleton,
  OfflineState,
  SheetSkeleton,
} from "@/components/states";
import { designLabStatesCopy as copy } from "@/copy/design-lab-states";
import { commonCopy } from "@/copy/common";
import { CategoryIllustration } from "@/features/place/illustrations";
import { useOnlineStatus } from "@/lib/network";

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="flex flex-col gap-5">
      <h2 className="type-caption text-muted-foreground">{title}</h2>
      {children}
    </section>
  );
}

export function StatesGallery() {
  const online = useOnlineStatus();
  const [pressed, setPressed] = useState("");
  const press = (label: string) => () => setPressed(copy.pressed(label));

  return (
    <>
      <Section title={copy.sections.card}>
        <CardSkeleton />
      </Section>

      <Section title={copy.sections.list}>
        <ListSkeleton rows={4} />
      </Section>

      <Section title={copy.sections.sheet}>
        {/* 시트 모양 틀: 위쪽 라운드, popover 면, 손잡이. 안쪽 여백은 시트가 준다 */}
        <div className="-mx-6 rounded-t-sheet bg-popover px-(--lm-layout-gutter) pt-3 shadow-sheet">
          <div className="mx-auto mb-5 h-1 w-9 rounded-full bg-border" />
          <SheetSkeleton />
        </div>
      </Section>

      <Section title={copy.sections.empty}>
        <EmptyState />
      </Section>

      <Section title={copy.sections.emptyDomain}>
        <div className="rounded-card border border-border bg-card px-7 pt-6 pb-8">
          <EmptyState
            title={copy.emptySample.title}
            body={copy.emptySample.body}
            visual={<CategoryIllustration slug="gukbap" />}
            action={{
              label: copy.emptySample.action,
              variant: "primary",
              onClick: press(copy.emptySample.action),
            }}
          />
        </div>
      </Section>

      <Section title={copy.sections.error}>
        <ErrorState
          action={{ onClick: press(commonCopy.states.error.action) }}
        />
      </Section>

      <Section title={copy.sections.offline}>
        <OfflineState
          action={{ onClick: press(commonCopy.states.offline.action) }}
        />
      </Section>

      <Section title={copy.sections.online}>
        {online ? (
          <p className="type-body-sm text-muted-foreground">{copy.onlineNow}</p>
        ) : (
          <OfflineState headingLevel="h3" />
        )}
      </Section>

      <p aria-live="polite" className="type-caption text-muted-foreground">
        {pressed}
      </p>
    </>
  );
}
