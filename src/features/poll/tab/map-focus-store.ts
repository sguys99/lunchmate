// 투표 탭 목록 줄과 데스크톱 지도 연동 (T8.11b). Zustand, 메모리 전용(persist 없음).
// 진행 중 줄에 마우스를 올리거나 초점을 두면 그 방 id를 넣고, @map/poll 슬롯(poll-tab-map.tsx)이 읽는다.
// 줄을 벗어나도 지우지 않는다(지도가 기본 방으로 튀지 않게). 탭을 떠나면 지운다. 장소 값은 없다.
import { create } from "zustand";

export const usePollTabMapFocus = create<{
  focusId: string | null;
  setFocus: (id: string | null) => void;
}>()((set) => ({
  focusId: null,
  setFocus: (focusId) => set((s) => (s.focusId === focusId ? s : { focusId })),
}));
