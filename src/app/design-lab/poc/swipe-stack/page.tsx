// /design-lab/poc/swipe-stack (T2.13). 플래그 차단은 design-lab/layout.tsx.
import { designLabPocCopy } from "@/copy/design-lab-poc";
import { SwipeStackPoc } from "@/features/design-lab/poc/swipe-stack/swipe-stack-poc";
import { PocFrame } from "@/features/design-lab/poc/poc-frame";

const copy = designLabPocCopy.swipe;

export default function Page() {
  return (
    <PocFrame title={copy.title} description={copy.description}>
      <SwipeStackPoc />
    </PocFrame>
  );
}
