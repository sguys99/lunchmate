// 4상태 공용 로직 (T1.13). 상태별로 어떤 데이터와 문구를 쓰는지는 여기서 정하고,
// 스켈레톤, 빈 상태, 오류, 오프라인의 시각 표현은 시안별 화면이 정한다.
import { homeCopy, pollPreviewCopy } from "@/copy/home";
import {
  MOCK_DETAIL_PLACE,
  MOCK_HOME_EMPTY,
  MOCK_HOME_TODAY,
  MOCK_POLL,
  type DesignState,
  type MockPick,
  type MockPlace,
  type MockPoll,
} from "@/features/design-lab/mock";

/** 문구만 있는 상태 화면 (빈 상태, 오류, 오프라인). action은 버튼 라벨 */
export type StateMessage = {
  title: string;
  body: string;
  action: string;
};

export type HomeContent =
  | { kind: "ready"; picks: MockPick }
  | { kind: "loading"; label: string }
  | ({ kind: "empty" | "error" | "offline" } & StateMessage);

/** 오늘(홈) 화면: 상태 → 보여 줄 데이터와 문구 */
export function getHomeContent(state: DesignState): HomeContent {
  switch (state) {
    case "ready":
      return { kind: "ready", picks: MOCK_HOME_TODAY };
    case "loading":
      return { kind: "loading", label: homeCopy.states.loading.label };
    case "empty": {
      const { walkLimitMinutes, expandToMinutes } = MOCK_HOME_EMPTY;
      return {
        kind: "empty",
        title: homeCopy.states.empty.title,
        body: homeCopy.states.empty.body(walkLimitMinutes, expandToMinutes),
        action: homeCopy.states.empty.action(expandToMinutes),
      };
    }
    case "error":
      return { kind: "error", ...homeCopy.states.error };
    case "offline":
      return { kind: "offline", ...homeCopy.states.offline };
  }
}

export type SheetContent =
  | { kind: "ready"; place: MockPlace; poll: MockPoll }
  /** 식당 정보는 있고 득표가 0인 투표. message는 득표 바 자리에 보여 줄 안내 */
  | { kind: "empty"; place: MockPlace; poll: MockPoll; message: string }
  | { kind: "loading"; label: string }
  | ({ kind: "error" | "offline" } & StateMessage);

const EMPTY_POLL: MockPoll = {
  ...MOCK_POLL,
  myVotePlaceId: null,
  candidates: MOCK_POLL.candidates.map((c) => ({ ...c, votes: 0 })),
};

/** 바텀시트 상세 + 득표 바 화면: 상태 → 보여 줄 데이터와 문구 */
export function getSheetContent(state: DesignState): SheetContent {
  switch (state) {
    case "ready":
      return { kind: "ready", place: MOCK_DETAIL_PLACE, poll: MOCK_POLL };
    case "loading":
      return { kind: "loading", label: homeCopy.states.loading.label };
    case "empty":
      return {
        kind: "empty",
        place: MOCK_DETAIL_PLACE,
        poll: EMPTY_POLL,
        message: pollPreviewCopy.noVotes,
      };
    case "error":
      return { kind: "error", ...homeCopy.states.error };
    case "offline":
      return { kind: "offline", ...homeCopy.states.offline };
  }
}
