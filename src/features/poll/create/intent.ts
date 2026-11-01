// 투표 만들기 시트 열기 계약 (T7.11, T7.12, PARTY-05, D-15). Zustand, 메모리 전용(persist 없음).
//
// - 홈 "친구랑 정하기", 상세 "투표에 추가", 회식 "이 후보로 투표 만들기", 지도에서 고르기가 openPollCreate(intent)를 부른다.
//   시트(src/features/poll/create/create-sheet.tsx)는 이 스토어를 구독해 열리고, 닫히면 intent를 비운다.
// - places의 name, category는 세션 메모리 전달용이다. DB, localStorage, 분석 이벤트로 보내지 않는다(CLAUDE.md 7장).
//   서버에는 placeId, placeUrl만 간다.
// - anchor는 후보 이름 확인용 기준점(방장 사무실 핀 또는 지도에서 찍은 점). 현위치 좌표는 넣지 않는다(T0.16-1, T7.6).
import { create } from "zustand";

export type PollKind = "lunch" | "dinner" | "party";

export type PollCreateEntry = "home" | "detail" | "party" | "map";

export type PollCreatePlace = {
  placeId: string;
  placeUrl: string;
  /** 세션 메모리 전달용(저장 금지) */
  name?: string;
  /** 세션 메모리 전달용 카카오 카테고리 이름(저장 금지) */
  category?: string;
};

export type PollAnchor = { lat: number; lng: number; radiusM: number };

/** poll_candidate_added.source (PRD 10.2) */
export type CandidateSource =
  "rec" | "map" | "detail" | "party" | "favorite" | "history";

export type PollCreateIntent = {
  entry: PollCreateEntry;
  kind: PollKind;
  places: PollCreatePlace[];
  anchor?: PollAnchor;
  /**
   * 첫 후보(진입점이 넘긴 그 식당)가 어디서 왔는가. 없으면 entry로 정한다.
   * 홈 카드 더 보기 "투표에 추가"는 entry가 detail이어도 rec(추천 수락률, PRD 10.2)
   */
  source?: "rec" | "map" | "detail";
  /**
   * true면 바로 만들지 않고 "투표 만들기" 버튼이 있는 확인 시트로 연다.
   * 로그인 유도 시트를 거쳐 돌아온 경우(D-15 안건 15). 기본은 누르는 순간 만든다(D-15 C).
   */
  confirm?: boolean;
};

type IntentState = {
  /** 마지막 요청. 닫힌 뒤에도 남겨 시트 퇴장 모션 동안 내용을 유지한다. null이면 아직 연 적 없음 */
  intent: PollCreateIntent | null;
  /** 시트가 열려 있는가 */
  isOpen: boolean;
  /** 같은 intent를 다시 열 때도 새 요청(새 시트 상태)으로 보이게 하는 번호 */
  nonce: number;
  open: (intent: PollCreateIntent) => void;
  close: () => void;
};

export const usePollCreateIntent = create<IntentState>((set) => ({
  intent: null,
  isOpen: false,
  nonce: 0,
  open: (intent) => set((s) => ({ intent, isOpen: true, nonce: s.nonce + 1 })),
  close: () => set({ isOpen: false }),
}));

/** 투표 만들기 시트를 연다. 시트 본체는 첫 호출 뒤 지연 로딩된다 */
export function openPollCreate(intent: PollCreateIntent): void {
  usePollCreateIntent.getState().open(intent);
}
