"use client";
// 내 식당 메모 전부(T10.15). 나 탭 즐겨찾기 이름표가 쓴다. 고친 뒤에는 applyMemo가 이 캐시를 바로 바꾼다(다시 읽지 않음).
import { useQuery } from "@tanstack/react-query";
import { memoKeys } from "./keys";
import { read } from "@/lib/read";

export function useMyMemos(enabled: boolean) {
  return useQuery({
    queryKey: memoKeys.mine,
    queryFn: () => read("myPlaceMemosAction"),
    staleTime: 5 * 60_000,
    enabled,
  });
}
