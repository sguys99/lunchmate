import { designLabCopy } from "@/copy/design-lab";

export default function DesignLabPage() {
  return (
    <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-6 bg-background p-6 text-foreground">
      <header className="flex flex-col gap-2">
        <h1 className="text-2xl font-bold tracking-tight">
          {designLabCopy.title}
        </h1>
        <p className="text-muted-foreground">{designLabCopy.description}</p>
      </header>
      <section className="flex flex-col gap-1 rounded-lg border border-border p-6">
        <h2 className="text-lg font-semibold">{designLabCopy.emptyTitle}</h2>
        <p className="text-muted-foreground">{designLabCopy.emptyBody}</p>
      </section>
    </main>
  );
}
