// @map 슬롯 /me: 오늘에서 나 탭으로 옮겨 가면(클라이언트 이동) 오늘 지도가 남지 않게 빈 지도 자리로 바꾼다 (T5.17).
// 슬롯 catch-all을 (app) 바로 아래에 두면 Next 16 엄격한 라우트 검사가 /login, /design-lab 같은 앱 밖 경로까지 이 슬롯에 묶어 dev에서 404를 낸다. 그래서 탭 경로마다 둔다.
import { MapPane } from "@/components/app-shell";

export default function MapSlotOther() {
  return <MapPane />;
}
