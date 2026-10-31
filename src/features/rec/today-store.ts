// 오늘(홈) 세션 상태 (T5.15~T5.18, REC-05). Zustand, 메모리 전용(persist 없음).
//
// - 탭을 오가도(오늘 → 지도 → 오늘) 같은 묶음, 같은 기준 위치, 이번 세션에 본 곳(seen)이 남게 화면 밖에 둔다.
//   새로고침하면 사라진다("이번 세션", REC-05).
// - 장소 id, 이름, 좌표, 현위치 좌표가 들어 있다. localStorage, 서버, 분석 이벤트로 보내지 않는다(CLAUDE.md 7장).
// - 데스크톱 우측 지도(@map 슬롯, today-map.tsx)는 map 조각만 읽는다(오늘 화면이 채운다).
// - 서버 렌더에서는 쓰기가 일어나지 않는다(이벤트와 효과에서만 바꾼다). 그래서 서버는 언제나 초기값을 본다.
import { create } from "zustand";
import type { LatLng } from "@/lib/map/types";
import type { Meal } from "@/lib/time";
import type { BaseChoice, BaseNotice, HereState } from "./base-location";

export type TodayMapPin = { id: string; name: string; position: LatLng };

export type TodayMapView = {
  base: { kind: "office" | "here"; center: LatLng; radiusM: number } | null;
  pins: readonly TodayMapPin[];
  /** 큰 카드(또는 그냥 골라줘 결과)의 id. 이 핀만 올리브 */
  activeId: string | null;
};

/** 한 묶음을 뽑는 데 쓴 값. 같은 값이면 같은 묶음이다 */
export type DrawState = {
  /** null이면 아직 시드를 정하지 않음(첫 마운트 효과에서 정한다) */
  seed: number | null;
  /** 묶음을 뽑은 시각(ms). 이유 문장과 웨이팅 판정 기준 */
  at: number;
  /** 화면 전환 회차. 다시 뽑기, 끼니와 기준 위치 바꾸기마다 1씩 는다 */
  round: number;
  seen: ReadonlySet<string>;
  /** seen을 다 썼을 때도 빼는 곳(직전 화면의 곳) */
  fallback: ReadonlySet<string>;
};

export type TodaySession = {
  choice: BaseChoice | null;
  here: HereState;
  notice: BaseNotice;
  mealOverride: Meal | null;
  walkOverride: number | null;
  budgetRelaxed: boolean;
  /** 이번 세션 다시 뽑기 횟수(recommendation_reshuffled count_in_session) */
  rerolls: number;
  draw: DrawState;
  /** 큰 카드 순서(묶음 안 번호). 대안을 누르면 바뀐다 */
  order: readonly number[];
  map: TodayMapView;
};

const EMPTY: ReadonlySet<string> = new Set();

export const INITIAL_SESSION: TodaySession = {
  choice: null,
  here: { status: "idle" },
  notice: null,
  mealOverride: null,
  walkOverride: null,
  budgetRelaxed: false,
  rerolls: 0,
  draw: { seed: null, at: 0, round: 0, seen: EMPTY, fallback: EMPTY },
  order: [0, 1, 2],
  map: { base: null, pins: [], activeId: null },
};

type Actions = {
  patch: (next: Partial<TodaySession>) => void;
  /** 새 시드로 다시 뽑는다. shown을 넘기면 이번 세션 제외에 더한다(다시 뽑기) */
  redraw: (shown?: readonly string[]) => void;
  setMap: (map: TodayMapView) => void;
  reset: () => void;
};

/** 예산을 푼 설정: 제보 가격 필터에 걸리지 않을 만큼 큰 값(REC-09 "예산 조건 풀기") */
export const RELAXED_BUDGET_KRW = Number.MAX_SAFE_INTEGER;

export function randomSeed(): number {
  return Math.floor(Math.random() * 2 ** 31);
}

export const useTodaySession = create<TodaySession & Actions>()((set) => ({
  ...INITIAL_SESSION,
  patch: (next) => set(next),
  redraw: (shown) =>
    set((s) => {
      const seen = shown ? new Set([...s.draw.seen, ...shown]) : s.draw.seen;
      return {
        order: [0, 1, 2],
        draw: {
          seed: randomSeed(),
          at: Date.now(),
          round: s.draw.round + 1,
          seen,
          fallback: shown ? new Set(shown) : s.draw.fallback,
        },
      };
    }),
  setMap: (map) => set({ map }),
  reset: () => set(INITIAL_SESSION),
}));
