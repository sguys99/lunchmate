// 온보딩 시안 안내 조각 (T4.1): 아이콘 + 제목 + 설명. 빨간 면 없이 아이콘과 글자만(DESIGN.md 2장 의미 색).
// tone: info(정책 고지, 안내) / status(권한, 오프라인, role=status) / error(role=alert).
import {
  CloudOff,
  LocateOff,
  ShieldCheck,
  WifiOff,
  type LucideIcon,
} from "lucide-react";
import { onboardingLabCopy } from "@/copy/design-lab-onboarding";
import { cn } from "@/lib/utils";

const copy = onboardingLabCopy;

export function Note({
  icon: Icon,
  title,
  body,
  live,
  className,
  id,
}: {
  icon: LucideIcon;
  title?: string;
  body: string;
  live?: "status" | "alert";
  className?: string;
  id?: string;
}) {
  return (
    <div
      id={id}
      role={live}
      className={cn("flex items-start gap-2.5", className)}
    >
      <Icon
        aria-hidden
        className={cn(
          "mt-0.5 size-4 shrink-0",
          live === "alert" ? "text-destructive" : "text-muted-foreground",
        )}
        strokeWidth={1.5}
      />
      <div className="flex min-w-0 flex-col gap-0.5">
        {title ? <p className="type-label break-keep">{title}</p> : null}
        <p className="type-caption break-keep text-muted-foreground">{body}</p>
      </div>
    </div>
  );
}

/** 저장 고지(ONB-01): 검색은 이동에만, 저장은 핀만 */
export function PinPolicyNote({ className }: { className?: string }) {
  return (
    <Note
      icon={ShieldCheck}
      body={copy.location.pinNotice}
      className={className}
    />
  );
}

/** 위치 권한 거부 (AC-ONB-2) */
export function PermDeniedNote({ className }: { className?: string }) {
  return (
    <Note
      icon={LocateOff}
      live="status"
      title={copy.location.permDenied.title}
      body={copy.location.permDenied.body}
      className={className}
    />
  );
}

export function OfflineNote({ className }: { className?: string }) {
  return (
    <Note
      icon={WifiOff}
      live="status"
      title={copy.states.offline.title}
      body={copy.states.offline.body}
      className={className}
    />
  );
}

export function SaveErrorNote({ className }: { className?: string }) {
  return (
    <Note
      icon={CloudOff}
      live="alert"
      title={copy.states.saveError.title}
      body={copy.states.saveError.body}
      className={className}
    />
  );
}

/** 핀을 놓기 전 저장 버튼 설명 */
export function NeedPinNote({
  id,
  className,
}: {
  id: string;
  className?: string;
}) {
  return (
    <p id={id} className={cn("type-caption text-muted-foreground", className)}>
      {copy.location.needPin}
    </p>
  );
}
