// 첫 로그인 약관 동의 자리 (T4.9). 실제 화면(필수 3개, 동의 버튼, 나중에 하기)은 T4.11에서 이 경로에 만든다.
// 지금은 콜백이 terms_agreed_at이 비어 있는 사용자를 보내는 곳만 잡아 두고 next를 그대로 잇는다.
// 로그인 필요 경로(proxy, features/auth/routes.ts). flags.auth가 꺼진 환경(프로덕션)에서는 404.
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { buttonClass } from "@/components/ui/button-classes";
import { authCopy } from "@/copy/auth";
import { sanitizeNext } from "@/features/auth/redirect";
import { isEnabled } from "@/lib/flags";
import { cn } from "@/lib/utils";

const copy = authCopy.termsPlaceholder;

export const metadata: Metadata = {
  title: copy.metaTitle,
  robots: { index: false, follow: false },
};

type SearchParams = Record<string, string | string[] | undefined>;

async function Continue({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const raw = (await searchParams).next;
  const next = sanitizeNext(Array.isArray(raw) ? raw[0] : raw);
  return (
    <Link href={next} className={cn(buttonClass("primary"), "w-full")}>
      {copy.continue}
    </Link>
  );
}

export default function Page(props: { searchParams: Promise<SearchParams> }) {
  if (!isEnabled("auth")) notFound();
  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-(--lm-layout-max-width) flex-1 flex-col gap-4 bg-background px-(--lm-layout-gutter) pt-20 pb-[calc(1.5rem+env(safe-area-inset-bottom,0px))] text-foreground">
      <h1 className="type-title text-balance break-keep">{copy.title}</h1>
      <p className="type-body break-keep text-muted-foreground">{copy.body}</p>
      <div className="mt-auto">
        <Suspense>
          <Continue {...props} />
        </Suspense>
      </div>
    </main>
  );
}
