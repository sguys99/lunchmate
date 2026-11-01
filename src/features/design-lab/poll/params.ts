// 투표방 시안 쿼리 (T7.1): /design-lab/poll/<a|b|c>?...
//   state=ready|loading|empty|error|offline  4상태 (pnpm shots --states 규약)
//     loading  투표방을 불러오는 중(뼈대)
//     empty    아직 아무도 투표하지 않은 방(득표 0)
//     error    투표방을 불러오지 못함. fail=vote면 대신 투표 전송 실패(고른 곳 유지), fail=name이면 후보 2 이름 해석 실패(T5.12a)
//     offline  마지막으로 받은 득표를 보이고 투표 버튼을 끈다
//   flow=vote|voted|tie|closing|result|expired|full|canceled  캡처용 시작 단계
//     vote     진행 중, 내가 아직 안 찍음(기본)     voted    진행 중, 찍은 뒤
//     tie      마감했는데 동점(방장은 직접 고르기 또는 룰렛, 참여자는 기다림)
//     closing  확정 순간(바가 마지막 값으로 차오르고 축하 한 줄이 나타남)
//     result   확정 뒤 결과 화면(길찾기, 결과 공유)
//     expired  마감 후 24시간 지난 링크   full  30명 초과   canceled  방장 취소
//   role=member|host|guest  보는 사람 (guest는 비로그인 미리보기 POLL-05)
//   multi=on       복수 선택 투표
//   live=lost      실시간 연결 끊김(재연결 안내)
//   suggest=on     후보 제안이 하나 들어와 있음(방장은 승인 줄, 참여자는 보냄 줄)
//   sim=on         다른 참여자의 표가 잠시 뒤 하나 들어오는 실시간 시연(캡처에서는 끈다)
import { parseDesignState, type DesignState } from "@/features/design-lab/mock";

export const POLL_FLOWS = [
  "vote",
  "voted",
  "tie",
  "closing",
  "result",
  "expired",
  "full",
  "canceled",
] as const;
export type PollFlow = (typeof POLL_FLOWS)[number];

export type PollRole = "member" | "host" | "guest";

export type PollParams = {
  state: DesignState;
  fail: "load" | "vote" | "name";
  flow: PollFlow;
  role: PollRole;
  multi: boolean;
  liveLost: boolean;
  suggest: boolean;
  sim: boolean;
};

type Raw = Readonly<Record<string, string | readonly string[] | undefined>>;

function first(raw: Raw, key: string): string | undefined {
  const v = raw[key];
  const s = typeof v === "string" ? v : v?.[0];
  return s?.trim().toLowerCase();
}

function oneOf<T extends string>(
  options: readonly T[],
  value: string | undefined,
  fallback: T,
): T {
  return value !== undefined && (options as readonly string[]).includes(value)
    ? (value as T)
    : fallback;
}

export function parsePollParams(raw: Raw): PollParams {
  return {
    state: parseDesignState(raw),
    fail: oneOf(["load", "vote", "name"], first(raw, "fail"), "load"),
    flow: oneOf(POLL_FLOWS, first(raw, "flow"), "vote"),
    role: oneOf(["member", "host", "guest"], first(raw, "role"), "member"),
    multi: first(raw, "multi") === "on",
    liveLost: first(raw, "live") === "lost",
    suggest: first(raw, "suggest") === "on",
    sim: first(raw, "sim") === "on",
  };
}

/** 투표방 자체를 못 불러온 오류인가 (vote, name 실패는 화면을 그대로 그린다) */
export function isLoadError(p: PollParams): boolean {
  return p.state === "error" && p.fail === "load";
}

/** 후보 2의 이름 해석에 실패한 화면인가 (?state=error&fail=name) */
export function isNameFail(p: PollParams): boolean {
  return p.state === "error" && p.fail === "name";
}

/** 투표 전송 실패 화면인가 (?state=error&fail=vote) */
export function isVoteFail(p: PollParams): boolean {
  return p.state === "error" && p.fail === "vote";
}

/** 투표방 안에 들어갈 수 없는 안내 화면인가 */
export function isNoticeFlow(
  flow: PollFlow,
): flow is "expired" | "full" | "canceled" {
  return flow === "expired" || flow === "full" || flow === "canceled";
}
