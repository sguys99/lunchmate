// /design-lab/poc/bottom-sheet (T2.13). 플래그 차단은 design-lab/layout.tsx.
import { designLabPocCopy } from "@/copy/design-lab-poc";
import { BottomSheetPoc } from "@/features/design-lab/poc/bottom-sheet/bottom-sheet-poc";
import { PocFrame } from "@/features/design-lab/poc/poc-frame";

const copy = designLabPocCopy.sheet;

export default function Page() {
  return (
    <PocFrame title={copy.title} description={copy.description}>
      <BottomSheetPoc />
    </PocFrame>
  );
}
