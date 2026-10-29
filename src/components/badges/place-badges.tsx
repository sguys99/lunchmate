"use client";
// 공통 도메인 배지 (T2.9, 색 체계는 G3에서 calm으로 확정, design-decisions D-05 안건 1).
// T2.5 Badge(면 없음, 1px 테두리 + caption 글자) 위에 만든다.
//
// - 색(calm): 의미 색은 기피 경고(warning) 하나만 쓴다. 웨이팅 3단계, 할인, 제보, 추정은 중립(`neutral`: input 선 + foreground 글자,
//   아이콘 muted-foreground)이다. 주황이 보이면 곧 "같이 못 먹는 사람이 있음"이라는 뜻이 되게 하고, 올리브 단일 포인트의 고요함을 지킨다.
//   T3.2에서 비교한 current(웨이팅 주황, 바로 입장 초록, 할인 파랑)는 쓰지 않는다(docs/design/g3-card-rules.md 3절).
// - 색만으로 구분하지 않는다: 라벨 글자가 모두 다르고, 웨이팅 단계, 할인, 기피 경고에는 Lucide 아이콘을 붙인다.
//   기피 경고는 PRD POLL-13의 "⚠" 이모지 대신 TriangleAlert 아이콘이다(copy-guide 결정).
// - 대비: 글자 foreground, warning-foreground, 아이콘 muted-foreground가 card, background 위에서 기준 이상(badge-contrast.test.ts).
// - 스크린 리더: 보이는 글자와 아이콘은 aria-hidden, 대신 sr-only로 "추정 가격"처럼 무엇에 대한 배지인지 읽힌다.
// - 툴팁: withTooltip이면 배지가 포커스를 받고(키보드), 설명 문장을 T2.5 Tooltip으로 보여준다.
//   터치 기기에는 hover가 없으니 꼭 알아야 하는 고지(DEAL-02)는 상세 화면 본문에도 따로 둔다.
//   주의(T5.17): 이 파일은 Tooltip을 정적으로 불러 홈 첫 로드에 약 46KB가 붙는다. 홈 카드에 쓰기 전에 툴팁 경로를 지연 로딩으로 나눈다.
// - 카드당 최대 2개는 PlaceBadges가 pickBadges로 지킨다. 추정은 배지 줄 대신 가격 옆 EstimateMark(estimate-mark.tsx)로 붙는다(T3.2).
import {
  BadgePercentIcon,
  DoorOpenIcon,
  HourglassIcon,
  type LucideIcon,
  TriangleAlertIcon,
  UsersRoundIcon,
} from "lucide-react";
import type { ReactNode } from "react";
import { Badge, type BadgeProps } from "@/components/ui/badge";
import { focusRing } from "@/components/ui/interaction";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { badgeCopy } from "@/copy/badges";
import { cn } from "@/lib/utils";
import {
  MAX_CARD_BADGES,
  type PlaceBadge,
  type WaitingLevel,
  pickBadges,
} from "./pick-badges";

/** 쓰는 색은 둘뿐이다: 기피 경고 warning, 나머지 neutral */
type Tone = Extract<NonNullable<BadgeProps["variant"]>, "warning" | "neutral">;

type CommonProps = {
  /** 설명 문장을 툴팁으로 보여준다. 켜면 배지가 키보드 포커스를 받는다 */
  withTooltip?: boolean;
  className?: string;
};

type DomainBadgeProps = CommonProps & {
  kind: PlaceBadge["kind"];
  tone: Tone;
  label: string;
  srLabel: string;
  description: string;
  icon?: LucideIcon;
};

function DomainBadge({
  kind,
  tone,
  label,
  srLabel,
  description,
  icon: Icon,
  withTooltip = false,
  className,
}: DomainBadgeProps) {
  const content: ReactNode = (
    <>
      {Icon ? <Icon aria-hidden strokeWidth={1.75} /> : null}
      <span aria-hidden>{label}</span>
      <span className="sr-only">{srLabel}</span>
    </>
  );
  const badge = (
    <Badge variant={tone} data-badge={kind} className={className}>
      {content}
    </Badge>
  );
  if (!withTooltip) return badge;
  return (
    <Tooltip>
      <TooltipTrigger
        render={
          <Badge
            variant={tone}
            data-badge={kind}
            tabIndex={0}
            className={cn("cursor-default", focusRing, className)}
          />
        }
      >
        {content}
      </TooltipTrigger>
      <TooltipContent>{description}</TooltipContent>
    </Tooltip>
  );
}

