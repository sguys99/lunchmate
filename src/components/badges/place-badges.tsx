"use client";
// 공통 도메인 배지 (T2.9): 추정, 제보, 할인, 웨이팅 3단계, 투표 기피 경고.
// T2.5 Badge(면 없음, 1px 의미 색 테두리 + *-foreground 글자, caption) 위에 만든다.
//
// - 색: DESIGN.md 2장 의미 색. warning은 웨이팅, 기피 경고, 추정 가격. info는 할인, 제보 같은 중립 안내.
//   웨이팅 "바로 입장"만 좋은 소식이라 success로 둔다.
// - 색만으로 구분하지 않는다: 라벨 글자가 모두 다르고, 웨이팅 단계와 기피 경고에는 Lucide 아이콘을 붙인다.
//   기피 경고는 PRD POLL-13의 "⚠" 이모지 대신 TriangleAlert 아이콘이다(copy-guide 결정).
// - 대비: 글자 *-foreground는 background, card, popover 위에서 라이트 8.5 이상, 다크 10.9 이상.
//   테두리 실색은 비텍스트 기준 3:1을 넘는다(warning on card 4.29가 최저). 수치는 T2.9 보고 참고.
// - 스크린 리더: 보이는 글자와 아이콘은 aria-hidden, 대신 sr-only로 "추정 가격"처럼 무엇에 대한 배지인지 읽힌다.
// - 툴팁: withTooltip이면 배지가 포커스를 받고(키보드), 설명 문장을 T2.5 Tooltip으로 보여준다.
//   터치 기기에는 hover가 없으니 꼭 알아야 하는 고지(DEAL-02)는 상세 화면 본문에도 따로 둔다.
// - 카드당 최대 2개는 PlaceBadges가 pickBadges로 지킨다. 추정은 배지 줄 대신 가격 옆에 붙는다(T3.2).
import {
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

type Tone = NonNullable<BadgeProps["variant"]>;

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
      tone="warning"
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
      tone="info"
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
      tone="info"
      label={badgeCopy.labels.deal}
      srLabel={badgeCopy.ariaLabels.deal}
      description={badgeCopy.descriptions.deal}
      {...props}
    />
  );
}

const WAITING_STYLE: Record<WaitingLevel, { tone: Tone; icon: LucideIcon }> = {
  walkIn: { tone: "success", icon: DoorOpenIcon },
  short: { tone: "warning", icon: HourglassIcon },
  long: { tone: "warning", icon: UsersRoundIcon },
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
  const style = WAITING_STYLE[level];
  return (
    <DomainBadge
      kind="waiting"
      tone={style.tone}
      icon={style.icon}
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
