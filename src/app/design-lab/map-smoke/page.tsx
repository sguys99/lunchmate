import { mapCopy } from "@/copy/map";
import { MapSmoke } from "./map-smoke";

// 상위 design-lab/layout.tsx 가 designLab 플래그가 꺼져 있으면 404 로 막는다.
export default function MapSmokePage() {
  return (
    <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-6 bg-background p-6 text-foreground">
      <header className="flex flex-col gap-2">
        <h1 className="text-2xl font-bold tracking-tight">
          {mapCopy.smoke.title}
        </h1>
        <p className="text-muted-foreground">{mapCopy.smoke.description}</p>
      </header>
      <MapSmoke />
    </main>
  );
}
