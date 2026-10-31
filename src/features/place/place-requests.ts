// 상세 화면의 저장 요청 검사와 흐름 (T5.35 즐겨찾기, T5.38 NAV-04 방문 후보). zod 검사는 서버 액션(actions.ts)이 이 파일로 한다.
// 흐름은 deps 주입 함수라 Supabase 없이 테스트한다(settings.ts와 같은 방식).
//
// 데이터 규칙 (CLAUDE.md 7장, 마이그레이션 20261031120000)
// - 카카오 값은 place_id(숫자 문자열)와 place_url(그 id의 카카오맵 주소)만 받는다. 이름, 좌표는 요청에 없다(strictObject).
// - visits의 방문일(visited_on), 상태(status)는 서버 트리거가 정한다. 여기서는 열 권한이 있는 값만 보낸다.
// - 하루 20건(visits), 300곳(favorites) 제한은 트리거가 막고, 여기서는 오류 이름으로 바꾼다.
// - 즐겨찾기와 다시 안 갈 곳은 동시에 둘 수 없다. 앱에서 막는다(다시 안 갈 곳이면 즐겨찾기를 거절).
import * as z from "zod";

export const placeIdSchema = z.string().regex(/^[0-9]{1,20}$/);

/** place_url은 그 place_id의 카카오맵 주소만 (DB 체크와 같은 규칙) */
function placeUrlMatches(v: { placeId: string; placeUrl?: string | null }) {
  if (v.placeUrl == null) return true;
  return (
    v.placeUrl === `https://place.map.kakao.com/${v.placeId}` ||
    v.placeUrl === `http://place.map.kakao.com/${v.placeId}`
  );
}

export const visitRequestSchema = z
  .strictObject({
    placeId: placeIdSchema,
    placeUrl: z.string().max(200).nullable().optional(),
    meal: z.enum(["lunch", "dinner"]),
    source: z.enum(["rec", "poll", "map"]),
  })
  .refine(placeUrlMatches);

export const favoriteRequestSchema = z
  .strictObject({
    placeId: placeIdSchema,
    placeUrl: z.string().max(200).nullable().optional(),
    on: z.boolean(),
  })
  .refine(placeUrlMatches);

export const placeStateRequestSchema = z.strictObject({
  placeId: placeIdSchema,
});

export type VisitRequest = z.input<typeof visitRequestSchema>;
export type FavoriteRequest = z.input<typeof favoriteRequestSchema>;
export type PlaceStateRequest = z.input<typeof placeStateRequestSchema>;

export type PlaceSaveError =
  | "invalid"
  | "unauthenticated"
  /** 방문 하루 20건, 즐겨찾기 300곳 */
  | "limit"
  /** 다시 안 갈 곳에 있어 즐겨찾기 거절 */
  | "blocked"
  | "save";

export type VisitResult =
  { ok: true; created: boolean } | { ok: false; error: PlaceSaveError };
export type FavoriteResult =
  { ok: true; on: boolean } | { ok: false; error: PlaceSaveError };
export type PlaceUserState =
  { signedIn: false } | { signedIn: true; favorite: boolean; blocked: boolean };

export type InsertOutcome = "ok" | "duplicate" | "limit" | "error";

export type PlaceDeps = {
  currentUserId: () => Promise<string | null>;
  insertVisit: (
    userId: string,
    row: {
      place_id: string;
      place_url: string | null;
      meal: "lunch" | "dinner";
      source: "rec" | "poll" | "map";
    },
  ) => Promise<InsertOutcome>;
  isFavorite: (userId: string, placeId: string) => Promise<boolean>;
  isBlocked: (userId: string, placeId: string) => Promise<boolean>;
  insertFavorite: (
    userId: string,
    row: { place_id: string; place_url: string | null },
  ) => Promise<InsertOutcome>;
  deleteFavorite: (userId: string, placeId: string) => Promise<boolean>;
};

/** 길찾기를 누른 식당을 오늘 이 끼니의 방문 후보로 (NAV-04). 같은 날 같은 끼니 같은 곳은 한 행 */
export async function saveVisit(
  input: unknown,
  deps: PlaceDeps,
): Promise<VisitResult> {
  const parsed = visitRequestSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "invalid" };
  const userId = await deps.currentUserId();
  if (!userId) return { ok: false, error: "unauthenticated" };
  const v = parsed.data;
  const outcome = await deps.insertVisit(userId, {
    place_id: v.placeId,
    place_url: v.placeUrl ?? null,
    meal: v.meal,
    source: v.source,
  });
  switch (outcome) {
    case "ok":
      return { ok: true, created: true };
    case "duplicate":
      return { ok: true, created: false };
    case "limit":
      return { ok: false, error: "limit" };
    case "error":
      return { ok: false, error: "save" };
  }
}

/** 즐겨찾기 담기, 빼기 (PLACE-04, HIS-02). 다시 안 갈 곳이면 담지 않는다 */
export async function setFavorite(
  input: unknown,
  deps: PlaceDeps,
): Promise<FavoriteResult> {
  const parsed = favoriteRequestSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "invalid" };
  const userId = await deps.currentUserId();
  if (!userId) return { ok: false, error: "unauthenticated" };
  const { placeId, placeUrl, on } = parsed.data;
  if (!on) {
    return (await deps.deleteFavorite(userId, placeId))
      ? { ok: true, on: false }
      : { ok: false, error: "save" };
  }
  if (await deps.isBlocked(userId, placeId)) {
    return { ok: false, error: "blocked" };
  }
  const outcome = await deps.insertFavorite(userId, {
    place_id: placeId,
    place_url: placeUrl ?? null,
  });
  if (outcome === "ok" || outcome === "duplicate")
    return { ok: true, on: true };
  return { ok: false, error: outcome === "limit" ? "limit" : "save" };
}

/** 상세를 열 때 즐겨찾기 상태. 비로그인이면 signedIn false(즐겨찾기를 누르면 로그인 유도) */
export async function readPlaceUserState(
  input: unknown,
  deps: PlaceDeps,
): Promise<PlaceUserState> {
  const parsed = placeStateRequestSchema.safeParse(input);
  const userId = await deps.currentUserId();
  if (!userId) return { signedIn: false };
  if (!parsed.success)
    return { signedIn: true, favorite: false, blocked: false };
  const [favorite, blocked] = await Promise.all([
    deps.isFavorite(userId, parsed.data.placeId),
    deps.isBlocked(userId, parsed.data.placeId),
  ]);
  return { signedIn: true, favorite, blocked };
}
