// T4.5 RLS 테스트: profiles, public_profiles, offices, preferences, avoid_rules
// 마이그레이션: supabase/migrations/20261030120000_t4_4_profiles_offices_preferences_avoid_rules.sql
//
// 실행: pnpm test:rls (RUN_RLS_TESTS=1). 평소 pnpm test에서는 건너뛴다.
// 다음 중 하나라도 없으면 자동으로 건너뛴다(실패 아님)
//   1) RUN_RLS_TESTS=1  2) .env.local의 Supabase URL, publishable 키, secret 키
//   3) 클라우드 개발 DB에 이 마이그레이션이 적용됨(db:push 전에는 PGRST205)
//
// 역할 3가지 (CLAUDE.md 10장)
//   본인  = 사용자 A 세션, 타인 = 사용자 B 세션(A의 행을 노림), 비로그인 = 세션 없이 publishable 키만
// 단언은 전부 publishable 키 + 세션으로 한다. secret 키는 테스트 사용자 생성, 삭제, 탈퇴 후 잔여 행 세기에만 쓴다.
// 테스트 사용자는 닉네임, 이메일이 test_로 시작하고 afterAll에서 지운다. 중간에 끊겼다면 pnpm test:rls:cleanup.
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import {
  adminCount,
  createTestUser,
  deleteAuthUser,
  loadRlsEnv,
  rest,
  schemaReady,
  type RlsEnv,
  type TestUser,
} from "./harness";

const env = loadRlsEnv();
const ready = env !== null && (await schemaReady(env, "profiles"));

const PERMISSION_DENIED = "42501";
const CHECK_VIOLATION = "23514";

type ProfileRow = {
  user_id: string;
  nickname: string | null;
  role: string;
  status: string;
  terms_agreed_at: string | null;
};
type OfficeRow = {
  id: string;
  user_id: string;
  name: string;
  is_default: boolean;
};
type PreferencesRow = {
  user_id: string;
  lunch_budget: number;
  dinner_budget: number;
  walk_minutes: number;
  craving_categories: string[];
  craving_until: string | null;
};
type AvoidRow = { id: string; user_id: string; kind: string; value: string };

