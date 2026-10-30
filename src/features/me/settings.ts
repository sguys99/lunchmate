// 나 탭 설정 저장 검증과 흐름 (T4.23~T4.27, SET-01~05). 서버 액션(app/(app)/me/actions.ts)이 쓴다.
// Supabase는 주입받아 테스트한다(settings.test.ts). 브라우저에서 import하지 않는다(zod를 화면 번들 밖에 둔다).
//
// 규칙
// - 입력은 strictObject로 다시 검사한다. 알 수 없는 키(주소, 장소명, 검색 좌표 같은 값)가 섞이면 저장하지 않는다(AC-ONB-3).
// - 범위와 칩 목록은 온보딩 검증(finishOnboardingSchema)과 DB 제약을 그대로 쓴다.
// - 사무실 좌표는 핀 좌표(OfficeSaveInput)만 받는다. 서버는 대한민국 범위만 다시 본다.
// - 기본 사무실을 지우면 남은 곳 중 가장 먼저 저장한 곳을 기본으로 지정한다(offices.ts 결정 주석).
// - 못 먹는 음식은 바뀐 것만 넣고 뺀다. 넣기를 먼저 해서 중간에 실패해도 규칙이 줄어들지 않는다(알레르기 안전 쪽).
// - "요즘 이게 땡겨요"는 저장할 때마다 7일을 새로 센다. 같은 집합이면 DB 트리거가 시각을 다시 잡지 않으므로
//   한 번 비웠다가 다시 넣는다(새 마이그레이션 없이).
import * as z from "zod";
import {
  avoidRows,
  finishOnboardingSchema,
  type AvoidRow,
} from "@/features/onboarding/submit";
import { CATEGORY_SLUGS } from "@/features/place/categories";
import { MAX_CRAVINGS, sameCravings } from "./craving";
import {
  canAddOffice,
  canDeleteOffice,
  pickFallbackDefault,
  type OfficeSummary,
} from "./offices";
import type {
  CravingResult,
  DeleteOfficeResult,
  SettingsResult,
} from "./requests";

/** 이름: 앞뒤 공백 제거 후 1~20자, 제어 문자 없음(DB profiles_nickname_len, offices_name_len과 같은 길이) */
const shortName = z
  .string()
  .trim()
  .min(1)
  .max(20)
  .refine((v) => !/\p{Cc}/u.test(v));

const id = z.uuid();

const unique = <T>(arr: T[]) => new Set(arr).size === arr.length;

export const nicknameSchema = z.strictObject({ nickname: shortName });
export const addOfficeSchema = z.strictObject({
  name: shortName,
  office: finishOnboardingSchema.shape.office,
});
export const renameOfficeSchema = z.strictObject({ id, name: shortName });
export const officeIdSchema = z.strictObject({ id });
export const prefsSchema = finishOnboardingSchema.shape.prefs;
export const avoidSchema = finishOnboardingSchema.shape.avoid;
export const cravingSchema = z.strictObject({
  categories: z.array(z.enum(CATEGORY_SLUGS)).max(MAX_CRAVINGS).refine(unique),
});

export type StoredAvoid = AvoidRow & { id: string };
export type InsertOfficeOutcome = "ok" | "limit" | "error";

export type SettingsDeps = {
  currentUserId: () => Promise<string | null>;
  updateNickname: (userId: string, nickname: string) => Promise<boolean>;
  listOffices: (userId: string) => Promise<OfficeSummary[]>;
  insertOffice: (
    userId: string,
    office: { name: string; lat: number; lng: number },
  ) => Promise<InsertOfficeOutcome>;
  renameOffice: (userId: string, id: string, name: string) => Promise<boolean>;
  setDefaultOffice: (userId: string, id: string) => Promise<boolean>;
  deleteOffice: (userId: string, id: string) => Promise<boolean>;
  updatePrefs: (
    userId: string,
    prefs: z.infer<typeof prefsSchema>,
  ) => Promise<boolean>;
  listAvoid: (userId: string) => Promise<StoredAvoid[]>;
  insertAvoid: (userId: string, rows: AvoidRow[]) => Promise<boolean>;
  deleteAvoid: (userId: string, ids: string[]) => Promise<boolean>;
  readCravings: (userId: string) => Promise<string[]>;
  /** 저장 뒤 DB가 정한 만료 시각을 돌려준다. 실패면 undefined */
  updateCravings: (
    userId: string,
    categories: string[],
  ) => Promise<{ until: string | null } | undefined>;
};

