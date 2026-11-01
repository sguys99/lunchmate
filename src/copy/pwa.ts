// 홈 화면 설치 유도 문구 (T8.2, PRD APP-01). 유도 청크(features/pwa/install-prompt.ts)만 읽는다.
// 홈 첫 로드 공용 문구(common.ts, home.ts)에 넣지 않는다(홈 JS 예산, CLAUDE.md 9장).
// 문체(tasks.md 2.2절, copy-guide 4.10): 제목은 제안이라 해요체 질문, 설명은 습니다체, 버튼은 명사.
import { commonCopy } from "./common";

export const pwaCopy = {
  install: {
    /** 3번째 방문부터 한 번 뜨는 토스트 제목 */
    title: "홈 화면에 두고 바로 열까요?",
    /** Chrome, Edge, 삼성 인터넷(beforeinstallprompt) */
    body: "설치하면 앱처럼 한 번에 열립니다.",
    action: "설치",
    /** iOS(Safari, iOS Chrome): 웹에서 설치 창을 띄울 수 없어 방법만 안내한다 */
    iosBody: "공유 버튼을 누른 뒤 홈 화면에 추가를 고르면 됩니다.",
    iosDismiss: commonCopy.actions.close,
  },
} as const;
