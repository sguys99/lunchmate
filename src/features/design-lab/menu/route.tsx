// 메뉴 제보 시안 라우트 (T10.16b, D-34). 쿼리 규약은 ./params.ts 머리 주석.
// 쿼리는 요청 시점 값이라 Suspense 안에서 읽는다(cacheComponents). 테마는 시스템 설정을 따른다.
// 쿼리가 바뀌면 시안 상태를 처음부터 다시 그리도록 쿼리 전체를 key로 준다.
import { Suspense } from "react";
import { DesignScope } from "@/features/design-lab/system/design-scope";
import { MenuA } from "./a/menu-a";
import { MenuB } from "./b/menu-b";
import { MenuC } from "./c/menu-c";
import { parseMenuParams } from "./params";

type SearchParams = Record<string, string | string[] | undefined>;
export type MenuVariant = "a" | "b" | "c";

const VARIANTS = { a: MenuA, b: MenuB, c: MenuC } as const;

async function Screen({
  variant,
  searchParams,
}: {
  variant: MenuVariant;
  searchParams: Promise<SearchParams>;
}) {
  const p = parseMenuParams(await searchParams);
  const Variant = VARIANTS[variant];
  return (
    <DesignScope className="min-h-dvh flex-1">
      <Variant key={JSON.stringify(p)} p={p} />
    </DesignScope>
  );
}

export function MenuLabRoute(props: {
  variant: MenuVariant;
  searchParams: Promise<SearchParams>;
}) {
  return (
    <Suspense>
      <Screen {...props} />
    </Suspense>
  );
}
