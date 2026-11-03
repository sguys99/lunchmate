"use client";
// 오늘(홈) 데스크톱 우측 지도 (T5.17, REC-04, D-05, DESIGN.md 4장 "데스크톱"). (app)/@map/today 슬롯이 그린다.
// - 오늘 화면(today-screen)이 세션 상태(today-store map)에 기준점과 추천 세 곳 핀을 넣고, 여기서는 읽기만 한다.
// - 화면이 1024px 이상일 때만 지도 본체(today-map-live)와 지도 SDK(네이버)를 동적으로 받는다. 모바일에서는 지도 칸이 숨겨져 있어
//   받지 않는다(이 문지기만 홈 첫 로드에 남는다, 11/03 감량).
// - 기준점 마커 + 세 곳 핀(이름 알약 + 점), 큰 카드(또는 그냥 골라줘 결과)의 핀만 올리브. 처음과 묶음이 바뀔 때 핀이 다 보이게 맞춘다.
// - 지도 구현(T5.26~T5.31) 전 최소 표시다. 클러스터, 필터, 마커 탭 시트는 지도 작업이 맡는다.
// - 이름은 카카오 세션 메모리 값이라 textContent로만 넣는다(innerHTML 금지). 좌표는 어디에도 보내지 않는다.
// - SDK 로딩 실패나 키 없음이면 조용한 빈 지도 자리(MapPane)로 둔다(PRD 12장 "지도 로딩 실패 시 리스트 보기"; 리스트는 왼쪽에 이미 있다).
import { lazy, Suspense, useSyncExternalStore } from "react";
import { MapPane } from "@/components/app-shell";
import { useTodaySession } from "./today-store";
import "./today.css";

const LiveMap = lazy(() =>
  import("./today-map-live").then((m) => ({ default: m.LiveMap })),
);

const DESKTOP_QUERY = "(min-width: 64rem)";

function subscribeDesktop(onChange: () => void) {
  const mq = window.matchMedia(DESKTOP_QUERY);
  mq.addEventListener("change", onChange);
  return () => mq.removeEventListener("change", onChange);
}

function useDesktop(): boolean {
  return useSyncExternalStore(
    subscribeDesktop,
    () => window.matchMedia(DESKTOP_QUERY).matches,
    () => false,
  );
}

export function TodayMap() {
  const desktop = useDesktop();
  const view = useTodaySession((s) => s.map);
  if (!desktop || !view.base) return <MapPane />;
  return (
    <Suspense fallback={<MapPane />}>
      <LiveMap view={view} />
    </Suspense>
  );
}
