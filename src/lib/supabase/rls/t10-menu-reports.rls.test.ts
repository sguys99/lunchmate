// T10.16c RLS/함수 테스트: 메뉴 제보(menu_reports) 원본은 본인만, 집계는 place_menus로만(AC-MENU-1),
// 이름 20자와 형식, 가격 범위, 금칙어, 같은 메뉴 하루 1회, 후기 연결(본인 후기, 같은 식당, 후기 삭제 cascade),
// 하루 20건, 정지 차단, 숨긴 후기에서 온 메뉴는 집계 제외, 사용자마다 메뉴별 1표, 탈퇴 cascade
// 마이그레이션: supabase/migrations/20261103200000_t10_16c_menu_reports.sql (결정 D-34, D-35)
//
// 실행: pnpm test:rls (RUN_RLS_TESTS=1). 평소 pnpm test에서는 건너뛴다. 마이그레이션 적용 전(PGRST205)에도 건너뛴다.
//
// 역할 (CLAUDE.md 10장): 본인 = 작성자 세션, 타인 = 다른 사용자 세션, 비로그인 = publishable 키만,
// 정지된 본인 = 정지된 사용자 세션. 단언은 전부 publishable 키 + 세션으로 한다. secret 키는 사용자 생성, 삭제,
// 정지 상태와 후기 숨김 지정(준비 전용), 탈퇴 뒤 잔여 행 세기(account_residue)에만 쓴다.
//
// 확인하지 않는 것: 180일 창(created_at은 트리거가 now()로 채워 과거 행을 만들 수 없다. 마이그레이션 검토로 갈음).
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
const ready = env !== null && (await schemaReady(env, "menu_reports"));

const PERMISSION_DENIED = "42501";
const CHECK_VIOLATION = "23514";
const UNIQUE_VIOLATION = "23505";
const BANNED = "banned_content";

type ReportRow = {
  id: string;
  user_id: string;
  place_id: string;
  menu_name: string;
  menu_key: string;
  price_krw: number;
  source: string;
  review_id: string | null;
};
type MenuStat = {
  place_id: string;
  menu_key: string;
  menu_name: string;
  median_krw: number;
  report_count: number;
  last_month: string;
  rank: number;
};
type ResidueRow = {
  table_schema: string;
  table_name: string;
  on_delete: string;
  remaining: number;
};

const base = 710_000_000 + Math.floor(Math.random() * 80_000_000);
const pid = (n: number) => String(base + n);
const url = (id: string) => `https://place.map.kakao.com/${id}`;

