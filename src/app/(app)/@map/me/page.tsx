// @map 슬롯 /me: 데스크톱 우측 지도에 기본 사무실과 나 탭에서 보이는 줄의 핀(이름을 아는 곳만), 이름을 누른 곳은 올리브 (T6.13, D-12 안건 11).
// 나 탭 화면이 me-map-store에 넣고 여기서는 읽기만 한다. 1024px 미만이나 SDK 실패면 빈 지도 자리.
// 슬롯 catch-all을 (app) 바로 아래에 두면 Next 16 엄격한 라우트 검사가 /login, /design-lab 같은 앱 밖 경로까지 이 슬롯에 묶어 dev에서 404를 낸다. 그래서 탭 경로마다 둔다.
import { MeMap } from "@/features/me/history/me-map";

export default function MeMapSlot() {
  return <MeMap />;
}
