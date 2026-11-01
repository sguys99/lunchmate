// @map 슬롯 /poll/<code>: 데스크톱 우측 지도에 투표방 기준점과 후보 핀, 1위나 확정 핀만 올리브 (T7.16, D-14 안건 3).
import { PollMap } from "@/features/poll/room/poll-map";

export default function PollRoomMapSlot() {
  return <PollMap />;
}
