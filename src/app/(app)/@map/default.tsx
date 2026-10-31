// 앱 셸 데스크톱 우측 지도 칸 슬롯(@map)의 기본값 (T5.17). 지도가 없는 화면은 빈 지도 자리(MapPane)를 보인다.
// 오늘(/today)은 @map/today가 추천 세 곳 핀을 그린다. 지도 탭(T5.26~T5.31)은 자기 화면이 지도를 맡는다.
import { MapPane } from "@/components/app-shell";

export default function MapSlotDefault() {
  return <MapPane />;
}
