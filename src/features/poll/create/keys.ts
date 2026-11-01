// 투표 쿼리 키 (T7.11, T7.21). dbKeys.me 아래라 로그아웃, 탈퇴 때 함께 지워진다(src/lib/query/db-keys.ts clearMyData).
import { dbKeys } from "@/lib/query/db-keys";

/** 투표 탭 목록(my_polls) */
export const myPollsKey = [...dbKeys.me, "polls"] as const;
