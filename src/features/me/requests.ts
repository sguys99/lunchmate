// 나 탭 설정 저장 요청과 응답 타입 (T4.23~T4.27). 브라우저, 서버 공용이고 zod가 없다(검증은 settings.ts, 서버에서만).
// 사무실 추가의 office는 OfficeSaveInput(핀에서만 만드는 브랜드 타입)이라 검색, 현위치 좌표를 넣으면 타입 오류다(AC-ONB-3).
import type { AvoidChoice, Prefs } from "@/features/onboarding/constants";
import type { OfficeSaveInput } from "@/features/onboarding/office-draft";
import type { CategorySlug } from "@/features/place/categories";

export type SettingsError =
  | "invalid"
  | "unauthenticated"
  | "save"
  /** 사무실 5곳 초과 */
  | "limit"
  /** 마지막 사무실은 지울 수 없음 */
  | "last-office";

export type SettingsResult<T = object> =
  ({ ok: true } & T) | { ok: false; error: SettingsError };

export type AddOfficeRequest = { name: string; office: OfficeSaveInput };
export type RenameOfficeRequest = { id: string; name: string };
export type OfficeIdRequest = { id: string };
export type NicknameRequest = { nickname: string };
export type PrefsRequest = Prefs;
export type AvoidRequest = AvoidChoice;
export type CravingRequest = { categories: CategorySlug[] };

/** 기본을 지웠을 때 새로 기본이 된 곳 이름(없으면 null) */
export type DeleteOfficeResult = SettingsResult<{ promoted: string | null }>;
export type CravingResult = SettingsResult<{ until: string | null }>;