type Fail = { ok: false; error: "invalid" | "unauthenticated" };

/** 검사 → 로그인 확인. 실패하면 결과, 성공하면 [값, 사용자] */
async function prepare<S extends z.ZodType>(
  schema: S,
  raw: unknown,
  deps: Pick<SettingsDeps, "currentUserId">,
): Promise<Fail | { ok: true; input: z.infer<S>; userId: string }> {
  const parsed = schema.safeParse(raw);
  if (!parsed.success) return { ok: false, error: "invalid" };
  const userId = await deps.currentUserId().catch(() => null);
  if (!userId) return { ok: false, error: "unauthenticated" };
  return { ok: true, input: parsed.data, userId };
}

const safe = <T>(p: Promise<T>, fallback: T) => p.catch(() => fallback);

export async function saveNickname(
  raw: unknown,
  deps: Pick<SettingsDeps, "currentUserId" | "updateNickname">,
): Promise<SettingsResult<{ nickname: string }>> {
  const p = await prepare(nicknameSchema, raw, deps);
  if (!p.ok) return p;
  const ok = await safe(deps.updateNickname(p.userId, p.input.nickname), false);
  return ok
    ? { ok: true, nickname: p.input.nickname }
    : { ok: false, error: "save" };
}

export async function addOffice(
  raw: unknown,
  deps: Pick<SettingsDeps, "currentUserId" | "listOffices" | "insertOffice">,
): Promise<SettingsResult> {
  const p = await prepare(addOfficeSchema, raw, deps);
  if (!p.ok) return p;
  const list = await safe(deps.listOffices(p.userId), null);
  if (!list) return { ok: false, error: "save" };
  if (!canAddOffice(list.length)) return { ok: false, error: "limit" };
  const outcome = await safe(
    deps.insertOffice(p.userId, {
      name: p.input.name,
      lat: p.input.office.lat,
      lng: p.input.office.lng,
    }),
    "error" as const,
  );
  if (outcome === "ok") return { ok: true };
  return { ok: false, error: outcome === "limit" ? "limit" : "save" };
}

export async function renameOffice(
  raw: unknown,
  deps: Pick<SettingsDeps, "currentUserId" | "renameOffice">,
): Promise<SettingsResult> {
  const p = await prepare(renameOfficeSchema, raw, deps);
  if (!p.ok) return p;
  const ok = await safe(
    deps.renameOffice(p.userId, p.input.id, p.input.name),
    false,
  );
  return ok ? { ok: true } : { ok: false, error: "save" };
}

export async function setDefaultOffice(
  raw: unknown,
  deps: Pick<SettingsDeps, "currentUserId" | "setDefaultOffice">,
): Promise<SettingsResult> {
  const p = await prepare(officeIdSchema, raw, deps);
  if (!p.ok) return p;
  const ok = await safe(deps.setDefaultOffice(p.userId, p.input.id), false);
  return ok ? { ok: true } : { ok: false, error: "save" };
}

