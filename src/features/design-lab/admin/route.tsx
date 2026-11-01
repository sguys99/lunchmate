// 관리자 화면 시안 라우트 (T8.5a). 쿼리 규약은 ./params.ts 머리 주석.
// 쿼리는 요청 시점 값이라 Suspense 안에서 읽는다(cacheComponents). 테마는 시스템 설정을 따른다.
// 쿼리가 바뀌면 시안 상태를 처음부터 다시 그리도록 쿼리 전체를 key로 준다.
import { Suspense } from "react";
import { DesignScope } from "@/features/design-lab/system/design-scope";
import { AdminA } from "./a/admin-a";
import { AdminB } from "./b/admin-b";
import { AdminC } from "./c/admin-c";
import { parseAdminParams } from "./params";

type SearchParams = Record<string, string | string[] | undefined>;
export type AdminVariant = "a" | "b" | "c";

const VARIANTS = { a: AdminA, b: AdminB, c: AdminC } as const;

async function Screen({
  variant,
  searchParams,
}: {
  variant: AdminVariant;
  searchParams: Promise<SearchParams>;
}) {
  const params = parseAdminParams(await searchParams);
  const Variant = VARIANTS[variant];
  return (
    <DesignScope className="min-h-dvh flex-1">
      <Variant key={JSON.stringify(params)} params={params} />
    </DesignScope>
  );
}

export function AdminLabRoute(props: {
  variant: AdminVariant;
  searchParams: Promise<SearchParams>;
}) {
  return (
    <Suspense>
      <Screen {...props} />
    </Suspense>
  );
}
