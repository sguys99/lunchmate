// T10.16f RLS/함수 테스트: 메뉴 줄 신고(menu_flags)와 관리자 메뉴 처리(숨김, 문제없음, 합치기, 따로 두기, 되돌리기).
// 마이그레이션: supabase/migrations/20261103210000_t10_16f_menu_moderation.sql (결정 D-37)
//
// 실행: pnpm test:rls (RUN_RLS_TESTS=1). 평소 pnpm test에서는 건너뛴다. 마이그레이션 적용 전(PGRST205)에도 건너뛴다.
//
// 역할 (CLAUDE.md 10장 + T8.5): 관리자 = role admin 테스트 사용자 세션, 본인 = 신고자 세션, 타인 = 다른 사용자 세션,
// 비로그인 = publishable 키만. 단언은 전부 publishable 키 + 세션으로 한다. secret 키는 사용자 생성, 삭제, 관리자 role 지정,
// 정지 상태 지정(준비 전용)에만 쓴다.
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import {
  adminPatch,
  adminRpc,
  createTestUser,
  deleteAuthUser,
  loadRlsEnv,
  newRunId,
  rest,
  rpc,
  schemaReady,
  type RlsEnv,
  type TestUser,
} from "./harness";

const env = loadRlsEnv();
const ready = env !== null && (await schemaReady(env, "menu_flags"));

const PERMISSION_DENIED = "42501";
const CHECK_VIOLATION = "23514";
const UNIQUE_VIOLATION = "23505";

type FlagRow = { user_id: string; place_id: string; menu_key: string; reason: string };
type MenuStat = { place_id: string; menu_key: string; menu_name: string; report_count: number; median_krw: number };
type Flagged = {
  place_id: string;
  menu_key: string;
  menu_name: string;
  report_count: number;
  auto_hidden: boolean;
  flags: Record<string, number>;
  flag_count: number;
  others: { key: string; name: string; count: number }[];
};
type Suggestion = { place_id: string; from_key: string; to_key: string; why: string };
type ResidueRow = { table_schema: string; table_name: string; on_delete: string; remaining: number };
type LogRow = { id: string; action: string; target_menu_key: string | null; target_place_id: string | null; undoable: boolean };

const base = 790_000_000 + Math.floor(Math.random() * 9_000_000);
const pid = (n: number) => String(base + n);
const url = (id: string) => `https://place.map.kakao.com/${id}`;

