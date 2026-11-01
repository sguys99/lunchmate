// 오프라인 문구 (T8.3, PRD APP-02). 홈과 랜딩 첫 로드 공용 문구(common.ts, home.ts)에 넣지 않고 따로 둔다(홈 JS 예산, CLAUDE.md 9장).
// 문체: 상태 안내는 습니다체(tasks.md 2.2절).
import { commonCopy } from "./common";

export const offlineCopy = {
  /**
   * 오프라인 기본 화면(/offline). 연결이 없을 때 서비스 워커가 미리 받아 둔 이 화면을 보여 준다.
   * 장소 이름과 추천 결과는 기기에 저장하지 않으므로(T0.16-3) 안내와 다시 시도만 있다.
   */
  page: {
    metaTitle: "오프라인",
    title: commonCopy.states.offline.title,
    body: "연결되면 바로 추천해 드립니다.",
    retry: commonCopy.actions.retry,
  },
  /** 탭이 열린 채 끊겼을 때 세션 메모리의 오늘 카드 위 한 줄 (APP-02 "연결 전 결과") */
  todayStale: "연결 전 결과입니다. 연결되면 자동으로 다시 불러옵니다.",
} as const;
