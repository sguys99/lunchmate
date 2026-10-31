// 지도 시안 단독 화면 라우트 (T5.1). /design-lab/map/b (D-09에서 B안을 골라 A, C는 지웠다)
// 쿼리: ?state=loading|empty|error|offline, ?select=<id>, ?snap=peek|half|full, ?filter=open, ?moved=1, ?map=naver (shared/params.ts)
// 테마는 시스템 설정(prefers-color-scheme)을 따른다. 상위 design-lab/layout.tsx가 플래그로 막는다.
// 쿼리는 요청 시점 값이라 Suspense 안에서 읽는다(cacheComponents).
import { Suspense, type ComponentType } from "react";
import { DesignScope } from "@/features/design-lab/system/design-scope";
import { parseMapLabParams, type MapLabParams } from "./shared/params";
import "./shared/map-lab.css";

type SearchParams = Record<string, string | string[] | undefined>;

async function Screen({
  searchParams,
  Candidate,
}: {
  searchParams: Promise<SearchParams>;
  Candidate: ComponentType<{ params: MapLabParams }>;
}) {
  const params = parseMapLabParams(await searchParams);
  return (
    <DesignScope className="min-h-dvh flex-1">
      <Candidate params={params} />
    </DesignScope>
  );
}

export function MapLabRoute(props: {
  searchParams: Promise<SearchParams>;
  Candidate: ComponentType<{ params: MapLabParams }>;
}) {
  return (
    <Suspense>
      <Screen {...props} />
    </Suspense>
  );
}
