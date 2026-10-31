// 거리 유틸 (T5.5, PRD 6.4 "거리 계산 규칙", CLAUDE.md 8장).
// 도보 분 = 직선거리 × 1.3 ÷ 67m/분, 검색 반경 = 허용 도보 분 × 67 ÷ 1.3 m.
// 계수와 표시용 정수 변환은 src/lib/format/number.ts가 정본이라 그대로 다시 내보내고,
// 점수 계산에 쓰는 소수 도보 분과 반경 안 판정만 여기 둔다.
import {
  WALK_DETOUR_FACTOR,
  WALK_SPEED_M_PER_MIN,
  searchRadiusFromWalkMinutes,
  walkMinutesFromMeters,
} from "@/lib/format/number";

export {
  WALK_DETOUR_FACTOR,
  WALK_SPEED_M_PER_MIN,
  searchRadiusFromWalkMinutes,
  walkMinutesFromMeters,
};

/** 직선거리(m) → 도보 분(소수, 반올림 없음). 점수 D 계산용. 음수와 NaN은 0으로 본다 */
export function estimateWalkMinutes(distanceM: number): number {
  if (!Number.isFinite(distanceM) || distanceM <= 0) return 0;
  return (distanceM * WALK_DETOUR_FACTOR) / WALK_SPEED_M_PER_MIN;
}

/** 허용 도보 분 안인가. 카카오 반경 검색 결과(반경 = 분 × 67 ÷ 1.3)와 같은 경계를 쓴다 */
export function isWithinWalk(distanceM: number, walkMinutes: number): boolean {
  return distanceM <= searchRadiusFromWalkMinutes(walkMinutes);
}
