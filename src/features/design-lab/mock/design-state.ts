// design-lab 4상태 시연 (CLAUDE.md 6.1, PRD 8.4). ?state=loading|empty|error|offline
export const DESIGN_STATES = [
  "ready",
  "loading",
  "empty",
  "error",
  "offline",
] as const;

export type DesignState = (typeof DESIGN_STATES)[number];

/** Next.js page의 searchParams(await 후 값) 또는 URLSearchParams */
export type DesignStateSearchParams =
  | URLSearchParams
  | Readonly<Record<string, string | readonly string[] | undefined>>
  | null
  | undefined;

function isDesignState(value: string): value is DesignState {
  return (DESIGN_STATES as readonly string[]).includes(value);
}

/** state 쿼리를 해석한다. 없거나 모르는 값이면 "ready". 여러 개면 첫 값을 쓴다. */
export function parseDesignState(
  searchParams: DesignStateSearchParams,
): DesignState {
  if (!searchParams) return "ready";
  let raw: string | readonly string[] | null | undefined;
  if (searchParams instanceof URLSearchParams) {
    raw = searchParams.get("state");
  } else {
    raw = searchParams.state;
  }
  const first = typeof raw === "string" ? raw : raw?.[0];
  const value = first?.trim().toLowerCase();
  return value && isDesignState(value) ? value : "ready";
}
