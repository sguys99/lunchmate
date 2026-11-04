"use server";
// 투표방 서버 액션 (T7.15~T7.19, T7.22, POLL-05~13). 사용자 세션(publishable 키 + 쿠키)으로 보안 함수만 부른다.
// - 쓰기는 전부 Postgres 보안 함수(20261101140000_t7_6_polls.sql)가 판정한다. 여기서는 입력 형식만 zod로 다시 본다.
// - 응답에서 다른 사람의 user_id는 공개 프로필(닉네임, 사진)로 바꾸고 내보내지 않는다(parse.ts, T9.10). 표는 무기명(D-14 안건 1).
// - 요청에 좌표와 현위치는 없다. 기피 확인만 후보 이름과 업종을 판정용으로 보내고 DB는 저장하지 않는다(POLL-13).
import * as z from "zod";
import {
  createServerSupabase,
  type ServerSupabase,
} from "@/lib/supabase/server";
import { mapPollError, type PollFailure, type PollResult } from "./errors";
import type { PollRoom } from "./model";
import { memberUserIds, parseRoom, type MemberProfile } from "./parse";

const uuid = z.string().uuid();
const code = z.string().regex(/^[2-9a-hjkmnp-z]{12}$/);
const placeId = z.string().regex(/^[0-9]{1,20}$/);

async function withSupabase<T extends object>(
  fn: (supabase: ServerSupabase) => Promise<PollResult<T>>,
): Promise<PollResult<T>> {
  try {
    const supabase = await createServerSupabase();
    if (!supabase) return { ok: false, error: "unauthenticated" };
    return await fn(supabase);
  } catch {
    return { ok: false, error: "save" };
  }
}

const fail = (error: PollFailure["error"]): PollFailure => ({
  ok: false,
  error,
});

/** 참여자 공개 프로필(닉네임, 사진). public_profiles 뷰만 읽는다(CLAUDE.md 13장) */
async function profilesFor(
  supabase: ServerSupabase,
  ids: readonly string[],
): Promise<Map<string, MemberProfile>> {
  if (ids.length === 0) return new Map();
  const { data } = await supabase
    .from("public_profiles")
    .select("user_id, nickname, avatar_url")
    .in("user_id", [...new Set(ids)]);
  const map = new Map<string, MemberProfile>();
  for (const row of data ?? []) {
    if (!row.user_id) continue;
    map.set(row.user_id, {
      nickname: row.nickname ?? null,
      avatarUrl: row.avatar_url ?? null,
    });
  }
  return map;
}

/** 초대 코드로 참여 (POLL-05). 이미 참여자면 그 방 id */
export async function joinPollAction(
  input: string,
): Promise<PollResult<{ pollId: string }>> {
  const parsed = code.safeParse(input);
  if (!parsed.success) return fail("not_found");
  return withSupabase(async (supabase) => {
    const { data, error } = await supabase.rpc("join_poll", {
      p_code: parsed.data,
    });
    const failed = mapPollError(error);
    if (failed) return failed;
    if (typeof data !== "string") return fail("save");
    return { ok: true, pollId: data };
  });
}

/** 참여자 화면 한 번에 (get_poll이 읽기 전에 마감을 판정한다, AC-POLL-2) */
export async function pollRoomAction(
  input: string,
): Promise<PollResult<{ room: PollRoom }>> {
  const parsed = uuid.safeParse(input);
  if (!parsed.success) return fail("not_found");
  return withSupabase(async (supabase) => {
    const { data, error } = await supabase.rpc("get_poll", {
      p_poll_id: parsed.data,
    });
    const failed = mapPollError(error);
    if (failed) return failed;
    const profiles = await profilesFor(supabase, memberUserIds(data));
    const room = parseRoom(data, profiles);
    if (!room) return fail("save");
    return { ok: true, room };
  });
}

const voteInput = z.object({
  pollId: uuid,
  candidateIds: z.array(uuid).max(5),
});

