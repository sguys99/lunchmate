import { siteCopy } from "@/copy/common";
import { formatWon } from "@/lib/format";

export default function Home() {
  return (
    <main className="flex flex-1 flex-col items-center justify-center gap-3 bg-background p-6 text-foreground">
      <h1 className="text-3xl font-bold tracking-tight">{siteCopy.name}</h1>
      <p className="text-muted-foreground">{siteCopy.tagline}</p>
      <p className="text-2xl font-semibold text-primary tabular-nums">
        {formatWon(12000)}
      </p>
    </main>
  );
}
