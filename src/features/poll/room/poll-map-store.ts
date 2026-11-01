// 투표방 데스크톱 우측 지도 상태 (T7.16, D-14 안건 3). Zustand, 메모리 전용(persist 없음).
// 투표방 화면이 기준점과 후보 핀(세션 이름과 좌표)을 넣고, @map/poll 슬롯(poll-map.tsx)이 읽기만 한다.
// 장소 이름, 좌표가 들어 있으므로 저장, 서버, 분석 이벤트로 보내지 않는다(CLAUDE.md 7장).
import { create } from "zustand";
import type { LatLng } from "@/lib/map/types";

export type PollMapPin = { id: string; name: string; position: LatLng };

export type PollMapView = {
  base: LatLng | null;
  pins: readonly PollMapPin[];
  /** 1위(단독)나 확정 후보. 이 핀만 올리브 */
  activeId: string | null;
};

const EMPTY: PollMapView = { base: null, pins: [], activeId: null };

export const usePollMap = create<{
  view: PollMapView;
  setView: (view: PollMapView) => void;
  clear: () => void;
}>()((set) => ({
  view: EMPTY,
  setView: (view) => set({ view }),
  clear: () => set({ view: EMPTY }),
}));
