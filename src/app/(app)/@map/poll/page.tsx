// @map 슬롯 /poll: 데스크톱 우측 지도에 진행 중 내 투표의 기준점과 후보 핀, 없으면 기본 사무실 주변 (T8.11b).
// 투표 진입점(flags.pollEntry)이 꺼져 "곧 열립니다"인 동안은 빈 지도 자리. 슬롯 catch-all을 탭별로 나눈 이유는 me/page.tsx 참고.
import { MapPane } from "@/components/app-shell";
import { PollTabMap } from "@/features/poll/tab/poll-tab-map";
import { isEnabled } from "@/lib/flags";

export default function PollTabMapSlot() {
  if (!isEnabled("pollEntry")) return <MapPane />;
  return <PollTabMap />;
}
