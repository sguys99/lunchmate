// 브라우저 조회 표 (/api/read). 서버 액션은 탭마다 한 줄로 서서 하나씩 나가므로(Next 문서 server-actions.md
// "Sequential dispatch on the client") 화면이 동시에 부르는 조회는 여기 올려 Route Handler로 나란히 받는다.
// 함수는 기존 서버 액션 그대로다. 입력 검증(zod)과 RLS(본인 세션)는 각 함수 안에 있다.
// 쓰기 함수는 넣지 않는다(read-table.test.ts). 관리자 조회는 화면이 한 번에 하나만 불러 그대로 둔다.
import "server-only";
import {
  feedbackBandAction,
  myDailyLimitsAction,
  myPlacesAction,
  myReviewsAction,
  myVisitsAction,
} from "@/features/feedback/actions";
import { myOldestVisitAction } from "@/features/me/history/actions";
import {
  myFavoriteMemosAction,
  myPlaceMemosAction,
} from "@/features/memo/actions";
import { myReviewMenuAction, placeMenusAction } from "@/features/menu/actions";
import { placeUserStateAction } from "@/features/place/actions";
import {
  placeDealsAction,
  placeReviewsAction,
  placeStatsAction,
} from "@/features/place/stats-actions";
import {
  myOfficesAction,
  myPollLimitAction,
  myPollsAction,
} from "@/features/poll/create/actions";
import { avoidFlagsAction, pollRoomAction } from "@/features/poll/room/actions";
import { fetchHomeStats, fetchPlaceStats } from "@/features/rec/stats-source";

export const READS = {
  feedbackBandAction,
  myDailyLimitsAction,
  myPlacesAction,
  myReviewsAction,
  myVisitsAction,
  myOldestVisitAction,
  myFavoriteMemosAction,
  myPlaceMemosAction,
  myReviewMenuAction,
  placeMenusAction,
  placeUserStateAction,
  placeDealsAction,
  placeReviewsAction,
  placeStatsAction,
  myOfficesAction,
  myPollLimitAction,
  myPollsAction,
  avoidFlagsAction,
  pollRoomAction,
  fetchHomeStats,
  fetchPlaceStats,
};

export type Reads = typeof READS;
