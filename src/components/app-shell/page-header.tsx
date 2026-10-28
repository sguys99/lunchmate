// 페이지 헤더 (T2.6). 시안 B 홈 헤더(caption 한 줄 + title 세리프)를 공통으로 뺐다.
//
// - title: h1, type-title(마루 부리 세리프). 화면당 하나.
// - eyebrow: 제목 위 caption 한 줄(날짜와 끼니 등), muted-foreground.
// - backHref: 주면 제목 위에 뒤로 링크(아이콘 버튼, 라벨 "뒤로"). 탭 첫 화면에는 주지 않는다.
// - action: 제목 줄 오른쪽 끝 자리. 아래쪽 정렬이라 제목 마지막 줄과 맞는다. primary 면 버튼은 넣지 않는다
//   (화면당 primary 1개 규칙, 주 버튼은 하단 1/3 영역).
// 좌우 여백은 쓰는 쪽(페이지 칼럼)이 정한다. 헤더는 폭 100%만 차지한다.
import { ChevronLeft } from "lucide-react";
import Link from "next/link";
import type { ReactNode } from "react";
import { commonCopy } from "@/copy/common";
import { buttonVariants } from "@/components/ui/button-variants";
import { cn } from "@/lib/utils";

export type PageHeaderProps = {
  title: ReactNode;
  eyebrow?: ReactNode;
  backHref?: string;
  action?: ReactNode;
  className?: string;
};

export function PageHeader({
  title,
  eyebrow,
  backHref,
  action,
  className,
}: PageHeaderProps) {
  return (
    <header
      data-slot="page-header"
      className={cn("flex w-full flex-col gap-4", className)}
    >
      {backHref ? (
        <Link
          href={backHref}
          aria-label={commonCopy.actions.back}
          className={cn(
            buttonVariants({ variant: "ghost", size: "icon-sm" }),
            "-ml-2.5 self-start",
          )}
        >
          <ChevronLeft
            aria-hidden
            className="size-[1.375rem]"
            strokeWidth={1.5}
          />
        </Link>
      ) : null}
      <div className="flex items-end justify-between gap-4">
        <div className="flex min-w-0 flex-col gap-2">
          {eyebrow ? (
            <p className="type-caption text-muted-foreground">{eyebrow}</p>
          ) : null}
          <h1 className="type-title break-keep text-foreground">{title}</h1>
        </div>
        {action ? <div className="shrink-0">{action}</div> : null}
      </div>
    </header>
  );
}
