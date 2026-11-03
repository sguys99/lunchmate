// 하단 탭 활성 표시 시안 라우트 (T9.15). 쿼리: tab=today|map|poll|me(기본 today), state=ready|loading|empty|error|offline.
// 쿼리는 요청 시점 값이라 Suspense 안에서 읽는다(cacheComponents). 쿼리가 바뀌면 처음부터 다시 그리도록 key로 준다.
import { Suspense } from "react";
import { APP_TAB_IDS, type AppTabId } from "@/components/app-shell/tabs";
import { parseDesignState } from "@/features/design-lab/mock";
import { DesignScope } from "@/features/design-lab/system/design-scope";
import { TabBarLab, type TabBarVariant } from "./tab-bar-lab";

type SearchParams = Record<string, string | string[] | undefined>;

function parseTab(raw: SearchParams): AppTabId {
  const v = raw.tab;
  const s = (typeof v === "string" ? v : v?.[0])?.trim().toLowerCase() ?? "";
  return (APP_TAB_IDS as readonly string[]).includes(s)
    ? (s as AppTabId)
    : "today";
}

async function Screen({
  variant,
  searchParams,
}: {
  variant: TabBarVariant;
  searchParams: Promise<SearchParams>;
}) {
  const raw = await searchParams;
  const tab = parseTab(raw);
  const state = parseDesignState(raw);
  return (
    <DesignScope className="min-h-dvh flex-1">
      <TabBarLab
        key={`${tab}-${state}`}
        variant={variant}
        tab={tab}
        state={state}
      />
    </DesignScope>
  );
}

export function TabBarLabRoute(props: {
  variant: TabBarVariant;
  searchParams: Promise<SearchParams>;
}) {
  return (
    <Suspense>
      <Screen {...props} />
    </Suspense>
  );
}
