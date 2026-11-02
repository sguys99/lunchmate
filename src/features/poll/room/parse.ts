// 투표방 서버 응답 파서 (T7.15~T7.19). get_poll, poll_preview(jsonb)를 zod로 읽는다. 서버 액션만 import한다
// (브라우저 번들에 zod를 넣지 않게 model.ts와 나눴다, tasks 2.4절).
import "server-only";
import * as z from "zod";
import { cleanAvatarUrl } from "@/features/auth/naver-profile";
import type { PollPreview, PollRoom } from "./model";

const kindSchema = z.enum(["lunch", "dinner", "party"]);
const statusSchema = z.enum(["open", "tie", "closed", "canceled"]);
const placeIdSchema = z.string().regex(/^[0-9]{1,20}$/);

const previewSchema = z.union([
  z.object({ status: z.literal("expired") }),
  z.object({
    status: statusSchema,
    kind: kindSchema,
    title: z.string(),
    multi: z.boolean(),
    closes_at: z.string(),
    closed_at: z.string().nullable(),
    anchor_lat: z.number(),
    anchor_lng: z.number(),
    radius_m: z.number(),
    member_count: z.number(),
    member_limit: z.number(),
    is_member: z.boolean(),
    poll_id: z.string().nullable(),
    candidates: z.array(
      z.object({
        position: z.number(),
        place_id: placeIdSchema,
        place_url: z.string().nullable(),
      }),
    ),
  }),
]);

export function parsePreview(raw: unknown): PollPreview | null {
  if (raw === null || raw === undefined) return null;
  const r = previewSchema.safeParse(raw);
  if (!r.success) return null;
  const d = r.data;
  if (d.status === "expired") return { status: "expired" };
  return {
    status: d.status,
    kind: d.kind,
    title: d.title,
    multi: d.multi,
    closesAt: d.closes_at,
    closedAt: d.closed_at,
    anchor: { lat: d.anchor_lat, lng: d.anchor_lng },
    radiusM: d.radius_m,
    memberCount: d.member_count,
    memberLimit: d.member_limit,
    isMember: d.is_member,
    pollId: d.poll_id,
    candidates: d.candidates.map((c) => ({
      position: c.position,
      placeId: c.place_id,
      placeUrl: c.place_url,
    })),
  };
}

const roomSchema = z.object({
  poll: z.object({
    id: z.string(),
    invite_code: z.string(),
    kind: kindSchema,
    title: z.string(),
    multi: z.boolean(),
    status: statusSchema,
    closes_at: z.string(),
    closed_at: z.string().nullable(),
    closed_reason: z
      .enum(["deadline", "host", "cancel", "host_left"])
      .nullable(),
    tie_until: z.string().nullable(),
    tie_resolved_by: z.enum(["host", "roulette", "auto"]).nullable(),
    winner_place_id: z.string().nullable(),
    winner_place_url: z.string().nullable(),
    anchor_lat: z.number(),
    anchor_lng: z.number(),
    radius_m: z.number(),
    shared: z.boolean(),
    is_host: z.boolean(),
  }),
  candidates: z.array(
    z.object({
      id: z.string(),
      place_id: placeIdSchema,
      place_url: z.string().nullable(),
      position: z.number(),
      status: z.enum(["approved", "suggested"]),
      suggested_by_me: z.boolean(),
      votes: z.number().nullable(),
    }),
  ),
  members: z.array(
    z.object({
      id: z.string(),
      user_id: z.string().nullable(),
      is_host: z.boolean(),
      is_me: z.boolean(),
      has_voted: z.boolean(),
    }),
  ),
  my_votes: z.array(z.string()),
  voter_count: z.number(),
});

/** public_profiles 한 줄에서 화면에 쓰는 값(닉네임, 사진) */
export type MemberProfile = {
  readonly nickname: string | null;
  readonly avatarUrl: string | null;
};

/** get_poll 결과 → PollRoom. user_id는 공개 프로필을 찾는 데만 쓰고 브라우저로 보내지 않는다 */
export function parseRoom(
  raw: unknown,
  profiles: ReadonlyMap<string, MemberProfile>,
): PollRoom | null {
  const r = roomSchema.safeParse(raw);
  if (!r.success) return null;
  const { poll: p, candidates, members, my_votes, voter_count } = r.data;
  return {
    poll: {
      id: p.id,
      code: p.invite_code,
      kind: p.kind,
      title: p.title,
      multi: p.multi,
      status: p.status,
      closesAt: p.closes_at,
      closedAt: p.closed_at,
      closedReason: p.closed_reason,
      tieUntil: p.tie_until,
      tieResolvedBy: p.tie_resolved_by,
      winnerPlaceId: p.winner_place_id,
      winnerPlaceUrl: p.winner_place_url,
      anchor: { lat: p.anchor_lat, lng: p.anchor_lng },
      radiusM: p.radius_m,
      shared: p.shared,
      isHost: p.is_host,
    },
    candidates: candidates.map((c) => ({
      id: c.id,
      placeId: c.place_id,
      placeUrl: c.place_url,
      position: c.position,
      status: c.status,
      suggestedByMe: c.suggested_by_me,
      votes: c.votes,
    })),
    members: members.map((m) => {
      const profile = m.user_id ? profiles.get(m.user_id) : undefined;
      return {
        id: m.id,
        nickname: profile?.nickname ?? null,
        // DB 제약(profiles_avatar_url_host)과 같은 규칙으로 한 번 더 거른다
        avatarUrl: cleanAvatarUrl(profile?.avatarUrl) ?? null,
        isHost: m.is_host,
        isMe: m.is_me,
        hasVoted: m.has_voted,
      };
    }),
    myVotes: my_votes,
    voterCount: voter_count,
  };
}

/** 닉네임을 찾을 user_id 목록(탈퇴한 익명 참여자 제외) */
export function memberUserIds(raw: unknown): string[] {
  const r = roomSchema.safeParse(raw);
  if (!r.success) return [];
  return r.data.members.flatMap((m) => (m.user_id ? [m.user_id] : []));
}
