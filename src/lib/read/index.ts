// 브라우저 조회. 서버 액션 대신 써서 동시에 부르는 조회가 줄을 서지 않게 한다(table.ts).
// 값은 JSON으로 오간다(Date, Map, undefined 인자는 쓰지 않는다). 실패하면 throw(TanStack Query 오류 상태).
import type { Reads } from "./table";

export async function read<K extends keyof Reads>(
  fn: K,
  ...args: Parameters<Reads[K]>
): Promise<Awaited<ReturnType<Reads[K]>>> {
  const res = await fetch("/api/read", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ fn, args }),
  });
  if (!res.ok) throw new Error(`read ${fn} ${res.status}`);
  return (await res.json()) as Awaited<ReturnType<Reads[K]>>;
}
