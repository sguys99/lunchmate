// @map 슬롯 /me 아래 경로(계정, 사무실 등과 셸 안 404): 빈 지도 자리. 슬롯 catch-all을 탭별로 나눈 이유는 me/page.tsx 참고.
import { MapPane } from "@/components/app-shell";

export default function MapSlotOther() {
  return <MapPane />;
}
