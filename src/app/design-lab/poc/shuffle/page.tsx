// /design-lab/poc/shuffle (T2.13). 플래그 차단은 design-lab/layout.tsx.
import { designLabPocCopy } from "@/copy/design-lab-poc";
import { ShufflePoc } from "@/features/design-lab/poc/shuffle/shuffle-poc";
import { PocFrame } from "@/features/design-lab/poc/poc-frame";

const copy = designLabPocCopy.shuffle;

export default function Page() {
  return (
    <PocFrame title={copy.title} description={copy.description}>
      <ShufflePoc />
    </PocFrame>
  );
}