/** PLACE-02: 제보 가격이 없어 카테고리 추정값을 보여줄 때 */
export function EstimateBadge(props: CommonProps) {
  return (
    <DomainBadge
      kind="estimate"
      tone="neutral"
      label={badgeCopy.labels.estimate}
      srLabel={badgeCopy.ariaLabels.estimate}
      description={badgeCopy.descriptions.estimate}
      {...props}
    />
  );
}

/** 사용자 제보 출처 표시 (PLACE-02 제보 가격, DEAL-02/05 할인 출처) */
export function ReportBadge(props: CommonProps) {
  return (
    <DomainBadge
      kind="report"
      tone="neutral"
      label={badgeCopy.labels.report}
      srLabel={badgeCopy.ariaLabels.report}
      description={badgeCopy.descriptions.report}
      {...props}
    />
  );
}

/** DEAL-02: 유효한 할인 제보가 있을 때. 표시만 하고 추천 점수에는 반영하지 않는다 */
export function DealBadge(props: CommonProps) {
  return (
    <DomainBadge
      kind="deal"
      tone="neutral"
      icon={BadgePercentIcon}
      label={badgeCopy.labels.deal}
      srLabel={badgeCopy.ariaLabels.deal}
      description={badgeCopy.descriptions.deal}
      {...props}
    />
  );
}

/** 웨이팅 단계는 색이 아니라 아이콘과 글자로 나눈다(calm) */
const WAITING_ICON: Record<WaitingLevel, LucideIcon> = {
  walkIn: DoorOpenIcon,
  short: HourglassIcon,
  long: UsersRoundIcon,
};

/** PLACE-07: 30분 안의 최근 웨이팅 제보. minutesAgo가 있으면 "12분 전, 줄 길어요" */
export function WaitingBadge({
  level,
  minutesAgo,
  ...props
}: CommonProps & { level: WaitingLevel; minutesAgo?: number }) {
  const levelLabel = badgeCopy.waitingLevels[level];
  const text =
    minutesAgo === undefined
      ? levelLabel
      : badgeCopy.waitingReport(
          Math.max(0, Math.round(minutesAgo)),
          levelLabel,
        );
  return (
    <DomainBadge
      kind="waiting"
      tone="neutral"
      icon={WAITING_ICON[level]}
      label={text}
      srLabel={badgeCopy.ariaLabels.waiting(text)}
      description={badgeCopy.descriptions.waiting}
      {...props}
    />
  );
}

/** POLL-13: 참여자 누군가의 기피 항목에 걸리는 후보. 누구인지, 무엇인지는 보여주지 않는다 */
export function AvoidWarningBadge(props: CommonProps) {
  return (
    <DomainBadge
      kind="avoidWarning"
      tone="warning"
      icon={TriangleAlertIcon}
      label={badgeCopy.labels.avoidWarning}
      srLabel={badgeCopy.ariaLabels.avoidWarning}
      description={badgeCopy.descriptions.avoidWarning}
      {...props}
    />
  );
}

/** PlaceBadge 데이터 하나를 알맞은 배지 컴포넌트로 */
export function BadgeFor({
  badge,
  ...props
}: CommonProps & { badge: PlaceBadge }) {
  switch (badge.kind) {
    case "estimate":
      return <EstimateBadge {...props} />;
    case "report":
      return <ReportBadge {...props} />;
    case "deal":
      return <DealBadge {...props} />;
    case "waiting":
      return (
        <WaitingBadge
          level={badge.level}
          minutesAgo={badge.minutesAgo}
          {...props}
        />
      );
    case "avoidWarning":
      return <AvoidWarningBadge {...props} />;
  }
}

/**
 * 카드의 배지 한 줄(DESIGN.md 5장: 식당명 아래, 왼쪽 정렬, 최대 2개).
 * 후보를 다 넘기면 pickBadges 우선순위(기피 > 웨이팅 > 할인 > 제보, T3.2)로 max개만 그린다.
 * 추정은 배지 줄에 오지 않는다. 가격 숫자 옆에 EstimateBadge나 그에 맞는 표시를 따로 둔다.
 * 남는 배지가 없으면 아무것도 그리지 않는다.
 */
export function PlaceBadges({
  badges,
  max = MAX_CARD_BADGES,
  withTooltip = false,
  className,
}: {
  badges: readonly PlaceBadge[];
  max?: number;
  withTooltip?: boolean;
  className?: string;
}) {
  const picked = pickBadges(badges, max);
  if (picked.length === 0) return null;
  return (
    <ul className={cn("flex flex-wrap items-center gap-2", className)}>
      {picked.map((badge) => (
        <li key={badge.kind} className="flex">
          <BadgeFor badge={badge} withTooltip={withTooltip} />
        </li>
      ))}
    </ul>
  );
}
