// /design-lab/onboarding/a: 온보딩 시안 A (T4.1). 쿼리는 features/design-lab/onboarding/shared/params.ts 참고.
import type { Metadata } from "next";
import { onboardingLabCopy } from "@/copy/design-lab-onboarding";
import { OnboardingA } from "@/features/design-lab/onboarding/a/onboarding-a";
import { OnboardingRoute } from "@/features/design-lab/onboarding/route";

export const metadata: Metadata = {
  title: onboardingLabCopy.names.a,
};

export default function Page(props: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  return (
    <OnboardingRoute
      searchParams={props.searchParams}
      Candidate={OnboardingA}
    />
  );
}