describe.skipIf(!ready)(
  "T10.16c 메뉴 제보 (본인, 타인, 비로그인, 정지된 본인)",
  { timeout: 180_000 },
  () => {
    const e = env as RlsEnv;
    const runId = newRunId();
    let a: TestUser; // 본인
    let b: TestUser; // 타인
    let s: TestUser; // 정지될 사용자
    let q: TestUser; // 하루 한도 확인용
    let gone: TestUser; // 탈퇴 확인용
    const created: string[] = [];
    const aPlace = pid(1);

    async function insert(user: TestUser | undefined, body: Record<string, unknown>) {
      return rest<ReportRow[]>(e, "menu_reports", {
        method: "POST",
        token: user?.token,
        body,
      });
    }

    function detail(user: TestUser, placeId: string, menu: string, price: number) {
      return insert(user, {
        user_id: user.id,
        place_id: placeId,
        place_url: url(placeId),
        menu_name: menu,
        price_krw: price,
        source: "detail",
      });
    }

    async function menus(placeIds: string[], token?: string) {
      const r = await rpc<MenuStat[]>(e, "place_menus", { p_place_ids: placeIds }, token);
      expect(r.error).toBeNull();
      return r.data ?? [];
    }

    async function review(user: TestUser, placeId: string) {
      const v = await rest<{ id: string }[]>(e, "visits", {
        method: "POST",
        token: user.token,
        body: { place_id: placeId, meal: "lunch", source: "rec" },
      });
      expect(v.error).toBeNull();
      const r = await rest<{ id: string }[]>(e, "reviews", {
        method: "POST",
        token: user.token,
        body: { user_id: user.id, visit_id: v.data?.[0]?.id, rating: "up", price_krw: 9000 },
      });
      expect(r.error).toBeNull();
      return r.data?.[0]?.id ?? "";
    }

    beforeAll(async () => {
      [a, b, s, q, gone] = await Promise.all([
        createTestUser(e, runId, "a"),
        createTestUser(e, runId, "b"),
        createTestUser(e, runId, "s"),
        createTestUser(e, runId, "q"),
        createTestUser(e, runId, "g"),
      ]);
      created.push(a.id, b.id, s.id, q.id, gone.id);

      const r = await detail(a, aPlace, "수육 백반", 12000);
      expect(r.error).toBeNull();

      const sr = await detail(s, pid(1), "정지 전 메뉴", 8000);
      expect(sr.error).toBeNull();
      await adminPatch(e, "profiles", `user_id=eq.${s.id}`, {
        status: "suspended",
        suspended_reason: "other",
      });
    }, 180_000);

    afterAll(async () => {
      await Promise.all(created.map((id) => deleteAuthUser(e, id)));
    }, 60_000);

    describe("본인", () => {
      it("본인 행만 읽히고 menu_key는 트리거가 채운다(공백 제거, 소문자)", async () => {
        const r = await rest<ReportRow[]>(e, "menu_reports?select=user_id,place_id,menu_name,menu_key", {
          token: a.token,
        });
        expect(r.error).toBeNull();
        expect(r.data?.every((x) => x.user_id === a.id)).toBe(true);
        const row = r.data?.find((x) => x.place_id === aPlace);
        expect(row?.menu_name).toBe("수육 백반");
        expect(row?.menu_key).toBe("수육백반");
      });

      it("menu_key, kst_day, hidden_*는 직접 넣지 못한다(열 권한 42501)", async () => {
        for (const extra of [{ menu_key: "x" }, { kst_day: "2026-01-01" }, { hidden_at: new Date().toISOString(), hidden_reason: "admin" }]) {
          const r = await insert(a, {
            user_id: a.id,
            place_id: pid(2),
            menu_name: "직접 넣기",
            price_krw: 9000,
            source: "detail",
            ...extra,
          });
          expect(r.error?.code).toBe(PERMISSION_DENIED);
        }
      });

      it("고치기는 없다(update 권한 없음)", async () => {
        const r = await rest<ReportRow[]>(e, `menu_reports?user_id=eq.${a.id}&place_id=eq.${aPlace}`, {
          method: "PATCH",
          token: a.token,
          body: { price_krw: 5000 },
        });
        expect(r.error?.code).toBe(PERMISSION_DENIED);
      });

      it("20자(코드 포인트)까지, 21자는 거절", async () => {
        expect((await detail(a, pid(3), "가".repeat(19) + "🍚", 9000)).error).toBeNull();
        expect((await detail(a, pid(3), "나".repeat(21), 9000)).error?.code).toBe(CHECK_VIOLATION);
      });

      it("형식: 빈 이름, 앞뒤 공백, 연속 공백, 줄바꿈, NFD, 가격 범위와 500원 단위, 출처 짝은 거절", async () => {
        const bad: Record<string, unknown>[] = [
          { menu_name: "", price_krw: 9000 },
          { menu_name: " 국밥", price_krw: 9000 },
          { menu_name: "국  밥", price_krw: 9000 },
          { menu_name: "국\n밥", price_krw: 9000 },
          { menu_name: "국밥".normalize("NFD"), price_krw: 9000 },
          { menu_name: "국밥", price_krw: 500 },
          { menu_name: "국밥", price_krw: 100500 },
          { menu_name: "국밥", price_krw: 9100 },
          { menu_name: "국밥", price_krw: 9000, source: "feedback" },
        ];
        for (const x of bad) {
          const r = await insert(a, { user_id: a.id, place_id: pid(4), source: "detail", ...x });
          expect(r.error?.code, JSON.stringify(x)).toBe(CHECK_VIOLATION);
        }
        const u = await insert(a, {
          user_id: a.id,
          place_id: pid(4),
          place_url: url(pid(5)),
          menu_name: "국밥",
          price_krw: 9000,
          source: "detail",
        });
        expect(u.error?.code).toBe(CHECK_VIOLATION);
      });

      it("금칙어, 연락처, 링크는 banned_content로 거절", async () => {
        for (const name of ["010-1234-5678", "kakao.com 국밥"]) {
          const r = await detail(a, pid(6), name, 9000);
          expect(r.error?.message ?? "").toContain(BANNED);
        }
      });

      it("같은 식당 같은 메뉴(비교 키)는 하루 1회", async () => {
        expect((await detail(a, pid(7), "제육볶음", 9000)).error).toBeNull();
        const again = await detail(a, pid(7), "제육 볶음", 9500);
        expect(again.error?.code).toBe(UNIQUE_VIOLATION);
        expect((await detail(a, pid(7), "김치찌개", 9000)).error).toBeNull();
      });

      it("피드백 출처: 본인 후기와 같은 식당만, 후기 하나에 메뉴 하나, 후기를 지우면 함께 지워진다", async () => {
        const place = pid(8);
        const rid = await review(a, place);
        const ok = await insert(a, {
          user_id: a.id,
          place_id: place,
          menu_name: "돼지국밥",
          price_krw: 9000,
          source: "feedback",
          review_id: rid,
        });
        expect(ok.error).toBeNull();
        const second = await insert(a, {
          user_id: a.id,
          place_id: place,
          menu_name: "순대국밥",
          price_krw: 9500,
          source: "feedback",
          review_id: rid,
        });
        expect(second.error?.code).toBe(UNIQUE_VIOLATION);
        const otherPlace = await insert(a, {
          user_id: a.id,
          place_id: pid(9),
          menu_name: "순대국밥",
          price_krw: 9500,
          source: "feedback",
          review_id: rid,
        });
        expect(otherPlace.error?.message ?? "").toContain("menu_reports_review_mismatch");

        const del = await rest(e, `reviews?id=eq.${rid}`, { method: "DELETE", token: a.token });
        expect(del.error).toBeNull();
        const left = await rest<ReportRow[]>(e, `menu_reports?place_id=eq.${place}&select=id`, { token: a.token });
        expect(left.data).toEqual([]);
      });

      it("지우기 성공", async () => {
        const w = await detail(a, pid(10), "지울 메뉴", 9000);
        expect(w.error).toBeNull();
        const d = await rest<ReportRow[]>(e, `menu_reports?user_id=eq.${a.id}&place_id=eq.${pid(10)}`, {
          method: "DELETE",
          token: a.token,
          prefer: "return=representation",
        });
        expect(d.error).toBeNull();
        expect(d.data?.length).toBe(1);
      });

      it("하루 20건, 21번째는 menu_reports_daily_limit_exceeded", async () => {
        for (let i = 0; i < 20; i++) {
          const r = await detail(q, pid(100 + i), "한도 메뉴", 9000);
          expect(r.error, `${i}`).toBeNull();
        }
        const over = await detail(q, pid(120), "한도 메뉴", 9000);
        expect(over.error?.message ?? "").toContain("menu_reports_daily_limit_exceeded");
      });
    });

    describe("타인", () => {
      it("남의 원본 행은 0건", async () => {
        const r = await rest<ReportRow[]>(e, `menu_reports?user_id=eq.${a.id}`, { token: b.token });
        expect(r.error).toBeNull();
        expect(r.data).toEqual([]);
      });

      it("남의 행을 지우지 못한다(0행)", async () => {
        const d = await rest<ReportRow[]>(e, `menu_reports?user_id=eq.${a.id}`, {
          method: "DELETE",
          token: b.token,
          prefer: "return=representation",
        });
        expect(d.data ?? []).toEqual([]);
        const still = await rest<ReportRow[]>(e, `menu_reports?place_id=eq.${aPlace}&select=id`, { token: a.token });
        expect(still.data?.length).toBe(1);
      });

      it("user_id를 남으로 넣으면 거절", async () => {
        const r = await insert(b, {
          user_id: a.id,
          place_id: pid(11),
          menu_name: "남 이름",
          price_krw: 9000,
          source: "detail",
        });
        expect(r.error).not.toBeNull();
      });

      it("남의 후기에 메뉴를 붙이지 못한다", async () => {
        const place = pid(12);
        const rid = await review(a, place);
        const r = await insert(b, {
          user_id: b.id,
          place_id: place,
          menu_name: "남 후기",
          price_krw: 9000,
          source: "feedback",
          review_id: rid,
        });
        expect(r.error?.message ?? "").toContain("menu_reports_review_mismatch");
      });
    });

    describe("집계 place_menus (AC-MENU-1)", () => {
      it("작성자 없이 메뉴별 중앙값, 제보 수, 대표 이름, 순위만 온다. 사용자마다 메뉴별 1표", async () => {
        const place = pid(20);
        expect((await detail(a, place, "돼지국밥", 9000)).error).toBeNull();
        expect((await detail(b, place, "돼지 국밥", 10000)).error).toBeNull();
        expect((await detail(b, place, "순대국밥", 9500)).error).toBeNull();
        const rows = await menus([place], b.token);
        expect(rows.map((r) => r.menu_key)).toEqual(["돼지국밥", "순대국밥"]);
        const top = rows[0] as MenuStat;
        expect(top.report_count).toBe(2);
        expect(top.median_krw).toBe(9500);
        expect(top.rank).toBe(1);
        for (const r of rows) expect(Object.keys(r).sort()).toEqual(
          ["last_month", "median_krw", "menu_key", "menu_name", "place_id", "rank", "report_count"],
        );
      });

      it("비로그인도 같은 집계를 받는다", async () => {
        const rows = await menus([pid(20)]);
        expect(rows.length).toBe(2);
      });

      it("숨긴 후기에서 온 메뉴는 빠지고, 식당마다 3개까지", async () => {
        const place = pid(21);
        const rid = await review(b, place);
        expect(
          (
            await insert(b, {
              user_id: b.id,
              place_id: place,
              menu_name: "숨길 메뉴",
              price_krw: 9000,
              source: "feedback",
              review_id: rid,
            })
          ).error,
        ).toBeNull();
        expect((await menus([place])).map((r) => r.menu_key)).toEqual(["숨길메뉴"]);
        await adminPatch(e, "reviews", `id=eq.${rid}`, { hidden_at: new Date().toISOString(), hidden_reason: "admin" });
        expect(await menus([place])).toEqual([]);

        const many = pid(22);
        for (const m of ["가", "나", "다", "라"]) expect((await detail(a, many, `${m}메뉴`, 9000)).error).toBeNull();
        expect((await menus([many])).length).toBe(3);
      });

      it("61곳 이상은 거절", async () => {
        const ids = Array.from({ length: 61 }, (_, i) => pid(200 + i));
        const r = await rpc(e, "place_menus", { p_place_ids: ids });
        expect(r.error?.message ?? "").toContain("place_menus_too_many_ids");
      });
    });

    describe("비로그인", () => {
      it("원본 읽기, 쓰기 모두 거절", async () => {
        const r = await rest<ReportRow[]>(e, "menu_reports?select=id");
        expect(r.error?.code).toBe(PERMISSION_DENIED);
        const w = await insert(undefined, {
          place_id: pid(30),
          menu_name: "비로그인",
          price_krw: 9000,
          source: "detail",
        });
        expect(w.error).not.toBeNull();
      });
    });

    describe("정지된 본인", () => {
      it("쓰기는 account_suspended로 거절, 읽기와 지우기는 된다", async () => {
        const w = await detail(s, pid(40), "정지 뒤 메뉴", 9000);
        expect(w.error?.message ?? "").toContain("account_suspended");
        const r = await rest<ReportRow[]>(e, "menu_reports?select=id", { token: s.token });
        expect(r.data?.length).toBe(1);
        const d = await rest<ReportRow[]>(e, `menu_reports?user_id=eq.${s.id}`, {
          method: "DELETE",
          token: s.token,
          prefer: "return=representation",
        });
        expect(d.data?.length).toBe(1);
      });
    });

    describe("탈퇴", () => {
      it("Auth 사용자를 지우면 메뉴 제보도 cascade로 지워진다", async () => {
        expect((await detail(gone, pid(50), "탈퇴 전 메뉴", 9000)).error).toBeNull();
        await deleteAuthUser(e, gone.id);
        const res = await adminRpc<ResidueRow[]>(e, "account_residue", { p_user_id: gone.id });
        expect(res.error).toBeNull();
        const t = res.data?.find((x) => x.table_schema === "public" && x.table_name === "menu_reports");
        expect(t?.on_delete).toBe("cascade");
        expect(Number(t?.remaining)).toBe(0);
      });
    });
  },
);
