"use server";
// 투표 만들기, 고치기, 보내기, 투표 탭 서버 액션 (T7.11~T7.13, T7.21, POLL-01~03, POLL-10, MOD-04, MOD-05).
// - 사용자 세션(publishable 키 + 쿠키)으로 보안 함수(rpc)를 부른다. 쓰기 권한은 함수만 있다(T7.6). service role 없음.
// - 요청에 장소명, 카테고리, 좌표는 없다(CLAUDE.md 7장). 기준점은 방장 사무실 핀 또는 지도에서 찍은 점이다(현위치 금지).
// - 제목 금칙어는 여기서 거른다(DB 함수는 길이만 본다). 걸린 낱말은 알리지 않는다(D-13 안건 13).
// - 서버 액션은 Next가 Origin 검사를 한다(CSRF).
import * as z from "zod";
import { isEnabled } from "@/lib/flags";
import { withoutBannedContent, hasBannedIssue } from "@/lib/moderation";
import {
  createServerSupabase,
  type ServerSupabase,
} from "@/lib/supabase/server";
import { placeIdSchema } from "@/features/place/place-requests";
import {
  clampRadius,
  DEFAULT_ANCHOR_RADIUS_M as DEFAULT_RADIUS,
} from "./anchor";
import { mapPollError, pollFail, type PollWriteResult } from "./errors";

const DEFAULT_ANCHOR_RADIUS_M = clampRadius(DEFAULT_RADIUS);

const uuid = z.uuid();
const titleSchema = withoutBannedContent(z.string().trim().min(1).max(20));
const placeUrlOf = (id: string) => `https://place.map.kakao.com/${id}`;

const placeSchema = z
  .strictObject({ placeId: placeIdSchema, placeUrl: z.string().max(80) })
  .refine(
    (v) =>
      v.placeUrl === placeUrlOf(v.placeId) ||
      v.placeUrl === `http://place.map.kakao.com/${v.placeId}`,
  );

const anchorSchema = z.strictObject({
  lat: z.number().min(33).max(38.7),
  lng: z.number().min(124.5).max(132),
  radiusM: z.number().int().min(100).max(3000),
});

const createSchema = z.strictObject({
  kind: z.enum(["lunch", "dinner", "party"]),
  title: titleSchema,
  closesAt: z.iso.datetime(),
  multi: z.boolean(),
  places: z.array(placeSchema).min(2).max(5),
  /** 없으면 방장 기본 사무실 핀 + 이름 찾기 기본 반경 */
  anchor: anchorSchema.optional(),
});

export type CreatePollRequest = z.input<typeof createSchema>;

export type CreatedCandidate = { id: string; placeId: string };

export type CreatePollResult = PollWriteResult<{
  pollId: string;
  code: string;
  candidates: CreatedCandidate[];
}>;

async function session(): Promise<{
  supabase: ServerSupabase;
  userId: string;
} | null> {
  if (!isEnabled("auth")) return null;
  const supabase = await createServerSupabase();
  if (!supabase) return null;
  // getUser는 Auth 서버에 토큰을 검증받는다(쿠키 값만 믿지 않는다)
  const { data } = await supabase.auth.getUser();
  const userId = data.user?.id;
  return userId ? { supabase, userId } : null;
}

export type MyOffice = {
  id: string;
  name: string;
  isDefault: boolean;
  /** 사용자가 지도에 직접 놓은 핀(저장 값) */
  lat: number;
  lng: number;
};

async function readOffices(
  supabase: ServerSupabase,
  userId: string,
): Promise<MyOffice[] | null> {
  const { data, error } = await supabase
    .from("offices")
    .select("id, name, is_default, lat, lng, created_at")
    .eq("user_id", userId)
    .order("created_at", { ascending: true });
  if (error) return null;
  return data.map((o) => ({
    id: o.id,
    name: o.name,
    isDefault: o.is_default,
    lat: o.lat,
    lng: o.lng,
  }));
}

/** 기본 사무실 핀 + 이름 찾기 기본 반경(T5.12a DEFAULT_RESOLVE_RADIUS와 같은 값) */
async function defaultAnchor(supabase: ServerSupabase, userId: string) {
  const offices = await readOffices(supabase, userId);
  const o = offices?.find((x) => x.isDefault) ?? offices?.[0];
  return o
    ? { lat: o.lat, lng: o.lng, radiusM: DEFAULT_ANCHOR_RADIUS_M }
    : null;
}

function invalidOf(error: z.ZodError) {
  return pollFail(hasBannedIssue(error) ? "banned" : "invalid");
}

async function candidatesOf(
  supabase: ServerSupabase,
  pollId: string,
): Promise<CreatedCandidate[] | null> {
  const { data, error } = await supabase
    .from("poll_candidates")
    .select("id, place_id, position")
    .eq("poll_id", pollId)
    .eq("status", "approved")
    .order("position", { ascending: true });
  if (error) return null;
  return data.map((r) => ({ id: r.id, placeId: r.place_id }));
}

