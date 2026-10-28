"use client";
// 공통 배지 확인 화면 (T2.9). 목업 데이터만 쓴다.
import type { ReactNode } from "react";
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
import { TooltipProvider } from "@/components/ui/tooltip";
import { designLabBadgesCopy as copy } from "@/copy/design-lab-badges";

const CANDIDATES: PlaceBadge[] = [
  { kind: "deal" },
  { kind: "report" },
  { kind: "waiting", level: "long", minutesAgo: 12 },
  { kind: "estimate" },
];

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="flex flex-col gap-4">
      <h2 className="type-caption text-muted-foreground">{title}</h2>
      {children}
    </section>
  );
}

function Row({ children }: { children: ReactNode }) {
  return <div className="flex flex-wrap items-center gap-2">{children}</div>;
}

export function BadgesGallery() {
  return (
    <TooltipProvider>
      <Section title={copy.sections.all}>
        <Row>
          <EstimateBadge />
          <ReportBadge />
          <DealBadge />
          <WaitingBadge level="long" />
          <AvoidWarningBadge />
        </Row>
      </Section>

      <Section title={copy.sections.waiting}>
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
      </Section>

      <Section title={copy.sections.tooltip}>
        <p className="type-body-sm text-muted-foreground">{copy.tooltipHint}</p>
        <Row>
          <EstimateBadge withTooltip />
          <DealBadge withTooltip />
          <WaitingBadge level="short" minutesAgo={8} withTooltip />
          <AvoidWarningBadge withTooltip />
        </Row>
      </Section>

      <Section title={copy.sections.card}>
        <div className="flex flex-col gap-3 rounded-card border border-border bg-card p-5 text-card-foreground">
          <p className="type-heading">{copy.sampleName}</p>
          <PlaceBadges badges={CANDIDATES} />
        </div>
        <div className="flex flex-col gap-2">
          <span className="type-caption text-muted-foreground">
            {copy.candidatesLabel}
          </span>
          <Row>
            {CANDIDATES.map((badge) => (
              <BadgeFor key={badge.kind} badge={badge} />
            ))}
          </Row>
        </div>
      </Section>

      <Section title={copy.sections.priority}>
        <ol className="flex flex-col gap-1 type-body-sm text-muted-foreground tabular-nums">
          {BADGE_PRIORITY.map((key, i) => (
            <li key={key}>
              {i + 1}. <code>{key}</code>
            </li>
          ))}
        </ol>
      </Section>
    </TooltipProvider>
  );
}
