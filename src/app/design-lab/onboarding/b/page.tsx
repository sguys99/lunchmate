// /design-lab/onboarding/b: 온보딩 시안 B (T4.1). 쿼리는 features/design-lab/onboarding/shared/params.ts 참고.
import type { Metadata } from "next";
import { onboardingLabCopy } from "@/copy/design-lab-onboarding";
import { OnboardingB } from "@/features/design-lab/onboarding/b/onboarding-b";
import { OnboardingRoute } from "@/features/design-lab/onboarding/route";

export const metadata: Metadata = {
  title: onboardingLabCopy.names.b,
};

export default function Page(props: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  return (
    <OnboardingRoute
      searchParams={props.searchParams}
      Candidate={OnboardingB}
    />
  );
}
