// 온보딩 저장 검증과 흐름 (T4.16~T4.21, ONB-01~05). 서버 액션(app/welcome/onboarding/actions.ts)이 쓴다.
// Supabase는 주입받아 테스트한다. 브라우저에서 import하지 않는다(zod를 홈 번들 밖에 둔다).
//
// 규칙
// - 입력은 strictObject로 다시 검사한다. 알 수 없는 키(주소, 장소명, 검색 좌표 같은 값)가 섞이면 저장하지 않는다(AC-ONB-3).
// - 사무실 좌표는 클라이언트가 핀에서만 만든 값(OfficeSaveInput)이다. 서버는 대한민국 범위만 다시 본다(DB 제약과 같음).
// - 저장 순서: 예산과 도보 분 → 못 먹는 음식(지우고 다시 넣기) → 사무실. 사무실이 생겨야 온보딩을 마친 것으로 본다
//   (약관 뒤, 로그인 콜백의 온보딩 연결 고리). 중간에 실패해도 다시 누르면 같은 결과가 된다(멱등).
// - 이미 사무실이 있으면(두 번 누름) 새로 만들지 않는다.
// - 갈 곳은 sanitizeNext로 다시 검사하고 둘러보기 이어받기 키를 지운다(T4.20).
import * as z from "zod";
import { sanitizeNext } from "@/features/auth/redirect";
import {
  ALLERGY_CHIPS,
  CUSTOM_AVOID_MAX_ITEMS,
  CUSTOM_AVOID_MAX_LENGTH,
  DEFAULT_OFFICE_NAME,
  FOOD_CHIPS,
  PREF_RANGES,
  WALK_OPTIONS,
} from "./constants";
import { stripGuestHandoff } from "./guest-handoff";

const stepped = (r: { min: number; max: number; step: number }) =>
  z
    .number()
    .int()
    .min(r.min)
    .max(r.max)
    .refine((v) => (v - r.min) % r.step === 0);

const unique = <T>(arr: T[]) => new Set(arr).size === arr.length;

export const finishOnboardingSchema = z.strictObject({
  office: z.strictObject({
    // DB offices_lat_range, offices_lng_range와 같은 범위
    lat: z.number().finite().min(33.0).max(38.7),
    lng: z.number().finite().min(124.5).max(132.0),
  }),
  prefs: z.strictObject({
    lunch: stepped(PREF_RANGES.lunch),
    dinner: stepped(PREF_RANGES.dinner),
    walk: z
      .number()
      .int()
      .refine((v) => (WALK_OPTIONS as readonly number[]).includes(v)),
  }),
  avoid: z.strictObject({
    foods: z.array(z.enum(FOOD_CHIPS)).max(FOOD_CHIPS.length).refine(unique),
    allergies: z
      .array(z.enum(ALLERGY_CHIPS))
      .max(ALLERGY_CHIPS.length)
      .refine(unique),
    custom: z
      .array(z.string().trim().min(1).max(CUSTOM_AVOID_MAX_LENGTH))
      .max(CUSTOM_AVOID_MAX_ITEMS)
      .refine(unique),
  }),
  next: z.string().max(2048),
});

export type FinishOnboardingInput = z.infer<typeof finishOnboardingSchema>;

export type AvoidRow = { kind: "food" | "allergy" | "custom"; value: string };

export type FinishOnboardingDeps = {
  currentUserId: () => Promise<string | null>;
  hasOffice: (userId: string) => Promise<boolean>;
  updatePrefs: (
    userId: string,
    prefs: FinishOnboardingInput["prefs"],
  ) => Promise<boolean>;
  /** 본인 규칙을 모두 지우고 rows를 넣는다 */
  replaceAvoid: (userId: string, rows: AvoidRow[]) => Promise<boolean>;
  insertOffice: (
    userId: string,
    office: { name: string; lat: number; lng: number },
  ) => Promise<boolean>;
};

export type FinishOnboardingResult =
  | { ok: true; location: string }
  | { ok: false; error: "invalid" | "unauthenticated" | "save" };

export function avoidRows(avoid: FinishOnboardingInput["avoid"]): AvoidRow[] {
  return [
    ...avoid.foods.map((value) => ({ kind: "food" as const, value })),
    ...avoid.allergies.map((value) => ({ kind: "allergy" as const, value })),
    ...avoid.custom.map((value) => ({ kind: "custom" as const, value })),
  ];
}

export async function finishOnboarding(
  raw: unknown,
  deps: FinishOnboardingDeps,
): Promise<FinishOnboardingResult> {
  const parsed = finishOnboardingSchema.safeParse(raw);
  if (!parsed.success) return { ok: false, error: "invalid" };
  const input = parsed.data;

  const userId = await deps.currentUserId().catch(() => null);
  if (!userId) return { ok: false, error: "unauthenticated" };

  const prefsOk = await deps
    .updatePrefs(userId, input.prefs)
    .catch(() => false);
  if (!prefsOk) return { ok: false, error: "save" };

  const avoidOk = await deps
    .replaceAvoid(userId, avoidRows(input.avoid))
    .catch(() => false);
  if (!avoidOk) return { ok: false, error: "save" };

  const already = await deps.hasOffice(userId).catch(() => false);
  if (!already) {
    const officeOk = await deps
      .insertOffice(userId, {
        name: DEFAULT_OFFICE_NAME,
        lat: input.office.lat,
        lng: input.office.lng,
      })
      .catch(() => false);
    if (!officeOk) return { ok: false, error: "save" };
  }

  return { ok: true, location: stripGuestHandoff(sanitizeNext(input.next)) };
}
