// 오프라인 기본 화면 (T8.3, PRD APP-02, research-notes T0.16-3). 루트 레이아웃 안, 앱 셸 밖.
//
// - 서비스 워커(public/sw.js)가 설치 때 이 HTML과 이 화면이 쓰는 /_next/static 파일을 미리 받고,
//   페이지 이동이 네트워크 실패로 끝나면 원래 주소 그대로 이 화면을 보여 준다.
// - 로그인 정보, 설정, 장소 데이터 없이 누구에게나 같은 정적 화면이어야 한다(쿠키 없이 받아 캐시한다).
//   장소 이름과 추천 결과는 기기에 저장하지 않으므로 여기서 보여 줄 수 없다. 탭이 열린 채 끊긴 경우의
//   "연결 전 결과"는 각 화면이 세션 메모리(TanStack Query)로 따로 보여 준다(오늘, 지도, 나).
// - 연결이 돌아오면(online 이벤트) 원래 주소를 다시 연다. 다시 시도 버튼도 같은 동작이다.
//   하이드레이션 전에 주소를 잡아 두는 인라인 스크립트라 JS 청크를 못 받아도 동작한다.
// - 화면 문법은 404, 오류 화면과 같다(StandaloneFrame + 상태 메시지 + 버튼 줄, T2.18).
import type { Metadata } from "next";
import { ActionRow } from "@/components/states/action-row";
import { WifiOffIcon } from "@/components/states/wifi-off-icon";
import { StandaloneFrame } from "@/components/states/screens";
import {
  StateGlyphView,
  StateMessageView,
} from "@/components/states/state-view";
import { buttonClass } from "@/components/ui/button-classes";
import { offlineCopy } from "@/copy/offline";
import { isEnabled } from "@/lib/flags";
import { offlineReloadScript } from "@/lib/sw/offline-script";

const copy = offlineCopy.page;

export const metadata: Metadata = {
  title: copy.metaTitle,
  robots: { index: false, follow: false },
};

export default function OfflinePage() {
  const fallback = isEnabled("appShell") ? "/today" : "/";
  return (
    <StandaloneFrame>
      <div data-slot="offline-screen" className="flex flex-1 flex-col">
        <StateMessageView
          kind="offline"
          headingLevel="h1"
          live="status"
          title={copy.title}
          body={copy.body}
          visual={<StateGlyphView icon={WifiOffIcon} />}
        />
        <ActionRow>
          <button
            type="button"
            data-lm-offline-retry=""
            className={buttonClass("primary")}
          >
            {copy.retry}
          </button>
        </ActionRow>
      </div>
      {/* 사용자 입력 없는 고정 문자열 */}
      <script
        dangerouslySetInnerHTML={{ __html: offlineReloadScript(fallback) }}
      />
    </StandaloneFrame>
  );
}