/** 투표, 바꾸기, 취소(빈 목록) (POLL-06). isFirstVote는 poll_voted.is_first_vote */
export async function castVoteAction(
  input: z.input<typeof voteInput>,
): Promise<PollResult<{ isFirstVote: boolean }>> {
  const parsed = voteInput.safeParse(input);
  if (!parsed.success) return fail("invalid");
  return withSupabase(async (supabase) => {
    const { data, error } = await supabase.rpc("cast_vote", {
      p_poll_id: parsed.data.pollId,
      p_candidate_ids: parsed.data.candidateIds,
    });
    const failed = mapPollError(error);
    if (failed) return failed;
    return { ok: true, isFirstVote: data === true };
  });
}

const suggestInput = z.object({
  pollId: uuid,
  placeId,
  placeUrl: z.string().url().nullable(),
});

/** 후보 넣기(방장은 바로, 참여자는 제안) (POLL-07) */
export async function addCandidateAction(
  input: z.input<typeof suggestInput>,
): Promise<PollResult<{ candidateId: string }>> {
  const parsed = suggestInput.safeParse(input);
  if (!parsed.success) return fail("invalid");
  return withSupabase(async (supabase) => {
    const { data, error } = await supabase.rpc("add_poll_candidate", {
      p_poll_id: parsed.data.pollId,
      p_place_id: parsed.data.placeId,
      ...(parsed.data.placeUrl ? { p_place_url: parsed.data.placeUrl } : {}),
    });
    const failed = mapPollError(error);
    if (failed) return failed;
    if (typeof data !== "string") return fail("save");
    return { ok: true, candidateId: data };
  });
}

const reviewInput = z.object({ candidateId: uuid, approve: z.boolean() });

/** 방장이 제안 승인, 거절 (POLL-07) */
export async function reviewSuggestionAction(
  input: z.input<typeof reviewInput>,
): Promise<PollResult> {
  const parsed = reviewInput.safeParse(input);
  if (!parsed.success) return fail("invalid");
  return withSupabase(async (supabase) => {
    const { error } = await supabase.rpc("review_poll_suggestion", {
      p_candidate_id: parsed.data.candidateId,
      p_approve: parsed.data.approve,
    });
    return mapPollError(error) ?? { ok: true };
  });
}

/** 방장 지금 결정 (POLL-08). 1위가 둘 이상이면 서버가 동점 대기로 둔다 */
export async function closePollNowAction(input: string): Promise<PollResult> {
  const parsed = uuid.safeParse(input);
  if (!parsed.success) return fail("invalid");
  return withSupabase(async (supabase) => {
    const { error } = await supabase.rpc("close_poll_now", {
      p_poll_id: parsed.data,
    });
    return mapPollError(error) ?? { ok: true };
  });
}

const tieInput = z.object({ pollId: uuid, candidateId: uuid.nullable() });

/** 방장 동점 정하기: 후보를 고르거나 null이면 서버 룰렛 (POLL-08) */
export async function resolveTieAction(
  input: z.input<typeof tieInput>,
): Promise<PollResult> {
  const parsed = tieInput.safeParse(input);
  if (!parsed.success) return fail("invalid");
  return withSupabase(async (supabase) => {
    const { error } = await supabase.rpc("resolve_poll_tie", {
      p_poll_id: parsed.data.pollId,
      ...(parsed.data.candidateId
        ? { p_candidate_id: parsed.data.candidateId }
        : {}),
    });
    return mapPollError(error) ?? { ok: true };
  });
}

/** 방장 취소 (POLL-12) */
export async function cancelPollAction(input: string): Promise<PollResult> {
  const parsed = uuid.safeParse(input);
  if (!parsed.success) return fail("invalid");
  return withSupabase(async (supabase) => {
    const { error } = await supabase.rpc("cancel_poll", {
      p_poll_id: parsed.data,
    });
    return mapPollError(error) ?? { ok: true };
  });
}

