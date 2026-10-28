// /design-lab/poc/celebrate (T2.13). 플래그 차단은 design-lab/layout.tsx.
import { designLabPocCopy } from "@/copy/design-lab-poc";
import { CelebratePoc } from "@/features/design-lab/poc/celebrate/celebrate-poc";
import { PocFrame } from "@/features/design-lab/poc/poc-frame";

const copy = designLabPocCopy.celebrate;

export default function Page() {
  return (
    <PocFrame title={copy.title} description={copy.description}>
      <CelebratePoc />
    </PocFrame>
  );
}