/** 투표방 만들기 (POLL-01, POLL-02, PARTY-05). 하루 10개는 DB 함수가 판정한다 */
export async function createPollAction(
  input: CreatePollRequest,
): Promise<CreatePollResult> {
  const parsed = createSchema.safeParse(input);
  if (!parsed.success) return invalidOf(parsed.error);
  const v = parsed.data;
  if (new Set(v.places.map((p) => p.placeId)).size !== v.places.length)
    return pollFail("invalid");
  const s = await session();
  if (!s) return pollFail("unauthenticated");
  try {
    const anchor = v.anchor ?? (await defaultAnchor(s.supabase, s.userId));
    if (!anchor) return pollFail("no_office");
    const { data, error } = await s.supabase.rpc("create_poll", {
      p_kind: v.kind,
      p_title: v.title,
      p_closes_at: v.closesAt,
      p_multi: v.multi,
      p_place_ids: v.places.map((p) => p.placeId),
      p_place_urls: v.places.map((p) => p.placeUrl),
      p_anchor_lat: anchor.lat,
      p_anchor_lng: anchor.lng,
      p_radius_m: anchor.radiusM,
    });
    const failed = mapPollError(error);
    if (failed) return pollFail(failed);
    const row = data?.[0];
    if (!row) return pollFail("save");
    const candidates = (await candidatesOf(s.supabase, row.poll_id)) ?? [];
    return {
      ok: true,
      pollId: row.poll_id,
      code: row.invite_code,
      candidates,
    };
  } catch {
    return pollFail("save");
  }
}

const updateSchema = z
  .strictObject({
    pollId: uuid,
    title: titleSchema.optional(),
    closesAt: z.iso.datetime().optional(),
    multi: z.boolean().optional(),
  })
  .refine(
    (v) =>
      v.title !== undefined ||
      v.closesAt !== undefined ||
      v.multi !== undefined,
  );

export type UpdatePollRequest = z.input<typeof updateSchema>;

/** 방장 고치기: 제목, 마감, 방식 (D-15 C 항목 줄) */
export async function updatePollAction(
  input: UpdatePollRequest,
): Promise<PollWriteResult> {
  const parsed = updateSchema.safeParse(input);
  if (!parsed.success) return invalidOf(parsed.error);
  const v = parsed.data;
  const s = await session();
  if (!s) return pollFail("unauthenticated");
  try {
    const { error } = await s.supabase.rpc("update_poll", {
      p_poll_id: v.pollId,
      ...(v.title !== undefined ? { p_title: v.title } : {}),
      ...(v.closesAt !== undefined ? { p_closes_at: v.closesAt } : {}),
      ...(v.multi !== undefined ? { p_multi: v.multi } : {}),
    });
    const failed = mapPollError(error);
    return failed ? pollFail(failed) : { ok: true };
  } catch {
    return pollFail("save");
  }
}

const addSchema = z.strictObject({ pollId: uuid, place: placeSchema });

/** 방장이 후보 넣기 (바로 승인, 5곳까지) */
export async function addPollCandidateAction(
  input: z.input<typeof addSchema>,
): Promise<PollWriteResult<{ candidateId: string }>> {
  const parsed = addSchema.safeParse(input);
  if (!parsed.success) return pollFail("invalid");
  const s = await session();
  if (!s) return pollFail("unauthenticated");
  try {
    const { data, error } = await s.supabase.rpc("add_poll_candidate", {
      p_poll_id: parsed.data.pollId,
      p_place_id: parsed.data.place.placeId,
      p_place_url: parsed.data.place.placeUrl,
    });
    const failed = mapPollError(error);
    if (failed) return pollFail(failed);
    return data ? { ok: true, candidateId: data } : pollFail("save");
  } catch {
    return pollFail("save");
  }
}

/** 방장이 후보 빼기 (2곳 아래로는 못 줄임) */
export async function removePollCandidateAction(input: {
  candidateId: string;
}): Promise<PollWriteResult> {
  const parsed = z.strictObject({ candidateId: uuid }).safeParse(input);
  if (!parsed.success) return pollFail("invalid");
  const s = await session();
  if (!s) return pollFail("unauthenticated");
  try {
    const { error } = await s.supabase.rpc("remove_poll_candidate", {
      p_candidate_id: parsed.data.candidateId,
    });
    const failed = mapPollError(error);
    return failed ? pollFail(failed) : { ok: true };
  } catch {
    return pollFail("save");
  }
}

/** 보내기 전 "만들기 취소": 방을 지우고 하루 한도를 돌려준다 (D-15 안건 2) */
export async function cancelUnsentPollAction(input: {
  pollId: string;
}): Promise<PollWriteResult> {
  const parsed = z.strictObject({ pollId: uuid }).safeParse(input);
  if (!parsed.success) return pollFail("invalid");
  const s = await session();
  if (!s) return pollFail("unauthenticated");
  try {
    const { error } = await s.supabase.rpc("cancel_unsent_poll", {
      p_poll_id: parsed.data.pollId,
    });
    const failed = mapPollError(error);
    return failed ? pollFail(failed) : { ok: true };
  } catch {
    return pollFail("save");
  }
}

