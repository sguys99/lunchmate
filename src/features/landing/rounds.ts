// 랜딩 데모 다시 뽑기 묶음 순서 (T4.28). React 의존 없는 순수 함수.
import { landingCopy } from "@/copy/landing";

/** 누른 횟수 → 보여 줄 묶음 번호(0부터). 묶음이 없으면 0 */
export function setIndex(round: number, total: number): number {
  if (total <= 0 || !Number.isFinite(round)) return 0;
  const r = Math.trunc(round) % total;
  return r < 0 ? r + total : r;
}

/** 화면 오른쪽 위 "1/3" 표시 */
export function roundLabel(round: number, total: number): string {
  return landingCopy.demo.round(setIndex(round, total) + 1, Math.max(total, 1));
}