describe.skipIf(!ready)(
  "T4.5 계정 테이블 RLS (본인, 타인, 비로그인)",
  { timeout: 30_000 },
  () => {
    // skipIf가 false일 때만 본문이 실행되므로 env는 여기서 항상 있다
    const e = env as RlsEnv;
    const runId = Date.now().toString(36).slice(-6);
    let a: TestUser;
    let b: TestUser;
    const created: string[] = [];

    beforeAll(async () => {
      a = await createTestUser(e, runId, "a");
      created.push(a.id);
      b = await createTestUser(e, runId, "b");
      created.push(b.id);
    }, 60_000);

    afterAll(async () => {
      await Promise.all(created.map((id) => deleteAuthUser(e, id)));
    }, 60_000);

    describe("profiles", () => {
      it("가입 트리거가 프로필을 만들고 본인은 자기 행만 읽는다", async () => {
        const r = await rest<ProfileRow[]>(e, "profiles?select=*", {
          token: a.token,
        });
        expect(r.error).toBeNull();
        expect(r.data).toHaveLength(1);
        expect(r.data?.[0]).toMatchObject({
          user_id: a.id,
          nickname: a.nickname,
          role: "user",
          status: "active",
        });
      });

      it("타인은 A의 프로필을 user_id로 지정해도 읽지 못한다", async () => {
        const r = await rest<ProfileRow[]>(
          e,
          `profiles?select=*&user_id=eq.${a.id}`,
          {
            token: b.token,
          },
        );
        expect(r.data).toEqual([]);
      });

      it("비로그인은 profiles 권한이 없다", async () => {
        const r = await rest(e, "profiles?select=*");
        expect(r.error?.code).toBe(PERMISSION_DENIED);
      });

      it("본인은 닉네임을 바꿀 수 있다", async () => {
        const r = await rest<ProfileRow[]>(e, `profiles?user_id=eq.${a.id}`, {
          method: "PATCH",
          token: a.token,
          body: { nickname: `${a.nickname.slice(0, 17)}_x` },
        });
        expect(r.error).toBeNull();
        expect(r.data).toHaveLength(1);
      });

      it("본인도 role, status, provider는 바꿀 수 없다", async () => {
        for (const body of [
          { role: "admin" },
          { status: "active" },
          { provider: "google" },
        ]) {
          const r = await rest(e, `profiles?user_id=eq.${a.id}`, {
            method: "PATCH",
            token: a.token,
            body,
          });
          expect(r.error?.code).toBe(PERMISSION_DENIED);
        }
      });

      it("약관 동의 시각은 서버 시각으로 기록되고 되돌릴 수 없다", async () => {
        const set = await rest<ProfileRow[]>(e, `profiles?user_id=eq.${a.id}`, {
          method: "PATCH",
          token: a.token,
          body: { terms_agreed_at: "2000-01-01T00:00:00Z" },
        });
        const agreedAt = set.data?.[0]?.terms_agreed_at;
        expect(agreedAt).toBeTruthy();
        expect(
          Date.now() - new Date(agreedAt as string).getTime(),
        ).toBeLessThan(5 * 60_000);

        const undo = await rest<ProfileRow[]>(
          e,
          `profiles?user_id=eq.${a.id}`,
          {
            method: "PATCH",
            token: a.token,
            body: { terms_agreed_at: null },
          },
        );
        expect(undo.data?.[0]?.terms_agreed_at).toBe(agreedAt);
      });

      it("타인은 A의 닉네임을 바꾸지 못한다(0행)", async () => {
        const r = await rest(e, `profiles?user_id=eq.${a.id}`, {
          method: "PATCH",
          token: b.token,
          body: { nickname: "test_hijack" },
        });
        expect(r.data).toEqual([]);
      });

      it("본인도 프로필 행을 직접 만들거나 지우지 못한다", async () => {
        const ins = await rest(e, "profiles", {
          method: "POST",
          token: a.token,
          body: { user_id: a.id },
        });
        expect(ins.error?.code).toBe(PERMISSION_DENIED);
        const del = await rest(e, `profiles?user_id=eq.${a.id}`, {
          method: "DELETE",
          token: a.token,
        });
        expect(del.error?.code).toBe(PERMISSION_DENIED);
      });

      it("허용되지 않은 아바타 주소는 거부한다", async () => {
        const r = await rest(e, `profiles?user_id=eq.${a.id}`, {
          method: "PATCH",
          token: a.token,
          body: { avatar_url: "https://tracker.example.com/p.png" },
        });
        expect(r.error?.code).toBe(CHECK_VIOLATION);
      });
    });

    describe("public_profiles", () => {
      it("로그인 사용자는 타인의 user_id, 닉네임, 아바타만 본다", async () => {
        const r = await rest<Record<string, unknown>[]>(
          e,
          `public_profiles?select=*&user_id=eq.${a.id}`,
          { token: b.token },
        );
        expect(r.error).toBeNull();
        expect(r.data).toHaveLength(1);
        expect(Object.keys(r.data?.[0] ?? {}).sort()).toEqual([
          "avatar_url",
          "nickname",
          "user_id",
        ]);
      });

      it("비로그인은 공개 프로필 뷰를 읽지 못한다", async () => {
        const r = await rest(e, "public_profiles?select=*");
        expect(r.error?.code).toBe(PERMISSION_DENIED);
      });
    });

    describe("offices", () => {
      let officeA: OfficeRow;

      it("본인은 핀을 저장하고 첫 사무실은 자동으로 기본이 된다", async () => {
        const r = await rest<OfficeRow[]>(e, "offices", {
          method: "POST",
          token: a.token,
          body: { name: "본사", lat: 37.5665, lng: 126.978 },
        });
        expect(r.error).toBeNull();
        officeA = r.data?.[0] as OfficeRow;
        expect(officeA).toMatchObject({ user_id: a.id, is_default: true });
      });

      it("새 사무실을 기본으로 넣으면 이전 기본이 해제된다(기본은 1곳)", async () => {
        const r = await rest<OfficeRow[]>(e, "offices", {
          method: "POST",
          token: a.token,
          body: { name: "지점", lat: 37.5, lng: 127.03, is_default: true },
        });
        expect(r.error).toBeNull();
        const all = await rest<OfficeRow[]>(
          e,
          "offices?select=*&is_default=eq.true",
          {
            token: a.token,
          },
        );
        expect(all.data?.map((o) => o.name)).toEqual(["지점"]);
      });

      it("1인 최대 5곳", async () => {
        for (const name of ["셋", "넷", "다섯"]) {
          const r = await rest(e, "offices", {
            method: "POST",
            token: a.token,
            body: { name, lat: 37.5, lng: 127.0 },
          });
          expect(r.error).toBeNull();
        }
        const sixth = await rest(e, "offices", {
          method: "POST",
          token: a.token,
          body: { name: "여섯", lat: 37.5, lng: 127.0 },
        });
        expect(sixth.error?.code).toBe(CHECK_VIOLATION);
        expect(sixth.error?.message).toContain("offices_limit_exceeded");
      });

      it("타인은 A의 사무실을 읽기, 수정, 삭제하지 못한다", async () => {
        const read = await rest(e, `offices?select=*&user_id=eq.${a.id}`, {
          token: b.token,
        });
        expect(read.data).toEqual([]);
        const upd = await rest(e, `offices?id=eq.${officeA.id}`, {
          method: "PATCH",
          token: b.token,
          body: { name: "탈취" },
        });
        expect(upd.data).toEqual([]);
        const del = await rest(e, `offices?id=eq.${officeA.id}`, {
          method: "DELETE",
          token: b.token,
        });
        expect(del.data).toEqual([]);
        const still = await rest<OfficeRow[]>(
          e,
          `offices?select=name&id=eq.${officeA.id}`,
          {
            token: a.token,
          },
        );
        expect(still.data?.[0]?.name).toBe("본사");
      });

      it("타인은 A 명의로 사무실을 만들지 못한다", async () => {
        const r = await rest(e, "offices", {
          method: "POST",
          token: b.token,
          body: { user_id: a.id, name: "위장", lat: 37.5, lng: 127.0 },
        });
        expect(r.error?.code).toBe(PERMISSION_DENIED);
      });

      it("비로그인은 사무실을 읽거나 만들지 못한다", async () => {
        expect((await rest(e, "offices?select=*")).error?.code).toBe(
          PERMISSION_DENIED,
        );
        const ins = await rest(e, "offices", {
          method: "POST",
          body: { name: "익명", lat: 37.5, lng: 127.0 },
        });
        expect(ins.error?.code).toBe(PERMISSION_DENIED);
      });

      it("본인은 자기 사무실을 지울 수 있다", async () => {
        const r = await rest(e, `offices?id=eq.${officeA.id}`, {
          method: "DELETE",
          token: a.token,
        });
        expect(r.error).toBeNull();
        expect(r.data).toHaveLength(1);
      });
    });

    describe("preferences", () => {
      it("가입 시 기본값 행이 있고 본인만 읽는다", async () => {
        const r = await rest<PreferencesRow[]>(e, "preferences?select=*", {
          token: a.token,
        });
        expect(r.data).toHaveLength(1);
        expect(r.data?.[0]).toMatchObject({
          user_id: a.id,
          lunch_budget: 10000,
          dinner_budget: 20000,
          walk_minutes: 10,
          craving_categories: [],
          craving_until: null,
        });
      });

      it("땡기는 카테고리를 고르면 서버가 7일 만료를 정한다", async () => {
        const r = await rest<PreferencesRow[]>(
          e,
          `preferences?user_id=eq.${a.id}`,
          {
            method: "PATCH",
            token: a.token,
            body: { craving_categories: ["gukbap", "ilsik"] },
          },
        );
        const until = new Date(r.data?.[0]?.craving_until as string).getTime();
        const days = (until - Date.now()) / 86_400_000;
        expect(days).toBeGreaterThan(6.9);
        expect(days).toBeLessThan(7.1);
      });

      it("범위 밖 예산과 도보 분, 만료 시각 직접 수정은 거부한다", async () => {
        const bad = await rest(e, `preferences?user_id=eq.${a.id}`, {
          method: "PATCH",
          token: a.token,
          body: { walk_minutes: 7 },
        });
        expect(bad.error?.code).toBe(CHECK_VIOLATION);
        const until = await rest(e, `preferences?user_id=eq.${a.id}`, {
          method: "PATCH",
          token: a.token,
          body: { craving_until: "2099-01-01T00:00:00Z" },
        });
        expect(until.error?.code).toBe(PERMISSION_DENIED);
      });

      it("타인은 A의 설정을 읽거나 바꾸지 못한다", async () => {
        const read = await rest(e, `preferences?select=*&user_id=eq.${a.id}`, {
          token: b.token,
        });
        expect(read.data).toEqual([]);
        const upd = await rest(e, `preferences?user_id=eq.${a.id}`, {
          method: "PATCH",
          token: b.token,
          body: { walk_minutes: 20 },
        });
        expect(upd.data).toEqual([]);
      });

      it("비로그인은 설정을 읽지 못한다", async () => {
        expect((await rest(e, "preferences?select=*")).error?.code).toBe(
          PERMISSION_DENIED,
        );
      });
    });

    describe("avoid_rules", () => {
      it("본인은 칩과 직접 입력을 저장하고 읽는다", async () => {
        const r = await rest<AvoidRow[]>(e, "avoid_rules", {
          method: "POST",
          token: a.token,
          body: [
            { kind: "food", value: "회" },
            { kind: "allergy", value: "땅콩" },
            { kind: "custom", value: "고수" },
          ],
        });
        expect(r.error).toBeNull();
        const mine = await rest<AvoidRow[]>(e, "avoid_rules?select=*", {
          token: a.token,
        });
        expect(mine.data).toHaveLength(3);
      });

      it("타인은 A의 기피 음식을 user_id로 지정해도 읽지 못한다", async () => {
        const r = await rest(e, `avoid_rules?select=*&user_id=eq.${a.id}`, {
          token: b.token,
        });
        expect(r.data).toEqual([]);
      });

      it("타인은 A의 기피 음식을 지우거나 A 명의로 넣지 못한다", async () => {
        const del = await rest(e, `avoid_rules?user_id=eq.${a.id}`, {
          method: "DELETE",
          token: b.token,
        });
        expect(del.data).toEqual([]);
        const ins = await rest(e, "avoid_rules", {
          method: "POST",
          token: b.token,
          body: { user_id: a.id, kind: "food", value: "양고기" },
        });
        expect(ins.error?.code).toBe(PERMISSION_DENIED);
      });

      it("비로그인은 기피 음식을 읽지 못한다", async () => {
        expect((await rest(e, "avoid_rules?select=*")).error?.code).toBe(
          PERMISSION_DENIED,
        );
      });
    });

    describe("탈퇴 cascade (AUTH-05, AC-AUTH-3 준비)", () => {
      it("auth 사용자를 지우면 네 테이블의 행이 모두 사라진다", async () => {
        const c = await createTestUser(e, runId, "c");
        created.push(c.id);
        await rest(e, "offices", {
          method: "POST",
          token: c.token,
          body: { name: "본사", lat: 37.5, lng: 127.0 },
        });
        await rest(e, "avoid_rules", {
          method: "POST",
          token: c.token,
          body: { kind: "food", value: "회" },
        });
        await deleteAuthUser(e, c.id);
        for (const table of [
          "profiles",
          "offices",
          "preferences",
          "avoid_rules",
        ]) {
          expect(await adminCount(e, table, c.id)).toBe(0);
        }
      });
    });
  },
);