/** 링크를 처음 보냄(카카오톡, 공유, 복사). 이후 만들기 취소 대신 방장 취소 */
export async function markPollSharedAction(input: {
  pollId: string;
}): Promise<PollWriteResult> {
  const parsed = z.strictObject({ pollId: uuid }).safeParse(input);
  if (!parsed.success) return pollFail("invalid");
  const s = await session();
  if (!s) return pollFail("unauthenticated");
  try {
    const { error } = await s.supabase.rpc("mark_poll_shared", {
      p_poll_id: parsed.data.pollId,
    });
    const failed = mapPollError(error);
    return failed ? pollFail(failed) : { ok: true };
  } catch {
    return pollFail("save");
  }
}

const anchorUpdateSchema = z.strictObject({
  pollId: uuid,
  anchor: anchorSchema,
});

/** 보내기 전 기준 바꾸기 (D-15 안건 10). 20261101160000_t7_11_poll_anchor.sql의 update_poll_anchor */
export async function updatePollAnchorAction(
  input: z.input<typeof anchorUpdateSchema>,
): Promise<PollWriteResult> {
  const parsed = anchorUpdateSchema.safeParse(input);
  if (!parsed.success) return pollFail("invalid");
  const s = await session();
  if (!s) return pollFail("unauthenticated");
  try {
    const { error } = await s.supabase.rpc("update_poll_anchor", {
      p_poll_id: parsed.data.pollId,
      p_anchor_lat: parsed.data.anchor.lat,
      p_anchor_lng: parsed.data.anchor.lng,
      p_radius_m: parsed.data.anchor.radiusM,
    });
    const failed = mapPollError(error);
    return failed ? pollFail(failed) : { ok: true };
  } catch {
    return pollFail("save");
  }
}

/* ---------- 읽기 ---------- */

/** 내 사무실 핀(기준 바꾸기 목록). 저장된 핀만이고 현위치는 없다 */
export async function myOfficesAction(): Promise<
  SignedOut | { signedIn: true; offices: MyOffice[] }
> {
  const s = await session();
  if (!s) return { signedIn: false };
  const offices = await readOffices(s.supabase, s.userId);
  if (!offices) throw new Error("load");
  return { signedIn: true, offices };
}

export type SignedOut = { signedIn: false };

/** 오늘 남은 투표방 수 (D-15 안건 14). 실패하면 null(알림 없이 만든다) */
export async function myPollLimitAction(): Promise<
  SignedOut | { signedIn: true; remaining: number | null }
> {
  const s = await session();
  if (!s) return { signedIn: false };
  const { data, error } = await s.supabase.rpc("my_daily_limits");
  if (error) return { signedIn: true, remaining: null };
  const row = (data ?? []).find((r) => r.bucket === "polls");
  return { signedIn: true, remaining: row ? row.remaining : null };
}

export type MyPollRow = {
  pollId: string;
  code: string;
  kind: "lunch" | "dinner" | "party";
  title: string;
  status: "open" | "tie" | "closed" | "canceled";
  closesAt: string;
  closedAt: string | null;
  tieUntil: string | null;
  winnerPlaceId: string | null;
  winnerPlaceUrl: string | null;
  isHost: boolean;
  hasVoted: boolean;
  memberCount: number;
  candidateCount: number;
  createdAt: string;
};

const KINDS = new Set(["lunch", "dinner", "party"]);
const STATUSES = new Set(["open", "tie", "closed", "canceled"]);

/** 투표 탭 (POLL-10): 진행 중, 지난 투표. 마감이 지난 방은 DB 함수가 먼저 판정한다(AC-POLL-2) */
export async function myPollsAction(): Promise<
  SignedOut | { signedIn: true; polls: MyPollRow[] }
> {
  const s = await session();
  if (!s) return { signedIn: false };
  const { data, error } = await s.supabase.rpc("my_polls");
  if (error) throw new Error("load");
  return {
    signedIn: true,
    polls: (data ?? []).flatMap((r) =>
      KINDS.has(r.kind) && STATUSES.has(r.status)
        ? [
            {
              pollId: r.poll_id,
              code: r.invite_code,
              kind: r.kind as MyPollRow["kind"],
              title: r.title,
              status: r.status as MyPollRow["status"],
              closesAt: r.closes_at,
              closedAt: r.closed_at,
              tieUntil: r.tie_until,
              winnerPlaceId: r.winner_place_id,
              winnerPlaceUrl: r.winner_place_url,
              isHost: r.is_host,
              hasVoted: r.has_voted,
              memberCount: Number(r.member_count),
              candidateCount: Number(r.candidate_count),
              createdAt: r.created_at,
            },
          ]
        : [],
    ),
  };
}
