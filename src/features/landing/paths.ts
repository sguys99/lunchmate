// 랜딩이 가리키는 경로 (T4.28). 화면과 테스트가 함께 쓴다.

/** 로그인 시작 폼이 POST하는 곳(/login과 같음) */
export const SIGN_IN_ACTION = "/auth/sign-in";
/** 추천 체험: 비로그인 둘러보기 오늘 탭 (AUTH-07, PRD 4.1) */
export const TRY_HREF = "/today";
/** 로그인 뒤 돌아올 곳. 콜백이 약관 동의, 온보딩을 먼저 거치게 한다 */
export const LANDING_NEXT = "/today";
/** 모바일 머리 "로그인" 바로가기의 도착점 */
export const LANDING_LOGIN_ANCHOR = "landing-login";