export async function deleteOffice(
  raw: unknown,
  deps: Pick<
    SettingsDeps,
    "currentUserId" | "listOffices" | "deleteOffice" | "setDefaultOffice"
  >,
): Promise<DeleteOfficeResult> {
  const p = await prepare(officeIdSchema, raw, deps);
  if (!p.ok) return p;
  const list = await safe(deps.listOffices(p.userId), null);
  if (!list) return { ok: false, error: "save" };
  const target = list.find((o) => o.id === p.input.id);
  // 이미 없는 곳(다른 기기에서 지움)은 지운 것으로 본다
  if (!target) return { ok: true, promoted: null };
  if (!canDeleteOffice(list.length)) return { ok: false, error: "last-office" };

  const deleted = await safe(deps.deleteOffice(p.userId, target.id), false);
  if (!deleted) return { ok: false, error: "save" };

  // 기본이 아니었고 다른 기본이 남아 있으면 끝
  const remainingDefault = list.some((o) => o.id !== target.id && o.is_default);
  if (remainingDefault) return { ok: true, promoted: null };

  const fallback = pickFallbackDefault(list, target.id);
  if (!fallback) return { ok: true, promoted: null };
  const promoted = await safe(
    deps.setDefaultOffice(p.userId, fallback.id),
    false,
  );
  // 지정에 실패해도 읽는 쪽이 resolveDefaultOffice로 같은 곳을 쓴다
  return { ok: true, promoted: promoted ? fallback.name : null };
}

export async function savePrefs(
  raw: unknown,
  deps: Pick<SettingsDeps, "currentUserId" | "updatePrefs">,
): Promise<SettingsResult> {
  const p = await prepare(prefsSchema, raw, deps);
  if (!p.ok) return p;
  const ok = await safe(deps.updatePrefs(p.userId, p.input), false);
  return ok ? { ok: true } : { ok: false, error: "save" };
}

const avoidKey = (r: AvoidRow) => `${r.kind}\u0000${r.value}`;

/** 지금 규칙과 원하는 규칙의 차이: 넣을 것, 뺄 것(id) */
export function diffAvoid(
  current: readonly StoredAvoid[],
  wanted: readonly AvoidRow[],
): { insert: AvoidRow[]; remove: string[] } {
  const wantedKeys = new Set(wanted.map(avoidKey));
  const currentKeys = new Set(current.map(avoidKey));
  return {
    insert: wanted.filter((r) => !currentKeys.has(avoidKey(r))),
    remove: current
      .filter((r) => !wantedKeys.has(avoidKey(r)))
      .map((r) => r.id),
  };
}

export async function saveAvoid(
  raw: unknown,
  deps: Pick<
    SettingsDeps,
    "currentUserId" | "listAvoid" | "insertAvoid" | "deleteAvoid"
  >,
): Promise<SettingsResult> {
  const p = await prepare(avoidSchema, raw, deps);
  if (!p.ok) return p;
  const current = await safe(deps.listAvoid(p.userId), null);
  if (!current) return { ok: false, error: "save" };
  const { insert, remove } = diffAvoid(current, avoidRows(p.input));
  if (insert.length > 0) {
    const ok = await safe(deps.insertAvoid(p.userId, insert), false);
    if (!ok) return { ok: false, error: "save" };
  }
  if (remove.length > 0) {
    const ok = await safe(deps.deleteAvoid(p.userId, remove), false);
    if (!ok) return { ok: false, error: "save" };
  }
  return { ok: true };
}

export async function saveCravings(
  raw: unknown,
  deps: Pick<SettingsDeps, "currentUserId" | "readCravings" | "updateCravings">,
): Promise<CravingResult> {
  const p = await prepare(cravingSchema, raw, deps);
  if (!p.ok) return p;
  const wanted = [...p.input.categories];
  if (wanted.length > 0) {
    const stored = await safe(deps.readCravings(p.userId), null);
    if (!stored) return { ok: false, error: "save" };
    // 같은 집합을 다시 저장하면 7일을 새로 센다: 비웠다가 다시 넣는다
    if (sameCravings(stored, wanted)) {
      const cleared = await safe(deps.updateCravings(p.userId, []), undefined);
      if (!cleared) return { ok: false, error: "save" };
    }
  }
  const saved = await safe(deps.updateCravings(p.userId, wanted), undefined);
  return saved
    ? { ok: true, until: saved.until }
    : { ok: false, error: "save" };
}
