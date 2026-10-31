"use client";
// 배지 설명 툴팁 (T2.9, T5.17 분리). place-badges.tsx가 withTooltip일 때만 React.lazy로 받는다.
// Tooltip(Base UI)을 정적으로 부르면 배지를 쓰는 모든 화면 첫 로드에 약 46KB가 붙는다(docs/design/g3-comparison.md 2절).
// 홈 카드처럼 툴팁 없는 배지는 이 파일을 받지 않는다. 받는 동안은 같은 모양의 포커스 가능한 배지가 자리를 지킨다.
import type { ReactNode } from "react";
import { Badge, type BadgeProps } from "@/components/ui/badge";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";

export type BadgeTooltipProps = {
  variant: BadgeProps["variant"];
  kind: string;
  /** 포커스 링과 커서까지 합친 최종 className */
  className: string;
  description: string;
  children: ReactNode;
};

export default function BadgeTooltip({
  variant,
  kind,
  className,
  description,
  children,
}: BadgeTooltipProps) {
  return (
    <Tooltip>
      <TooltipTrigger
        render={
          <Badge
            variant={variant}
            data-badge={kind}
            tabIndex={0}
            className={className}
          />
        }
      >
        {children}
      </TooltipTrigger>
      <TooltipContent>{description}</TooltipContent>
    </Tooltip>
  );
}
