// 회식 모드 지도 상태 (T7.27). Zustand, 메모리 전용(persist 없음).
// 회식 화면이 기준점과 후보 핀을 넣고, 모바일 지도 띠와 데스크톱 우측 지도(@map/poll/party 슬롯)가 읽는다.
// 장소 이름과 좌표가 들어 있다. localStorage, 서버, 분석 이벤트로 보내지 않는다(CLAUDE.md 7장).
import { create } from "zustand";
import type { LatLng } from "@/lib/map/types";

export type PartyMapPin = { id: string; name: string; position: LatLng };

export type PartyMapView = {
  base: { center: LatLng; radiusM: number } | null;
  pins: readonly PartyMapPin[];
  /** 고른 후보 번호(0부터). 그 핀만 올리브 + 이름 알약 */
  active: number;
};

type PartyMapState = PartyMapView & {
  setView: (view: Omit<PartyMapView, "active">) => void;
  setActive: (i: number) => void;
  clear: () => void;
};

export const usePartyMap = create<PartyMapState>((set) => ({
  base: null,
  pins: [],
  active: 0,
  setView: (view) => set({ ...view, active: 0 }),
  setActive: (active) => set({ active }),
  clear: () => set({ base: null, pins: [], active: 0 }),
}));
