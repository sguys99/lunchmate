// 나 탭 공용 조각 (T4.27). 서버 컴포넌트에서도 쓰는 마크업만(상태, 이벤트 없음).
// '나' 화면 전용 시안은 6단계 "피드백, 나, 제보"에서 만든다. 그 전까지는 기존 토큰과 규칙만으로 정돈한 뼈대다:
// 카드 면 없이 헤어라인 목록(약관 화면과 같은 말투), 섹션 이름 caption, 줄 높이 56 이상, 오른쪽 값은 muted.
import { ChevronRight } from "lucide-react";
import Link from "next/link";
import type { ReactNode } from "react";
import { focusRing } from "@/components/ui/interaction";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

/** 섹션: caption 제목 + 헤어라인으로 나눈 줄 목록 */
export function SettingsSection({
  title,
  children,
  className,
}: {
  title: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section className={cn("flex flex-col gap-2", className)}>
      <h2 className="type-caption text-muted-foreground">{title}</h2>
      <ul className="flex flex-col divide-y divide-border border-y border-border">
        {children}
      </ul>
    </section>
  );
}

const rowClass =
  "flex min-h-14 w-full items-center justify-between gap-4 py-3 text-left";

/** 다른 화면으로 가는 줄: 이름 + 값(muted) + 오른쪽 화살표 */
export function SettingsLinkRow({
  href,
  label,
  value,
  external,
}: {
  href: string;
  label: string;
  value?: ReactNode;
  /** 약관처럼 앱 셸 밖 화면 */
  external?: boolean;
}) {
  return (
    <li>
      <Link
        href={href}
        prefetch={external ? false : undefined}
        className={cn(rowClass, "group hover:text-foreground", focusRing)}
      >
        <span className="shrink-0 type-body">{label}</span>
        <span className="flex min-w-0 items-center gap-1.5 text-muted-foreground">
          {value !== undefined ? (
            <span className="truncate type-body-sm">{value}</span>
          ) : null}
          <ChevronRight
            aria-hidden
            className="size-4 shrink-0"
            strokeWidth={1.75}
          />
        </span>
      </Link>
    </li>
  );
}

/** 이동 없는 줄(오른쪽에 컨트롤) */
export function SettingsRow({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return <li className={cn(rowClass, className)}>{children}</li>;
}

/** 하위 화면의 제목 아래 설명 한 줄 */
export function SettingsLead({ children }: { children: ReactNode }) {
  return (
    <p className="mt-3 type-body-sm break-keep text-muted-foreground">
      {children}
    </p>
  );
}

/** 로딩: 섹션 수만큼 caption 막대 + 줄 막대 */
export function SettingsSkeleton({
  label,
  sections = 2,
  rows = 3,
}: {
  label: string;
  sections?: number;
  rows?: number;
}) {
  return (
    <div
      role="status"
      aria-busy
      aria-label={label}
      className="mt-8 flex flex-col gap-10"
    >
      {Array.from({ length: sections }, (_, s) => (
        <div key={s} className="flex flex-col gap-2">
          <Skeleton className="h-3 w-16" />
          <div className="flex flex-col divide-y divide-border border-y border-border">
            {Array.from({ length: rows }, (_, r) => (
              <div
                key={r}
                className="flex min-h-14 items-center justify-between"
              >
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-3.5 w-20" />
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
