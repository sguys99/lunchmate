// 오늘(홈) 계산 묶음 (T5.17). 화면(today-screen)이 마운트 직후 동적으로 받는다(import("./engine")).
// 추천 엔진(src/lib/reco), 기피 키워드 표, 카카오 업종 변환, 카드 표시 값, 이유 문장은 카카오 응답이 와야 쓰이므로
// 첫 로드 번들에서 빼고 카카오 검색과 나란히 받는다(홈 JS 예산 200KB, CLAUDE.md 9장). 순수 함수만 다시 내보낸다.
export { toCandidates } from "./candidates";
export { toCards } from "./card-model";
export { drawDeck, shortageOf } from "./deck";
export { whyLines } from "./why";
