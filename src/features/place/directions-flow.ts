// 길찾기 한 번의 흐름 (T5.36~T5.38 NAV-01~04, T5.20 REC-08). 상세(useDirections)와 오늘(홈) 카드가 같이 쓴다.
//   1. 로그인 상태면(모르면 시도) 방문 후보 저장 요청을 먼저 보낸다(결과를 기다리지 않음. 실패해도 길찾기는 계속)
//   2. 앱 시도 → 미설치면 웹, 데스크톱은 바로 웹(launch-directions.ts)
//   3. directions_clicked(place_id, source, app_or_web). 장소명, 좌표는 보내지 않는다
// 사용자 탭 안에서 동기로 불러야 한다(새 탭, 앱 실행이 사용자 동작으로 인정되게).
// 출발지 좌표(사무실 핀, 현위치)는 네이버 URL에만 들어가고 우리 서버로 가지 않는다(CLAUDE.md 7장).
// 이 파일은 React와 문구에 의존하지 않는다(홈은 첫 로드 밖에서 동적으로 받는다).
import { track } from "@/lib/analytics";
import { siteUrl } from "@/lib/env/site";
import type { LatLng } from "@/lib/map/types";
import { naverAppName, type DirectionsOrigin } from "@/lib/naver/directions";
import type { Meal } from "@/lib/time";
import { saveVisitAction } from "./actions";
import {
  browserLaunchEnv,
  launchDirections,
  type DirectionsResult,
} from "./launch-directions";

export type DirectionsSource = "rec" | "map" | "poll";

export type StartDirectionsArgs = {
  placeId: string;
  placeUrl: string;
  name: string;
  position: LatLng;
  origin: DirectionsOrigin | null;
  meal: Meal;
  source: DirectionsSource;
  /** 로그인 상태면 true. 모르면 null(저장을 시도하고, 서버가 비로그인이면 저장하지 않음) */
  signedIn: boolean | null;
  online: boolean;
};

export function startDirections(
  args: StartDirectionsArgs,
): Promise<DirectionsResult> {
  if (args.online && args.signedIn !== false) {
    void saveVisitAction({
      placeId: args.placeId,
      placeUrl: args.placeUrl,
      meal: args.meal,
      source: args.source,
    }).catch(() => undefined);
  }
  return launchDirections(
    {
      destination: { name: args.name, position: args.position },
      origin: args.origin,
      appname: naverAppName(siteUrl()),
    },
    browserLaunchEnv(),
  ).then((result) => {
    track({
      name: "directions_clicked",
      properties: {
        place_id: args.placeId,
        source: args.source,
        app_or_web: result,
      },
    });
    return result;
  });
}
