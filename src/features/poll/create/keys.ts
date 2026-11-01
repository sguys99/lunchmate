// 투표 쿼리 키 (T7.11, T7.21). dbKeys.me 아래라 로그아웃, 탈퇴 때 함께 지워진다(src/lib/query/db-keys.ts clearMyData).
import { dbKeys } from "@/lib/query/db-keys";

/** 투표 탭 목록(my_polls) */
export const myPollsKey = [...dbKeys.me, "polls"] as const;

/** 투표방 한 곳(get_poll). 투표방 화면과 투표 탭 데스크톱 지도(T8.11b)가 같은 캐시를 쓴다 */
export const pollRoomKey = (pollId: string) =>
  ["db", "poll", "room", pollId] as const;

/** 내 사무실 핀(myOfficesAction). 투표 탭 데스크톱 지도가 진행 중 투표가 없을 때 기본 사무실을 찾는다 */
export const myOfficesKey = [...dbKeys.me, "poll-offices"] as const;
