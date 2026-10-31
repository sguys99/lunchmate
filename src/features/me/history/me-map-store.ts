// 나 탭 데스크톱 우측 지도 상태 (T6.13, D-12 안건 11). Zustand, 메모리 전용(persist 없음).
// 나 탭 화면이 보이는 줄의 이름 해석된 곳(이름, 좌표)과 기준 사무실을 넣고, (app)/@map/me 슬롯(me-map.tsx)이 읽기만 한다.
// 이름과 좌표는 카카오 세션 메모리 값이다. localStorage, 서버, 분석 이벤트로 보내지 않는다(CLAUDE.md 7장).
import { create } from "zustand";
import type { LatLng } from "@/lib/map/types";

export type MeMapPin = { id: string; name: string; position: LatLng };

export type MeMapView = {
  /** 기본 사무실 핀(사용자가 놓은 좌표). 없으면 null */
  base: LatLng | null;
  pins: readonly MeMapPin[];
  /** 줄에서 이름을 누른 곳. 이 핀만 올리브 */
  activeId: string | null;
};

type MeMapStore = MeMapView & {
  setBase: (base: LatLng | null) => void;
  setPins: (pins: readonly MeMapPin[]) => void;
  setActive: (id: string | null) => void;
};

const samePins = (a: readonly MeMapPin[], b: readonly MeMapPin[]) =>
  a.length === b.length && a.every((p, i) => p.id === b[i]?.id);

export const useMeMap = create<MeMapStore>((set) => ({
  base: null,
  pins: [],
  activeId: null,
  setBase: (base) =>
    set((s) =>
      s.base?.lat === base?.lat && s.base?.lng === base?.lng ? s : { base },
    ),
  setPins: (pins) => set((s) => (samePins(s.pins, pins) ? s : { pins })),
  setActive: (activeId) => set({ activeId }),
}));
