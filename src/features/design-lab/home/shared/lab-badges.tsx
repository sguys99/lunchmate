"use client";
// 홈 시안 배지 색 비교 (T3.2, D-04 안건). 공용 배지(T2.9)의 기본값은 그대로 두고 design-lab 안에서만 두 체계를 바꿔 본다.
// - current: 공용 PlaceBadges 그대로(웨이팅, 기피 warning 주황, 할인 info 파랑, 바로 입장 success 초록).
// - calm: 의미 색은 기피 경고(warning) 하나만. 웨이팅과 할인은 중립 선(input)과 본문 글자(foreground)에
//   단계별 아이콘(muted-foreground)으로 구분한다. 색이 빠진 만큼 할인에도 아이콘(BadgePercent)을 붙인다.
// 고르는 규칙(최대 2개, 기피 > 웨이팅 > 할인, 추정은 가격 옆)은 두 체계 모두 공용 pickBadges를 쓴다.
// G3에서 calm을 고르면 T3.8에서 공용 place-badges.tsx의 tone 표로 옮기고 이 파일은 지운다.
import {
  BadgePercentIcon,
  DoorOpenIcon,
  HourglassIcon,
  type LucideIcon,
  TriangleAlertIcon,
  UsersRoundIcon,
} from "lucide-react";
import { PlaceBadges } from "@/components/badges/place-badges";
import {
  type PlaceBadge,
  type WaitingLevel,
  MAX_CARD_BADGES,
  pickBadges,
} from "@/components/badges/pick-badges";
import { Badge } from "@/components/ui/badge";
import { badgeCopy } from "@/copy/badges";
import { cn } from "@/lib/utils";
import type { BadgePalette } from "./lab-options";

type CalmSpec = {
  tone: "warning" | "neutral";
  label: string;
  srLabel: string;
  icon?: LucideIcon;
};

const WAITING_ICON: Record<WaitingLevel, LucideIcon> = {
  walkIn: DoorOpenIcon,
  short: HourglassIcon,
  long: UsersRoundIcon,
};

function calmSpec(badge: PlaceBadge): CalmSpec {
  switch (badge.kind) {
    case "avoidWarning":
      return {
        tone: "warning",
        label: badgeCopy.labels.avoidWarning,
        srLabel: badgeCopy.ariaLabels.avoidWarning,
        icon: TriangleAlertIcon,
      };
    case "waiting": {
      const level = badgeCopy.waitingLevels[badge.level];
      const text =
        badge.minutesAgo === undefined
          ? level
          : badgeCopy.waitingReport(
              Math.max(0, Math.round(badge.minutesAgo)),
              level,
            );
      return {
        tone: "neutral",
        label: text,
        srLabel: badgeCopy.ariaLabels.waiting(text),
        icon: WAITING_ICON[badge.level],
      };
    }
    case "deal":
      return {
        tone: "neutral",
        label: badgeCopy.labels.deal,
        srLabel: badgeCopy.ariaLabels.deal,
        icon: BadgePercentIcon,
      };
    case "estimate":
      return {
        tone: "neutral",
        label: badgeCopy.labels.estimate,
        srLabel: badgeCopy.ariaLabels.estimate,
      };
    case "report":
      return {
        tone: "neutral",
        label: badgeCopy.labels.report,
        srLabel: badgeCopy.ariaLabels.report,
      };
  }
}

function CalmBadge({ badge }: { badge: PlaceBadge }) {
  const spec = calmSpec(badge);
  const Icon = spec.icon;
  return (
    <Badge
      variant={spec.tone === "warning" ? "warning" : "default"}
      data-badge={badge.kind}
      data-palette="calm"
      className={cn(
        spec.tone === "neutral" && "border-input [&>svg]:text-muted-foreground",
      )}
    >
      {Icon ? <Icon aria-hidden strokeWidth={1.75} /> : null}
      <span aria-hidden>{spec.label}</span>
      <span className="sr-only">{spec.srLabel}</span>
    </Badge>
  );
}

/** 배지 줄 (최대 2개). palette에 따라 공용 PlaceBadges 또는 calm 체계로 그린다 */
export function LabPlaceBadges({
  badges,
  palette,
  max = MAX_CARD_BADGES,
  className,
}: {
  badges: readonly PlaceBadge[];
  palette: BadgePalette;
  max?: number;
  className?: string;
}) {
  if (palette === "current") {
    return <PlaceBadges badges={badges} max={max} className={className} />;
  }
  const picked = pickBadges(badges, max);
  if (picked.length === 0) return null;
  return (
    <ul className={cn("flex flex-wrap items-center gap-2", className)}>
      {picked.map((badge) => (
        <li key={badge.kind} className="flex">
          <CalmBadge badge={badge} />
        </li>
      ))}
    </ul>
  );
}

/**
 * 가격 옆 "추정" 표시 (T3.2: 추정은 배지 줄 대신 가격 칸에 붙는다, PRD PLACE-02).
 * 테두리 없는 caption 글자 하나. current는 지금 추정 배지와 같은 warning 글자, calm은 보조 글자.
 */
export function EstimateMark({
  palette,
  className,
}: {
  palette: BadgePalette;
  className?: string;
}) {
  return (
    <span
      data-estimate-mark={palette}
      className={cn(
        "type-caption whitespace-nowrap",
        palette === "calm"
          ? "text-muted-foreground"
          : "text-warning-foreground",
        className,
      )}
    >
      <span aria-hidden>{badgeCopy.labels.estimate}</span>
      <span className="sr-only">{badgeCopy.ariaLabels.estimate}</span>
    </span>
  );
}
