// 투표 탭 /poll. 투표방(T7)이 들어오기 전까지 "곧 열립니다" 안내(5단계 마무리, 2026-10-31).
// appShell이 프로덕션에서도 켜져 있으므로 자리 문구 대신 디자인된 안내를 보여 준다. T7에서 투표 목록으로 바꾼다.
import { ComingSoon } from "../coming-soon";

export default function Page() {
  return <ComingSoon kind="poll" />;
}
