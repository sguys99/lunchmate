export default function Home() {
  return (
    <main className="flex flex-1 flex-col items-center justify-center gap-3 bg-background p-6 text-foreground">
      <h1 className="text-3xl font-bold tracking-tight">런치메이트</h1>
      <p className="text-muted-foreground">
        오늘 뭐 먹지를 10초 안에 정해 드립니다.
      </p>
      <p className="text-2xl font-semibold text-primary tabular-nums">
        12,000원
      </p>
    </main>
  );
}
