// 빈 상태, 오류, 오프라인 (T2.7, docs/copy-guide.md 4.2~4.4, PRD 12장, APP-02).
//
//   <EmptyState title body action={{ label: "15분까지 넓히기", onClick }} visual={<CategoryIllustration slug="gukbap" />} />
//   <ErrorState action={{ onClick: refetch }} />            문구와 버튼 라벨은 commonCopy 기본값
//   <OfflineState />                                         버튼 없이 안내만
//
// 구성: 그림(96px, 선택) → 제목(heading 세리프, 습니다체 마침표 없음) → 설명(body-sm, 다음 행동) → 버튼 1개(선택).
// 왼쪽 정렬(가운데 정렬 긴 문단 금지). 버튼은 secondary가 기본이고, 화면의 유일한 주 행동일 때만 primary로 올린다.
// 그림 기본값은 일러스트와 같은 서명(같은 자리의 옅은 원 + 1.4 선)의 Lucide 아이콘. visual={null}이면 그림 없음.
//
// 접근성: 오류는 제목과 설명을 role="alert"로, 오프라인은 role="status"로 알린다(버튼은 live region 밖).
// 빈 상태는 결과이지 사건이 아니라서 live region을 두지 않는다. 각 상태는 제목으로 이름 붙은 section이다.
import { CloudOff, Utensils, WifiOff, type LucideIcon } from "lucide-react";
import Link from "next/link";
import { useId, type ReactNode } from "react";
import { Button, buttonVariants } from "@/components/ui/button";
import { commonCopy } from "@/copy/common";
import { cn } from "@/lib/utils";

/* ---------- 그림 ---------- */

/**
 * 상태 아이콘. 카테고리 일러스트와 같은 96px 상자, 같은 자리(중심 40,42, 반지름 25)의 옅은 원 위에 1.4 선 아이콘.
 * 그래서 일러스트와 아이콘을 바꿔 끼워도 제목 위치가 같다.
 */
export function StateGlyph({
  icon: Icon,
  className,
}: {
  icon: LucideIcon;
  className?: string;
}) {
  return (
    <span
      aria-hidden
      data-slot="state-glyph"
      className={cn("relative block size-24 shrink-0", className)}
    >
      <span className="absolute top-[17px] left-[15px] size-[50px] rounded-full bg-muted" />
      <Icon
        className="absolute top-[24px] left-[22px] size-9 text-muted-foreground"
        strokeWidth={1.4}
      />
    </span>
  );
}

/* ---------- 버튼 ---------- */

export type StateAction = {
  label: string;
  /** 같은 화면 안의 동작(다시 시도, 넓히기) */
  onClick?: () => void;
  /** 다른 화면으로 가는 동작(오늘 추천으로). 내부 경로만 */
  href?: string;
  /** 기본 secondary. 화면에 다른 주 버튼이 없을 때만 primary */
  variant?: "secondary" | "primary";
};

/** 오류와 오프라인은 라벨을 생략하면 commonCopy 기본 라벨("다시 시도")을 쓴다 */
export type StateActionWithDefaultLabel = Omit<StateAction, "label"> & {
  label?: string;
};

function ActionButton({ action }: { action: StateAction }) {
  const variant = action.variant ?? "secondary";
  if (action.href) {
    return (
      <Link
        href={action.href}
        onClick={action.onClick}
        data-slot="state-action"
        className={cn(buttonVariants({ variant }), "mt-7")}
      >
        {action.label}
      </Link>
    );
  }
  return (
    <Button
      variant={variant}
      onClick={action.onClick}
      data-slot="state-action"
      className="mt-7"
    >
      {action.label}
    </Button>
  );
}

/* ---------- 공통 틀 ---------- */

type StateMessageBaseProps = {
  title?: string;
  /** 설명. 제목을 되풀이하지 않고 다음에 일어날 일이나 할 일만 */
  body?: ReactNode;
  /** 그림 슬롯. 생략하면 상태별 기본 아이콘, null이면 그림 없음 */
  visual?: ReactNode;
  /** 문서 구조에 맞춰 h2(화면 본문) 또는 h3(카드, 시트 안) */
  headingLevel?: "h2" | "h3";
  className?: string;
};

