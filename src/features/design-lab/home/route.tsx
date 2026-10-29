// 홈 D1 단독 화면 (G3 선택안, design-decisions D-05): /design-lab/home/d1?state=<ready|loading|empty|error|offline>
// 확인 옵션: &deck=overflow (배지 넘침 카드 세트), &feedback=none (어제 피드백 없는 날), &seed=<정수> (그냥 골라줘 재현)
// 테마는 시스템 설정(prefers-color-scheme)을 따른다. 상위 design-lab/layout.tsx가 플래그로 막는다.
// ?state= 는 요청 시점 값이라 Suspense 안에서 읽는다(시스템 단독 화면과 같은 이유, cacheComponents).
import { Suspense } from "react";
import { parseDesignState } from "@/features/design-lab/mock";
import { DesignScope } from "@/features/design-lab/system/design-scope";
import { HomeD1 } from "./d1/home-d1";
import { parseHomeLabOptions } from "./shared/lab-options";
import { HomeLabOptionsProvider } from "./shared/lab-options-context";

type SearchParams = Record<string, string | string[] | undefined>;

async function Screen({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const params = await searchParams;
  const state = parseDesignState(params);
  const options = parseHomeLabOptions(params);
  return (
    <DesignScope className="min-h-dvh flex-1">
      <HomeLabOptionsProvider value={options}>
        <HomeD1 state={state} />
      </HomeLabOptionsProvider>
    </DesignScope>
  );
}

export function HomeD1Route({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  return (
    <Suspense>
      <Screen searchParams={searchParams} />
    </Suspense>
  );
}
