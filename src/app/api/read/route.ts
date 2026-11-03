// 브라우저 조회 (src/lib/read). 본문 { fn, args }로 조회 표의 함수를 부른다. 함수가 던지면 500(화면의 오류 상태와 재시도 1회).
import { READS } from "@/lib/read/table";

export async function POST(request: Request): Promise<Response> {
  const body: unknown = await request.json().catch(() => null);
  const { fn, args } = (body ?? {}) as { fn?: unknown; args?: unknown };
  if (
    typeof fn !== "string" ||
    !Object.hasOwn(READS, fn) ||
    !Array.isArray(args)
  ) {
    return Response.json({ error: "not_found" }, { status: 404 });
  }
  try {
    const run = READS[fn as keyof typeof READS] as (
      ...a: unknown[]
    ) => Promise<unknown>;
    return Response.json(await run(...args), {
      headers: { "Cache-Control": "private, no-store" },
    });
  } catch {
    return Response.json({ error: "read" }, { status: 500 });
  }
}