function StateMessage({
  kind,
  title,
  body,
  visual,
  action,
  headingLevel = "h2",
  live,
  className,
}: Omit<StateMessageBaseProps, "title"> & {
  kind: "empty" | "error" | "offline";
  title: string;
  action?: StateAction;
  live?: "alert" | "status";
}) {
  const titleId = useId();
  const Heading = headingLevel;
  return (
    <section
      aria-labelledby={titleId}
      data-slot="state-message"
      data-state={kind}
      className={cn("flex flex-col items-start", className)}
    >
      {/* 그림 상자 안 원이 15px 안쪽에 있어, 8px 당겨 원이 글줄 왼쪽 근처에 오게 한다 */}
      {visual ? <div className="-ml-2">{visual}</div> : null}
      <div role={live} className="flex flex-col gap-3 pt-3">
        <Heading
          id={titleId}
          className="type-heading text-balance break-keep text-foreground"
        >
          {title}
        </Heading>
        {body ? (
          <p className="type-body-sm break-keep text-muted-foreground">
            {body}
          </p>
        ) : null}
      </div>
      {action ? <ActionButton action={action} /> : null}
    </section>
  );
}

/** visual이 undefined면 기본값, null이면 없음 */
function resolveVisual(visual: ReactNode | undefined, fallback: LucideIcon) {
  return visual === undefined ? <StateGlyph icon={fallback} /> : visual;
}

function withDefaultLabel(
  action: StateActionWithDefaultLabel | undefined,
  label: string,
): StateAction | undefined {
  return action ? { ...action, label: action.label ?? label } : undefined;
}

/* ---------- 빈 상태 ---------- */

export type EmptyStateProps = StateMessageBaseProps & {
  /** 빈 상태 버튼은 제안을 명사형으로 바꾼 도메인 문구라 기본 라벨이 없다(copy-guide 4.2) */
  action?: StateAction;
};

/** 결과가 0건일 때. 지금 상태(습니다체) + 할 수 있는 일(해요체 제안) + 버튼 하나 */
export function EmptyState({
  title = commonCopy.states.empty.title,
  body = commonCopy.states.empty.body,
  visual,
  ...props
}: EmptyStateProps) {
  return (
    <StateMessage
      kind="empty"
      title={title}
      body={body}
      visual={resolveVisual(visual, Utensils)}
      {...props}
    />
  );
}

/* ---------- 오류 ---------- */

export type ErrorStateProps = StateMessageBaseProps & {
  /** 보통 { onClick: refetch }. 라벨 기본 "다시 시도" */
  action?: StateActionWithDefaultLabel;
};

/** 불러오기나 저장이 실패했을 때. 무엇이 안 됐는지 + 다음 행동. 오류 코드와 기술 용어는 보여 주지 않는다 */
export function ErrorState({
  title = commonCopy.states.error.title,
  body = commonCopy.states.error.body,
  visual,
  action,
  ...props
}: ErrorStateProps) {
  return (
    <StateMessage
      kind="error"
      live="alert"
      title={title}
      body={body}
      visual={resolveVisual(visual, CloudOff)}
      action={withDefaultLabel(action, commonCopy.states.error.action)}
      {...props}
    />
  );
}

/* ---------- 오프라인 ---------- */

export type OfflineStateProps = StateMessageBaseProps & {
  /** 연결이 돌아오면 자동으로 다시 불러오므로 선택. 라벨 기본 "다시 시도" */
  action?: StateActionWithDefaultLabel;
};

/** 연결이 끊겼을 때 (useOnlineStatus가 false). 연결되면 자동으로 다시 불러온다는 안내가 기본 */
export function OfflineState({
  title = commonCopy.states.offline.title,
  body = commonCopy.states.offline.body,
  visual,
  action,
  ...props
}: OfflineStateProps) {
  return (
    <StateMessage
      kind="offline"
      live="status"
      title={title}
      body={body}
      visual={resolveVisual(visual, WifiOff)}
      action={withDefaultLabel(action, commonCopy.states.offline.action)}
      {...props}
    />
  );
}
