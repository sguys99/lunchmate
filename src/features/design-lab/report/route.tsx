// 제보와 신고 입력 시안 라우트 (T6.3). 쿼리 규약은 ./params.ts 머리 주석.
// 쿼리는 요청 시점 값이라 Suspense 안에서 읽는다(cacheComponents). 테마는 시스템 설정을 따른다.
// 흐름과 단계가 바뀌면 시안 상태를 처음부터 다시 그리도록 쿼리 전체를 key로 준다.
import { Suspense } from "react";
import { DesignScope } from "@/features/design-lab/system/design-scope";
import { ReportA } from "./a/report-a";
import { ReportB } from "./b/report-b";
import { ReportC } from "./c/report-c";
import { parseReportParams } from "./params";

type SearchParams = Record<string, string | string[] | undefined>;
export type ReportVariant = "a" | "b" | "c";

const VARIANTS = { a: ReportA, b: ReportB, c: ReportC } as const;

async function Screen({
  variant,
  searchParams,
}: {
  variant: ReportVariant;
  searchParams: Promise<SearchParams>;
}) {
  const params = parseReportParams(await searchParams);
  const Variant = VARIANTS[variant];
  return (
    <DesignScope className="min-h-dvh flex-1">
      <Variant key={JSON.stringify(params)} params={params} />
    </DesignScope>
  );
}

export function ReportLabRoute(props: {
  variant: ReportVariant;
  searchParams: Promise<SearchParams>;
}) {
  return (
    <Suspense>
      <Screen {...props} />
    </Suspense>
  );
}
