"use client";
// 화면 전체 오류와 찾을 수 없음 (T2.18, APP-06). error.tsx, global-error.tsx, not-found.tsx가 쓴다.
//
// 구성: ErrorState(제목, 설명, 기본 아이콘) + 버튼 두 개 + 참고 번호(digest, 있을 때만).
// - 다시 시도는 이 화면의 유일한 주 행동이라 primary, 오늘 추천으로는 secondary(포인트 버튼 1개 규칙).
// - 모바일은 버튼을 화면 아래(엄지 쪽 1/3)로 내리고, md 이상은 글 바로 아래 가로로 둔다.
// - 오류 메시지와 스택은 보여 주지 않는다(개발 중에도 같은 화면, 상세는 콘솔과 Sentry에서 본다).
//
// 바깥 틀(여백, 폭)은 호출하는 쪽이 정한다: 앱 셸 안은 PageColumn, 셸 밖은 StandaloneFrame.
import Link from "next/link";
import { useEffect, type ReactNode } from "react";
import { Button, buttonVariants } from "@/components/ui/button";
import { commonCopy } from "@/copy/common";
import { errorDigest, reportError } from "@/lib/errors/report-error";
import { cn } from "@/lib/utils";
import { EmptyState, ErrorState } from "./messages";

const copy = commonCopy.errorPage;

function ActionRow({ children }: { children: ReactNode }) {
  return (
    <div
      data-slot="screen-actions"
      className="mt-auto flex flex-col gap-3 pt-10 md:mt-8 md:flex-row md:pt-0"
    >
      {children}
    </div>
  );
}

export type ErrorScreenProps = {
  /** error.tsx가 받은 값. Error가 아닐 수도 있다 */
  error: unknown;
  /** error.tsx의 retry(). 세그먼트를 다시 받아 그린다 */
  onRetry: () => void;
  /** 오늘 추천으로 가는 경로. 셸 안은 /today, 셸 밖은 랜딩 / */
  homeHref: string;
  className?: string;
};

export function ErrorScreen({
  error,
  onRetry,
  homeHref,
  className,
}: ErrorScreenProps) {
  useEffect(() => {
    void reportError(error);
  }, [error]);
  const digest = errorDigest(error);

  return (
    <div
      data-slot="error-screen"
      className={cn("flex flex-1 flex-col", className)}
    >
      <ErrorState title={copy.title} body={copy.body} />
      <ActionRow>
        <Button variant="primary" onClick={onRetry}>
          {copy.retry}
        </Button>
        <Link href={homeHref} className={buttonVariants()}>
          {copy.home}
        </Link>
      </ActionRow>
      {digest ? (
        <p className="mt-6 type-caption break-all text-muted-foreground tabular-nums md:mt-10">
          {copy.reference(digest)}
        </p>
      ) : null}
    </div>
  );
}

/** 없는 주소나 notFound(). 다음 행동은 오늘 추천으로 하나뿐이라 primary */
export function NotFoundScreen({
  homeHref,
  className,
}: {
  homeHref: string;
  className?: string;
}) {
  const { title, body, action } = commonCopy.states.notFound;
  return (
    <div
      data-slot="not-found-screen"
      className={cn("flex flex-1 flex-col", className)}
    >
      <EmptyState title={title} body={body} />
      <ActionRow>
        <Link
          href={homeHref}
          className={buttonVariants({ variant: "primary" })}
        >
          {action}
        </Link>
      </ActionRow>
    </div>
  );
}

/**
 * 앱 셸 밖(루트 오류, 전역 오류, 루트 404)의 바깥 틀. PageColumn과 같은 폭과 좌우 여백,
 * 위는 조금 더 내려 화면 위 1/3쯤에서 글이 시작하게 한다. safe-area는 viewport-fit 없이도 0이라 안전하다.
 */
export function StandaloneFrame({ children }: { children: ReactNode }) {
  return (
    <main className="flex min-h-dvh flex-1 flex-col bg-background text-foreground">
      <div className="mx-auto flex w-full max-w-(--lm-layout-max-width) flex-1 flex-col px-(--lm-layout-gutter) pt-[max(4rem,18dvh)] pb-[max(1.5rem,env(safe-area-inset-bottom))]">
        {children}
      </div>
    </main>
  );
}
