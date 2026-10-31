// 없는 주소와 notFound() (T2.18, APP-06). 루트 레이아웃 안, 앱 셸 밖이라 StandaloneFrame으로 감싼다.
// 오늘 탭(/today)은 appShell 플래그가 켜진 곳에서만 있다(2026-10-31부터 프로덕션 포함). 서버에서 판정해 꺼져 있으면 랜딩(/)으로 보낸다.
import { NotFoundScreen, StandaloneFrame } from "@/components/states/screens";
import { isEnabled } from "@/lib/flags";

export default function NotFound() {
  return (
    <StandaloneFrame>
      <NotFoundScreen homeHref={isEnabled("appShell") ? "/today" : "/"} />
    </StandaloneFrame>
  );
}
