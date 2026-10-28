// TanStack Query 클라이언트 (T2.19). 서버 데이터와 세션 메모리 캐시를 맡는다(CLAUDE.md 2장).
//
// 저장 금지 (CLAUDE.md 7장, research-notes T0.16-3)
// - 캐시는 이 탭의 메모리에만 둔다. persist 플러그인(@tanstack/*persist*)과 localStorage, IndexedDB 저장은 쓰지 않는다.
//   카카오 장소 데이터가 기기에 남으면 안 되기 때문이다. query-client.test.ts가 의존성 목록으로 막는다.
//
// 기본값과 근거
// - gcTime 5분: 화면을 떠난(구독자 없는) 쿼리를 메모리에서 지우는 시간. 같은 탭 메모리 보존이
//   카카오 운영정책의 "사용자 환경 개선 목적" 캐시로 인정되는지 아직 모른다(T10.2 문의 전).
//   그래서 탭 왕복 정도만 버티게 짧게 잡는다. 답변이 오면 T10.2에서 다시 정한다.
// - staleTime 1분: 서버에서 미리 받은 값을 브라우저가 곧바로 다시 부르지 않게 하는 최소값(TanStack SSR 권장).
//   도메인 쿼리가 더 길거나 짧아야 하면 그 쿼리에서 덮어쓴다.
// - retry 1: 외부 API 실패 시 재시도 1회 (CLAUDE.md 9장, PRD 12장). 그다음은 화면의 오류 상태가 맡는다.
// - refetchOnReconnect true: OfflineState 문구 "연결되면 자동으로 다시 불러옵니다."의 약속을 지킨다.
// - refetchOnWindowFocus false: 카카오톡에 링크를 보내고 돌아왔는데 추천 카드가 바뀌면 결정이 흔들린다.
//   투표처럼 실시간이 필요한 화면은 Realtime 구독(T7)이 맡는다.
// - mutations.retry 0: 투표, 후기 같은 쓰기는 중복될 수 있어 자동 재시도하지 않는다.
import { environmentManager, QueryClient } from "@tanstack/react-query";

export const QUERY_DEFAULTS = {
  gcTime: 5 * 60 * 1000,
  staleTime: 60 * 1000,
  retry: 1,
  refetchOnReconnect: true,
  refetchOnWindowFocus: false,
} as const;

/** 새 QueryClient. 테스트와 서버 요청마다 쓴다. 화면에서는 getQueryClient()를 쓴다. */
export function makeQueryClient(): QueryClient {
  return new QueryClient({
    defaultOptions: {
      queries: { ...QUERY_DEFAULTS },
      mutations: { retry: 0 },
    },
  });
}

let browserQueryClient: QueryClient | undefined;

/**
 * 서버는 요청마다 새 클라이언트(사용자끼리 캐시가 섞이지 않게), 브라우저는 탭당 하나.
 * 브라우저 싱글턴은 첫 렌더가 suspend돼 Provider가 다시 만들어져도 캐시를 잃지 않게 한다(TanStack advanced-ssr 가이드).
 */
export function getQueryClient(): QueryClient {
  if (environmentManager.isServer()) return makeQueryClient();
  browserQueryClient ??= makeQueryClient();
  return browserQueryClient;
}
