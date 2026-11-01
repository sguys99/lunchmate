// 투표 링크 미리보기(서버 OG, 메타) 데이터 (T7.14, POLL-04, POLL-09S, AC-POLL-4).
// - 읽기는 anon(publishable 키) 클라이언트로 poll_preview 하나만 부른다. 쿠키를 싣지 않으므로 카카오 스크래퍼와
//   로그인한 사람이 같은 값을 받는다(참여자용 정확한 기준점, poll_id는 오지 않는다). 서비스 키는 쓰지 않는다.
// - 식당 이름은 DB에 없고 서버에서 카카오도 부르지 않는다(T0.16-4). 이미지와 메타에는 제목, 후보 수, 마감, 숫자만.
// - og:image 주소의 ?v=는 이 값들로 만든 짧은 해시다(D-17 안건 7). 카카오 스크랩 캐시는 주소가 바뀌어야 새로 읽는다.
import "server-only";
import { createClient } from "@supabase/supabase-js";
import { supabaseConfig } from "@/lib/supabase/server";
import type { Database } from "@/lib/supabase/types";
import { getKstParts } from "@/lib/time";
import { shareCopy } from "@/copy/share";
import { parseInviteCode } from "@/features/poll/invite-code";
import { isOgDrawable } from "./ks-x-1001";
import { shortHash } from "./og-url";
import type { PollKind } from "./types";

export type { OgImageKind } from "./types";
export { shortHash };

export type PollOg =
  | { state: "unavailable" }
  | {
      state: "open" | "closed";
      kind: PollKind;
      /** 그릴 수 있는 제목. 서버 글꼴 밖 글자가 있으면 끼니별 기본 문구 */
      title: string;
      /** 원래 제목(메타 글자는 브라우저와 카카오가 그리므로 그대로 쓴다) */
      rawTitle: string;
      candidateCount: number;
      /** 마감 표기 "12:30" 또는 "11월 6일 18:00" (KST) */
      deadline: string;
      /** 확정된 방에서만. 마이그레이션 20261101150000 적용 전에는 null */
      voters: number | null;
      topVotes: number | null;
      /** 캐시 버전 */
      version: string;
    };

type Preview = {
  status?: string;
  kind?: string;
  title?: string;
  closes_at?: string;
  candidates?: unknown[];
  voted_count?: number | null;
  top_votes?: number | null;
  winner_place_id?: string | null;
};

function anonClient() {
  const config = supabaseConfig();
  if (!config) return null;
  return createClient<Database>(config.url, config.publishableKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
    },
  });
}

const pad = (n: number) => String(n).padStart(2, "0");

/** 마감 표기. 오늘(KST)이면 시각만, 아니면 날짜를 붙인다 */
export function formatDeadline(closesAt: Date, now: Date): string {
  const at = getKstParts(closesAt);
  const today = getKstParts(now);
  const clock = `${pad(at.hour)}:${pad(at.minute)}`;
  const sameDay =
    at.year === today.year && at.month === today.month && at.day === today.day;
  return sameDay
    ? clock
    : `${shareCopy.og.deadlineDay(at.month, at.day)} ${clock}`;
}

function asKind(value: unknown): PollKind {
  return value === "dinner" || value === "party" ? value : "lunch";
}

/** poll_preview 결과(jsonb)를 OG 값으로 바꾼다. 순수 함수(테스트용) */
export function toPollOg(raw: Preview | null, now: Date): PollOg {
  if (!raw || raw.status === "expired" || raw.status === "canceled") {
    return { state: "unavailable" };
  }
  if (!raw.title || !raw.closes_at) return { state: "unavailable" };
  const kind = asKind(raw.kind);
  const closesAt = new Date(raw.closes_at);
  if (Number.isNaN(closesAt.getTime())) return { state: "unavailable" };
  const closed = raw.status === "closed";
  const title = isOgDrawable(raw.title)
    ? raw.title
    : shareCopy.og.fallbackTitle[kind];
  const candidateCount = Array.isArray(raw.candidates)
    ? raw.candidates.length
    : 0;
  const voters =
    closed && typeof raw.voted_count === "number" ? raw.voted_count : null;
  const topVotes =
    closed && typeof raw.top_votes === "number" ? raw.top_votes : null;
  const deadline = formatDeadline(closesAt, now);
  // 진행 중과 동점 대기는 같은 그림(초대)이라 open으로 묶는다
  const state = closed ? "closed" : "open";
  const version = shortHash(
    [state, kind, raw.title, raw.closes_at, candidateCount, voters, topVotes]
      .map(String)
      .join("|"),
  );
  return {
    state,
    kind,
    title,
    rawTitle: raw.title,
    candidateCount,
    deadline,
    voters,
    topVotes,
    version,
  };
}

/** 코드로 투표 미리보기를 읽는다. 형식이 틀리거나 없거나 만료면 unavailable */
export async function loadPollOg(code: string): Promise<PollOg> {
  const parsed = parseInviteCode(code);
  if (!parsed) return { state: "unavailable" };
  const supabase = anonClient();
  if (!supabase) return { state: "unavailable" };
  const { data, error } = await supabase.rpc("poll_preview", {
    p_code: parsed,
  });
  if (error) throw error;
  return toPollOg((data as Preview | null) ?? null, new Date());
}
