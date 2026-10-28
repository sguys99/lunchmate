// /design-lab/components 초안 (T2.5). 공통 컴포넌트 재스타일 확인용. T2.10이 상태별 갤러리로 넓힌다.
import { designLabComponentsCopy as copy } from "@/copy/design-lab-components";
import { ComponentsGallery } from "@/features/design-lab/components/gallery";

export default function DesignLabComponentsPage() {
  return (
    <main className="mx-auto flex w-full max-w-(--lm-layout-max-width) flex-1 flex-col gap-14 bg-background px-6 py-10 text-foreground">
      <header className="flex flex-col gap-2">
        <h1 className="type-title">{copy.title}</h1>
        <p className="type-body-sm text-muted-foreground">{copy.description}</p>
      </header>
      <ComponentsGallery />
    </main>
  );
}
