// 서버 데이터 캐시 공용 모듈 (T2.19). 세션 메모리 캐시만, persist 금지 (CLAUDE.md 7장).
export { getQueryClient, makeQueryClient, QUERY_DEFAULTS } from "./client";
export { QueryProvider } from "./provider";
