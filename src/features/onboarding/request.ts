// 온보딩 저장 요청과 응답 타입 (브라우저, 서버 공용. zod 없음).
// office는 OfficeSaveInput(핀에서만 만드는 브랜드 타입)이라 검색, 현위치 좌표를 넣으면 타입 오류다(AC-ONB-3).
import type { AvoidChoice, Prefs } from "./constants";
import type { OfficeSaveInput } from "./office-draft";

export type FinishOnboardingRequest = {
  office: OfficeSaveInput;
  prefs: Prefs;
  avoid: AvoidChoice;
  /** 마친 뒤 갈 곳(서버가 다시 검사) */
  next: string;
};

export type FinishOnboardingResponse =
  | { ok: true; location: string }
  | { ok: false; error: "invalid" | "unauthenticated" | "save" };
