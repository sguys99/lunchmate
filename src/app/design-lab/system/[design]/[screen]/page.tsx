// /design-lab/system/<a|b|c>/<home|sheet>?state=<ready|loading|empty|error|offline>
// 캡처 전용 단독 화면 (T1.11~T1.13, pnpm shots). 테마는 시스템 설정(prefers-color-scheme)을 따른다.
// 상위 design-lab/layout.tsx가 플래그로 막는다.
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { parseDesignState } from "@/features/design-lab/mock";
import { DesignScope } from "@/features/design-lab/system/design-scope";
import { DESIGN_SCREENS } from "@/features/design-lab/system/registry";
import { getDesignTokens } from "@/features/design-lab/system/tokens.server";
import {
  DESIGN_IDS,
  DESIGN_SCREEN_IDS,
  isDesignId,
  isDesignScreenId,
} from "@/features/design-lab/system/types";

type SearchParams = Record<string, string | string[] | undefined>;

export function generateStaticParams() {
  return DESIGN_IDS.flatMap((design) =>
    DESIGN_SCREEN_IDS.map((screen) => ({ design, screen })),
  );
}

/**
 * params, ?state= 는 요청 시점 값이라 Suspense 안에서 읽는다(cacheComponents, instant shell).
 * 바깥에서 await하면 dev에서 "URL data during prerendering" 오류가 난다.
 */
async function ScreenRoute({
  params,
  searchParams,
}: {
  params: Promise<{ design: string; screen: string }>;
  searchParams: Promise<SearchParams>;
}) {
  const [{ design, screen }, query] = await Promise.all([params, searchParams]);
  if (!isDesignId(design) || !isDesignScreenId(screen)) notFound();
  const state = parseDesignState(query);
  const Screen = DESIGN_SCREENS[design][screen];
  return (
    <DesignScope design={design} className="min-h-dvh flex-1">
      <Screen state={state} tokens={getDesignTokens(design)} />
    </DesignScope>
  );
}

export default function DesignSystemScreenPage(props: {
  params: Promise<{ design: string; screen: string }>;
  searchParams: Promise<SearchParams>;
}) {
  return (
    <Suspense>
      <ScreenRoute {...props} />
    </Suspense>
  );
}
