// 홈 한 화면 맞춤 시안 단독 화면 (T9.10 G9): /design-lab/home-compact/<a|b|c>?name=long|short&state=...
// 상위 design-lab/layout.tsx가 플래그로 막는다. 쿼리는 요청 시점 값이라 Suspense 안에서 읽는다.
import { Suspense } from "react";
import { parseDesignState } from "@/features/design-lab/mock/design-state";
import { HomeCompactA } from "./a";
import { HomeCompactB } from "./b";
import { HomeCompactC } from "./c";
import type { NameMode } from "./shared";

type SearchParams = Record<string, string | string[] | undefined>;
export type CompactId = "a" | "b" | "c";

const SCREENS = { a: HomeCompactA, b: HomeCompactB, c: HomeCompactC };

async function Screen({
  id,
  searchParams,
}: {
  id: CompactId;
  searchParams: Promise<SearchParams>;
}) {
  const params = await searchParams;
  const state = parseDesignState(params);
  const name: NameMode = params.name === "short" ? "short" : "long";
  const View = SCREENS[id];
  return <View state={state} name={name} />;
}

export function HomeCompactRoute({
  id,
  searchParams,
}: {
  id: CompactId;
  searchParams: Promise<SearchParams>;
}) {
  return (
    <Suspense>
      <Screen id={id} searchParams={searchParams} />
    </Suspense>
  );
}
