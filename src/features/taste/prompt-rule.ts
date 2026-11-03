// 홈 취향 띠를 보여 줄지 (T9.17, D-39 안건 4). 순수 함수. 오늘 화면이 첫 렌더에 부른다(홈 첫 로드에 들어가므로 작게).
// - 로그인 사용자 중 못 먹는 음식과 좋아하는 음식을 둘 다 비워 둔 사람
// - 띠를 닫은 적이 없고(taste_prompt_dismissed_at), 가입(preferences 행 생성) 7일 안
// - 어제 피드백 띠가 있으면 그쪽이 먼저다(band-slot이 피드백 띠가 숨을 때만 이 띠를 그린다)
import { DAY_MS } from "@/lib/time/constants";
import { isExpired } from "@/lib/time/deadline";

export const TASTE_PROMPT_DAYS = 7;

export function shouldShowTastePrompt(input: {
  tastePrompt: { joinedAt: string; dismissedAt: string | null } | null;
  avoidCount: number;
  likedCount: number;
  now: Date;
}): boolean {
  const { tastePrompt, avoidCount, likedCount, now } = input;
  if (!tastePrompt || tastePrompt.dismissedAt !== null) return false;
  if (avoidCount > 0 || likedCount > 0) return false;
  const joined = new Date(tastePrompt.joinedAt);
  if (Number.isNaN(joined.getTime())) return false;
  return !isExpired(joined, TASTE_PROMPT_DAYS * DAY_MS, now);
}
