// /design-lab/states (T2.7). 공통 4상태 확인용. T2.10 갤러리가 생기면 그쪽으로 옮긴다.
import { designLabStatesCopy as copy } from "@/copy/design-lab-states";
import { StatesGallery } from "@/features/design-lab/states/gallery";

export default function DesignLabStatesPage() {
  return (
    <main className="mx-auto flex w-full max-w-(--lm-layout-max-width) flex-1 flex-col gap-14 bg-background px-6 py-10 text-foreground">
      <header className="flex flex-col gap-2">
        <h1 className="type-title">{copy.title}</h1>
        <p className="type-body-sm text-muted-foreground">{copy.description}</p>
      </header>
      <StatesGallery />
    </main>
  );
}
