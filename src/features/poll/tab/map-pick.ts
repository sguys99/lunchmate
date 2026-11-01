// 투표 탭 데스크톱 지도에 어느 투표를 보일지 (T8.11b). 순수 함수, React와 네트워크 의존 없음.
// - 기본: 진행 중(open, tie) 가운데 마감이 가장 가까운 방. 동점 대기는 tie_until, 없으면 closes_at.
// - 목록 줄에 마우스를 올리거나 키보드 초점을 둔 진행 중 방이 있으면 그 방(지도가 줄을 따라간다).
// - 진행 중 방이 없으면 null(지도는 기본 사무실 주변).
import type { MyPollRow } from "@/features/poll/create/actions";

type Row = Pick<MyPollRow, "pollId" | "status" | "closesAt" | "tieUntil">;

const inProgress = (p: Row) => p.status === "open" || p.status === "tie";

function deadlineMs(p: Row): number {
  const at = p.status === "tie" && p.tieUntil ? p.tieUntil : p.closesAt;
  const ms = Date.parse(at);
  return Number.isNaN(ms) ? Number.POSITIVE_INFINITY : ms;
}

export function pickMapPoll<T extends Row>(
  polls: readonly T[],
  focusId: string | null,
): T | null {
  const open = polls.filter(inProgress);
  if (open.length === 0) return null;
  const focused = focusId ? open.find((p) => p.pollId === focusId) : undefined;
  if (focused) return focused;
  return open.reduce((best, p) =>
    deadlineMs(p) < deadlineMs(best) ? p : best,
  );
}
