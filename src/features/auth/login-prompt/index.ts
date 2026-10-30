// 로그인 유도 시트 진입점 (T4.13). 시트 본체(login-prompt-sheet.tsx)는 직접 import하지 않는다(지연 로딩이 깨진다).
export { LoginPromptSheet, useLoginPrompt } from "./use-login-prompt";
export { LOGIN_TRIGGERS, type LoginTrigger } from "./triggers";
