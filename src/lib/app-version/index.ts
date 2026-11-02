// 앱 버전 (T9.4 베타 의견). package.json version을 next.config.ts가 빌드 때 LM_APP_VERSION으로 넣는다(서버, 브라우저 공용).
// 테스트처럼 값이 없으면 "0.0.0".
export const APP_VERSION: string = process.env.LM_APP_VERSION || "0.0.0";