/** 투표 기록 삭제: 끝난 방을 내 목록에서만 지운다(방과 남의 결과는 남음, D-43) */
export async function leaveEndedPollAction(input: string): Promise<PollResult> {
  const parsed = uuid.safeParse(input);
  if (!parsed.success) return fail("invalid");
  return withSupabase(async (supabase) => {
    const { error } = await supabase.rpc("leave_ended_poll", {
      p_poll_id: parsed.data,
    });
    return mapPollError(error) ?? { ok: true };
  });
}

/** 방장이 투표방에서 링크를 보냈을 때 (보낸 뒤에는 만들기 취소가 아니라 투표 취소, D-15 안건 2) */
export async function markPollSharedAction(input: string): Promise<PollResult> {
  const parsed = uuid.safeParse(input);
  if (!parsed.success) return fail("invalid");
  return withSupabase(async (supabase) => {
    const { error } = await supabase.rpc("mark_poll_shared", {
      p_poll_id: parsed.data,
    });
    // 이미 보낸 방이면 서버가 poll_already_shared를 낸다. 화면에는 성공과 같다
    if (error?.message?.includes("poll_already_shared")) return { ok: true };
    return mapPollError(error) ?? { ok: true };
  });
}

const avoidInput = z.object({
  pollId: uuid,
  places: z
    .array(
      z.object({
        placeId,
        name: z.string().max(100),
        categoryText: z.string().max(200),
        categoryLabel: z.string().max(40),
      }),
    )
    .min(1)
    .max(5),
});

/**
 * 기피 경고 (POLL-13). 후보마다 참여자 누군가의 기피 규칙에 걸리는지만 받는다(누구, 무엇 비공개).
 * 참여자 3명 미만이면 tooFew(화면은 경고 칸을 숨김). 한 사람이 한 방에서 하루 10번까지(G7).
 */
export async function avoidFlagsAction(
  input: z.input<typeof avoidInput>,
): Promise<PollResult<{ flagged: string[]; tooFew: boolean }>> {
  const parsed = avoidInput.safeParse(input);
  if (!parsed.success) return fail("invalid");
  return withSupabase(async (supabase) => {
    const { data, error } = await supabase.rpc("poll_avoid_flags", {
      p_poll_id: parsed.data.pollId,
      p_places: parsed.data.places.map((p) => ({
        place_id: p.placeId,
        name: p.name,
        category_text: p.categoryText,
        category_label: p.categoryLabel,
      })),
    });
    const failed = mapPollError(error);
    if (failed) return failed;
    const rows = data ?? [];
    return {
      ok: true,
      flagged: rows.filter((r) => r.flagged).map((r) => r.place_id),
      tooFew: rows.some((r) => r.too_few),
    };
  });
}

/** claim_poll_closed_report 응답 (20261101170000). db:types 갱신 전이라 여기서 모양을 정한다 */
const closedReport = z.union([
  z.object({
    claimed: z.literal(true),
    reason: z.string().max(40),
    participant_count: z.number().int().min(0),
  }),
  z.object({ claimed: z.literal(false) }),
]);

/**
 * poll_closed 보고권 (T7.30, PRD 10.2 North Star). 마감, 취소된 방을 처음 본 참여자에게만 claimed true.
 * true를 받은 화면만 이벤트를 보낸다. 실패는 조용히 claimed false(이벤트 하나 때문에 화면을 막지 않는다).
 */
export async function claimPollClosedReportAction(
  input: string,
): Promise<
  | { claimed: true; reason: string; participantCount: number }
  | { claimed: false }
> {
  const parsed = uuid.safeParse(input);
  if (!parsed.success) return { claimed: false };
  try {
    const supabase = await createServerSupabase();
    if (!supabase) return { claimed: false };
    const { data, error } = await supabase.rpc("claim_poll_closed_report", {
      p_poll_id: parsed.data,
    });
    if (error) return { claimed: false };
    const r = closedReport.safeParse(data);
    if (!r.success || !r.data.claimed) return { claimed: false };
    return {
      claimed: true,
      reason: r.data.reason,
      participantCount: r.data.participant_count,
    };
  } catch {
    return { claimed: false };
  }
}