describe.skipIf(!ready)(
  "T10.16f 메뉴 신고와 관리자 메뉴 처리 (관리자, 본인, 타인, 비로그인)",
  { timeout: 180_000 },
  () => {
    const e = env as RlsEnv;
    const runId = newRunId();
    let admin: TestUser;
    let r1: TestUser; // 제보자 1 (제육볶음)
    let r2: TestUser; // 제보자 2 (제육볶음)
    let r3: TestUser; // 제보자 3 (제육, 차슈덮밥)
    let f1: TestUser; // 신고자
    let f2: TestUser;
    let f3: TestUser;
    let susp: TestUser; // 정지된 신고자
    const created: string[] = [];
    const place = pid(1);

    function report(user: TestUser, menu: string, price: number, placeId = place) {
      return rest(e, "menu_reports", {
        method: "POST",
        token: user.token,
        body: { user_id: user.id, place_id: placeId, place_url: url(placeId), menu_name: menu, price_krw: price, source: "detail" },
      });
    }
    function flag(user: TestUser | undefined, key: string, reason = "false", placeId = place) {
      return rest<FlagRow[]>(e, "menu_flags", {
        method: "POST",
        token: user?.token,
        body: { user_id: user?.id, place_id: placeId, menu_key: key, reason },
      });
    }
    async function menus(token?: string) {
      const r = await rpc<MenuStat[]>(e, "place_menus", { p_place_ids: [place] }, token);
      expect(r.error).toBeNull();
      return r.data ?? [];
    }
    async function flagged() {
      const r = await rpc<Flagged[]>(e, "admin_menu_flagged", {}, admin.token);
      expect(r.error).toBeNull();
      return (r.data ?? []).filter((x) => x.place_id === place);
    }
    async function suggestions() {
      const r = await rpc<Suggestion[]>(e, "admin_menu_suggestions", {}, admin.token);
      expect(r.error).toBeNull();
      return (r.data ?? []).filter((x) => x.place_id === place);
    }

    beforeAll(async () => {
      const users = await Promise.all(
        ["ad", "r1", "r2", "r3", "f1", "f2", "f3", "su"].map((k) => createTestUser(e, runId, k)),
      );
      [admin, r1, r2, r3, f1, f2, f3, susp] = users as [
        TestUser, TestUser, TestUser, TestUser, TestUser, TestUser, TestUser, TestUser,
      ];
      created.push(admin.id, r1.id, r2.id, r3.id, f1.id, f2.id, f3.id, susp.id);
      await adminPatch(e, "profiles", `user_id=eq.${admin.id}`, { role: "admin" });
      for (const r of [
        await report(r1, "제육볶음", 9000),
        await report(r2, "제육볶음", 9500),
        await report(r3, "제육", 9000),
        await report(r3, "차슈덮밥", 1000),
      ]) {
        expect(r.error).toBeNull();
      }
      await adminPatch(e, "profiles", `user_id=eq.${susp.id}`, { status: "suspended", suspended_reason: "other" });
    }, 180_000);

    afterAll(async () => {
      await Promise.all(created.map((id) => deleteAuthUser(e, id)));
    }, 60_000);

    describe("본인과 타인", () => {
      it("보이는 줄은 신고할 수 있고, 본인 신고만 읽힌다", async () => {
        const r = await flag(f1, "차슈덮밥");
        expect(r.error).toBeNull();
        const mine = await rest<FlagRow[]>(e, "menu_flags?select=user_id,menu_key", { token: f1.token });
        expect(mine.data).toEqual([{ user_id: f1.id, menu_key: "차슈덮밥" }]);
        const other = await rest<FlagRow[]>(e, "menu_flags?select=user_id", { token: f2.token });
        expect(other.error).toBeNull();
        expect(other.data).toEqual([]);
      });

      it("같은 줄 두 번은 안 된다(1인 1회)", async () => {
        expect((await flag(f1, "차슈덮밥")).error?.code).toBe(UNIQUE_VIOLATION);
      });

      it("내 제보뿐인 줄, 없는 줄은 신고할 수 없다", async () => {
        const own = await flag(r3, "차슈덮밥");
        expect(own.error?.code).toBe(CHECK_VIOLATION);
        expect(own.error?.message).toBe("report_own_target");
        const none = await flag(f1, "없는메뉴");
        expect(none.error?.code).toBe(CHECK_VIOLATION);
        expect(none.error?.message).toBe("report_target_unavailable");
      });

      it("사유는 4개만, 다른 사람 이름으로는 못 넣는다", async () => {
        expect((await flag(f2, "제육", "bad")).error?.code).toBe(CHECK_VIOLATION);
        const r = await rest(e, "menu_flags", {
          method: "POST",
          token: f2.token,
          body: { user_id: f1.id, place_id: place, menu_key: "제육", reason: "false" },
        });
        expect(r.error).not.toBeNull();
      });

      it("정지된 사용자는 신고할 수 없다", async () => {
        expect((await flag(susp, "제육")).error).not.toBeNull();
      });

      it("고칠 수도 지울 수도 없다", async () => {
        const p = await rest<FlagRow[]>(e, `menu_flags?user_id=eq.${f1.id}`, {
          method: "PATCH",
          token: f1.token,
          body: { reason: "spam" },
        });
        expect(p.error?.code ?? (p.data?.length === 0 ? "none" : "changed")).not.toBe("changed");
        const d = await rest<FlagRow[]>(e, `menu_flags?user_id=eq.${f1.id}`, { method: "DELETE", token: f1.token });
        expect(d.error?.code ?? (d.data?.length === 0 ? "none" : "deleted")).not.toBe("deleted");
      });

      it("서로 다른 3명이면 그 줄을 메뉴판에서 내리고, 숨긴 줄은 더 신고할 수 없다", async () => {
        expect((await flag(f2, "차슈덮밥")).error).toBeNull();
        expect((await menus()).map((m) => m.menu_key)).toContain("차슈덮밥");
        expect((await flag(f3, "차슈덮밥", "abuse")).error).toBeNull();
        expect((await menus()).map((m) => m.menu_key)).not.toContain("차슈덮밥");
        const after = await flag(r1, "차슈덮밥");
        expect(after.error?.message).toBe("report_target_unavailable");
      });
    });

    describe("탈퇴", () => {
      it("Auth 사용자를 지우면 메뉴 신고도 cascade로 지워진다", async () => {
        const gone = await createTestUser(e, runId, "fg");
        created.push(gone.id);
        expect((await flag(gone, "제육")).error).toBeNull();
        await deleteAuthUser(e, gone.id);
        const res = await adminRpc<ResidueRow[]>(e, "account_residue", { p_user_id: gone.id });
        expect(res.error).toBeNull();
        const t = res.data?.find((x) => x.table_schema === "public" && x.table_name === "menu_flags");
        expect(t?.on_delete).toBe("cascade");
        expect(Number(t?.remaining)).toBe(0);
      });
    });

    describe("비로그인", () => {
      it("신고를 읽지도 넣지도 못한다", async () => {
        const r = await rest(e, "menu_flags?select=id", {});
        expect(r.error?.code).toBe(PERMISSION_DENIED);
        expect((await flag(undefined, "제육")).error).not.toBeNull();
      });

      it("관리자 메뉴 함수를 부를 수 없다", async () => {
        for (const name of ["admin_menu_flagged", "admin_menu_suggestions"]) {
          expect((await rpc(e, name, {})).error).not.toBeNull();
        }
      });
    });

    describe("관리자", () => {
      it("일반 사용자는 관리자 메뉴 함수를 부를 수 없다(42501)", async () => {
        expect((await rpc(e, "admin_menu_flagged", {}, f1.token)).error?.code).toBe(PERMISSION_DENIED);
        expect(
          (await rpc(e, "admin_menu_decide", { p_place_id: place, p_menu_key: "제육", p_result: "hide" }, f1.token)).error?.code,
        ).toBe(PERMISSION_DENIED);
        expect(
          (await rpc(e, "admin_menu_merge", { p_place_id: place, p_from: "제육", p_to: "제육볶음" }, f1.token)).error?.code,
        ).toBe(PERMISSION_DENIED);
      });

      it("큐: 자동 숨김 줄, 사유별 수, 같은 식당 다른 메뉴. 제보자 정보는 없다", async () => {
        const q = await flagged();
        const row = q.find((x) => x.menu_key === "차슈덮밥");
        expect(row).toMatchObject({ auto_hidden: true, flag_count: 3, flags: { false: 2, abuse: 1 } });
        expect(row?.others.map((o) => o.key).sort()).toEqual(["제육", "제육볶음"]);
        expect(JSON.stringify(q)).not.toMatch(/user_id|nickname/);
      });

      it("합치기 제안: 제육을 제육볶음으로(포함)", async () => {
        expect(await suggestions()).toEqual([
          expect.objectContaining({ from_key: "제육", to_key: "제육볶음", why: "contains" }),
        ]);
      });

      it("문제없음은 자동 숨김을 되살리고 큐에서 뺀다. 되돌리면 다시 숨겨진다", async () => {
        const d = await rpc<string>(e, "admin_menu_decide", { p_place_id: place, p_menu_key: "차슈덮밥", p_result: "clear" }, admin.token);
        expect(d.error).toBeNull();
        expect((await menus()).map((m) => m.menu_key)).toContain("차슈덮밥");
        expect((await flagged()).map((x) => x.menu_key)).not.toContain("차슈덮밥");
        const u = await rpc(e, "admin_undo", { p_action_ids: [d.data] }, admin.token);
        expect(u.error).toBeNull();
        expect((await menus()).map((m) => m.menu_key)).not.toContain("차슈덮밥");
        // 다시 문제없음으로 두고 다음 단계로
        expect((await rpc(e, "admin_menu_decide", { p_place_id: place, p_menu_key: "차슈덮밥", p_result: "clear" }, admin.token)).error).toBeNull();
      });

      it("합치기: 집계가 한 줄로 모이고, 옛 이름 새 제보도 합쳐지며, 되돌리면 원래대로", async () => {
        const m = await rpc<string>(e, "admin_menu_merge", { p_place_id: place, p_from: "제육", p_to: "제육볶음" }, admin.token);
        expect(m.error).toBeNull();
        let list = await menus(f1.token);
        expect(list.find((x) => x.menu_key === "제육볶음")).toMatchObject({ menu_name: "제육볶음", report_count: 3 });
        expect(list.map((x) => x.menu_key)).not.toContain("제육");
        expect((await report(f1, "제육", 9000)).error).toBeNull();
        list = await menus();
        expect(list.find((x) => x.menu_key === "제육볶음")?.report_count).toBe(4);
        expect(await suggestions()).toEqual([]);

        const log = await rpc<LogRow[]>(e, "admin_log", { p_limit: 20 }, admin.token);
        const entry = log.data?.find((x) => x.id === m.data);
        expect(entry).toMatchObject({ action: "menu_merge", target_menu_key: "제육", target_place_id: place, undoable: true });

        expect((await rpc(e, "admin_undo", { p_action_ids: [m.data] }, admin.token)).error).toBeNull();
        list = await menus();
        expect(list.find((x) => x.menu_key === "제육")?.report_count).toBe(2);
        expect(list.find((x) => x.menu_key === "제육볶음")?.report_count).toBe(2);
      });

      it("숨기기는 메뉴판에서 내리고, 같은 줄을 두 번 숨길 수는 없다", async () => {
        const h = await rpc<string>(e, "admin_menu_decide", { p_place_id: place, p_menu_key: "제육볶음", p_result: "hide" }, admin.token);
        expect(h.error).toBeNull();
        expect((await menus()).map((x) => x.menu_key)).not.toContain("제육볶음");
        const again = await rpc(e, "admin_menu_decide", { p_place_id: place, p_menu_key: "제육볶음", p_result: "hide" }, admin.token);
        expect(again.error?.message).toBe("moderation_target_unavailable");
        expect((await rpc(e, "admin_undo", { p_action_ids: [h.data] }, admin.token)).error).toBeNull();
        expect((await menus()).map((x) => x.menu_key)).toContain("제육볶음");
      });

      it("따로 두기 뒤에는 같은 짝을 제안하지 않는다", async () => {
        expect((await suggestions()).length).toBe(1);
        expect(
          (await rpc(e, "admin_menu_separate", { p_place_id: place, p_from: "제육", p_to: "제육볶음" }, admin.token)).error,
        ).toBeNull();
        expect(await suggestions()).toEqual([]);
      });
    });
  },
);
