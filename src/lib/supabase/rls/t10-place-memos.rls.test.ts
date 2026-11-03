// T10.15 RLS/함수 테스트: 식당 메모(place_memos) 본인만, 40자, 금칙어, body만 고치기, 하루 30회, 정지 차단,
// 장애 홈 "즐겨찾기에서 고르기"(my_favorite_memos), 탈퇴 cascade
// 마이그레이션: supabase/migrations/20261103100000_t10_15_place_memos.sql (결정 D-32, D-33)
//
// 실행: pnpm test:rls (RUN_RLS_TESTS=1). 평소 pnpm test에서는 건너뛴다. 이 마이그레이션이 클라우드 개발 DB에
// 적용되기 전(place_memos가 PGRST205)에도 자동으로 건너뛴다.
//
// 역할 (CLAUDE.md 10장): 본인 = 작성자 세션, 타인 = 다른 사용자 세션, 비로그인 = publishable 키만,
// 정지된 본인 = 정지된 사용자 세션. 단언은 전부 publishable 키 + 세션으로 한다. secret 키는 사용자 생성, 삭제,
// 정지 상태 지정(준비 전용), 탈퇴 뒤 잔여 행 세기(account_residue)에만 쓴다.
//
// 확인하지 않는 것: 1인 300곳 상한. 하루 30회 한도가 먼저 걸려 하루에 300행을 만들 수 없다(service role로 넣어도
// 같은 트리거가 한도를 센다). 상한은 favorites의 place_list_before_insert와 같은 모양이라 마이그레이션 검토로 갈음한다.
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
const ready = env !== null && (await schemaReady(env, "place_memos"));

const PERMISSION_DENIED = "42501";
const CHECK_VIOLATION = "23514";
const BANNED = "banned_content";

type MemoRow = {
  user_id: string;
  place_id: string;
  place_url: string | null;
  body: string;
  created_at: string;
  updated_at: string;
};
type FavoriteMemoRow = {
  place_id: string;
  place_url: string | null;
  body: string;
  updated_at: string;
};
type ResidueRow = {
  table_schema: string;
  table_name: string;
  on_delete: string;
  remaining: number;
};

/** 실행마다 겹치지 않는 숫자 place_id(테스트끼리 같은 id를 써도 기본 키가 user_id와 묶여 상관없다) */
const base = 700_000_000 + Math.floor(Math.random() * 90_000_000);
const pid = (n: number) => String(base + n);
const url = (id: string) => `https://place.map.kakao.com/${id}`;

describe.skipIf(!ready)(
  "T10.15 식당 메모 (본인, 타인, 비로그인, 정지된 본인)",
  { timeout: 120_000 },
  () => {
    const e = env as RlsEnv;
    const runId = newRunId();
    let a: TestUser; // 본인
    let b: TestUser; // 타인
    let s: TestUser; // 정지될 사용자
    let q: TestUser; // 하루 한도 확인용
    let f: TestUser; // 즐겨찾기 메모 함수 확인용
    let gone: TestUser; // 탈퇴 확인용
    const created: string[] = [];
    const aPlace = pid(1);

    async function insert(user: TestUser | undefined, body: unknown) {
      return rest<MemoRow[]>(e, "place_memos", {
        method: "POST",
        token: user?.token,
        body,
      });
    }

    async function patch(
      user: TestUser | undefined,
      ownerId: string,
      placeId: string,
      body: Record<string, unknown>,
    ) {
      return rest<MemoRow[]>(
        e,
        `place_memos?user_id=eq.${ownerId}&place_id=eq.${placeId}`,
        { method: "PATCH", token: user?.token, body },
      );
    }

    beforeAll(async () => {
      [a, b, s, q, f, gone] = await Promise.all([
        createTestUser(e, runId, "a"),
        createTestUser(e, runId, "b"),
        createTestUser(e, runId, "s"),
        createTestUser(e, runId, "q"),
        createTestUser(e, runId, "f"),
        createTestUser(e, runId, "g"),
      ]);
      created.push(a.id, b.id, s.id, q.id, f.id, gone.id);

      const r = await insert(a, {
        user_id: a.id,
        place_id: aPlace,
        place_url: url(aPlace),
        body: "김치찌개 맛집",
      });
      expect(r.error).toBeNull();

      // 정지 전에 메모 하나를 남겨 두고 정지한다(정지 뒤 고치기, 지우기 확인용)
      const sr = await insert(s, {
        user_id: s.id,
        place_id: pid(1),
        place_url: url(pid(1)),
        body: "정지 전 메모",
      });
      expect(sr.error).toBeNull();
      await adminPatch(e, "profiles", `user_id=eq.${s.id}`, {
        status: "suspended",
        suspended_reason: "other",
      });
    }, 120_000);

    afterAll(async () => {
      await Promise.all(created.map((id) => deleteAuthUser(e, id)));
    }, 60_000);

    describe("본인", () => {
      it("본인 메모만 읽힌다", async () => {
        const r = await rest<MemoRow[]>(
          e,
          "place_memos?select=user_id,place_id,body",
          { token: a.token },
        );
        expect(r.error).toBeNull();
        expect(r.data?.every((x) => x.user_id === a.id)).toBe(true);
        expect(r.data?.map((x) => x.place_id)).toContain(aPlace);
      });

      it("body를 고치면 updated_at이 바뀌고, 같은 글 다시 저장은 시각이 그대로다", async () => {
        const before = await rest<MemoRow[]>(
          e,
          `place_memos?place_id=eq.${aPlace}&select=body,created_at,updated_at`,
          { token: a.token },
        );
        const t0 = before.data?.[0]?.updated_at ?? "";
        const p = await patch(a, a.id, aPlace, { body: "김치찌개 2인분" });
        expect(p.error).toBeNull();
        expect(p.data?.[0]?.body).toBe("김치찌개 2인분");
        const t1 = p.data?.[0]?.updated_at ?? "";
        expect(new Date(t1).getTime()).toBeGreaterThan(new Date(t0).getTime());

        const same = await patch(a, a.id, aPlace, { body: "김치찌개 2인분" });
        expect(same.error).toBeNull();
        expect(same.data?.[0]?.updated_at).toBe(t1);
      });

      it("body 말고 다른 열은 고치지 못한다(열 권한 42501)", async () => {
        for (const over of [
          { place_id: pid(99) },
          { user_id: b.id },
          { place_url: url(aPlace) },
          { updated_at: "2020-01-01T00:00:00Z" },
          { created_at: "2020-01-01T00:00:00Z" },
        ]) {
          const r = await patch(a, a.id, aPlace, over);
          expect(r.error?.code, Object.keys(over)[0]).toBe(PERMISSION_DENIED);
        }
      });

      it("created_at, updated_at은 직접 넣지 못한다(열 권한)", async () => {
        const r = await insert(a, {
          user_id: a.id,
          place_id: pid(2),
          body: "시각 조작",
          created_at: "2020-01-01T00:00:00Z",
        });
        expect(r.error?.code).toBe(PERMISSION_DENIED);
      });

      it("40자(코드 포인트)까지 저장, 41자는 거절", async () => {
        const ok = await insert(a, {
          user_id: a.id,
          place_id: pid(3),
          body: "가".repeat(40),
        });
        expect(ok.error).toBeNull();
        // 이모지 40개는 UTF-16으로 80이지만 코드 포인트로 40이라 통과한다
        const emoji = await patch(a, a.id, pid(3), { body: "🍜".repeat(40) });
        expect(emoji.error).toBeNull();

        const long = await insert(a, {
          user_id: a.id,
          place_id: pid(4),
          body: "가".repeat(41),
        });
        expect(long.error?.code).toBe(CHECK_VIOLATION);
        const longPatch = await patch(a, a.id, aPlace, {
          body: "가".repeat(41),
        });
        expect(longPatch.error?.code).toBe(CHECK_VIOLATION);
      });

      it("형식 규칙: 빈 글, 앞뒤 공백, 줄바꿈, 탭, place_id와 place_url 형식은 거절", async () => {
        for (const over of [
          { body: "" },
          { body: " 앞 공백" },
          { body: "뒤 공백 " },
          { body: "줄\n바꿈" },
          { body: "탭\t문자" },
          { place_id: "abc" },
          { place_url: "https://example.com/x" },
          { place_url: url(pid(98)) },
        ]) {
          const r = await insert(a, {
            user_id: a.id,
            place_id: pid(5),
            body: "형식 확인",
            ...over,
          });
          expect(r.error?.code, JSON.stringify(over).slice(0, 40)).toBe(
            CHECK_VIOLATION,
          );
        }
      });

      it("금칙어, 연락처, 링크는 banned_content로 거절(쓰기와 고치기 모두)", async () => {
        for (const body of [
          "시발 여기 별로",
          "예약 010-1234-5678",
          "https://open.kakao.com/x",
        ]) {
          const w = await insert(a, { user_id: a.id, place_id: pid(6), body });
          expect(w.error?.code, body).toBe(CHECK_VIOLATION);
          expect(w.error?.message, body).toContain(BANNED);
          const p = await patch(a, a.id, aPlace, { body });
          expect(p.error?.code, body).toBe(CHECK_VIOLATION);
          expect(p.error?.message, body).toContain(BANNED);
        }
        // 거절된 쓰기는 행을 남기지 않는다
        const r = await rest<MemoRow[]>(
          e,
          `place_memos?place_id=eq.${pid(6)}`,
          {
            token: a.token,
          },
        );
        expect(r.data).toEqual([]);
      });

      it("지우기 성공", async () => {
        const d = await rest<MemoRow[]>(
          e,
          `place_memos?user_id=eq.${a.id}&place_id=eq.${pid(3)}`,
          { method: "DELETE", token: a.token },
        );
        expect(d.error).toBeNull();
        expect(d.data?.length).toBe(1);
      });
    });

    describe("하루 한도", () => {
      it("저장과 고침 합쳐 30회, 같은 글 다시 저장과 지우기는 세지 않는다", async () => {
        const place = pid(10);
        const first = await insert(q, {
          user_id: q.id,
          place_id: place,
          body: "한도 0",
        }); // 1회
        expect(first.error).toBeNull();
        const same = await patch(q, q.id, place, { body: "한도 0" }); // 세지 않음
        expect(same.error).toBeNull();
        for (let i = 1; i < 30; i++) {
          const r = await patch(q, q.id, place, { body: `한도 ${i}` }); // 2~30회
          expect(r.error, `${i + 1}번째`).toBeNull();
        }
        const over = await patch(q, q.id, place, { body: "한도 초과" });
        expect(over.error?.code).toBe(CHECK_VIOLATION);
        expect(over.error?.message).toContain(
          "place_memos_daily_limit_exceeded",
        );

        const overInsert = await insert(q, {
          user_id: q.id,
          place_id: pid(11),
          body: "한도 초과 새 메모",
        });
        expect(overInsert.error?.message).toContain(
          "place_memos_daily_limit_exceeded",
        );

        // 지우기는 한도와 상관없이 된다
        const d = await rest<MemoRow[]>(
          e,
          `place_memos?user_id=eq.${q.id}&place_id=eq.${place}`,
          { method: "DELETE", token: q.token },
        );
        expect(d.error).toBeNull();
        expect(d.data?.length).toBe(1);
      });
    });

    describe("타인", () => {
      it("남의 메모는 0건", async () => {
        const r = await rest<MemoRow[]>(
          e,
          `place_memos?user_id=eq.${a.id}&place_id=eq.${aPlace}`,
          { token: b.token },
        );
        expect(r.error).toBeNull();
        expect(r.data).toEqual([]);
      });

      it("남의 메모를 고치거나 지우지 못한다(0행)", async () => {
        const p = await patch(b, a.id, aPlace, { body: "남이 고침" });
        expect(p.error).toBeNull();
        expect(p.data).toEqual([]);
        const d = await rest<MemoRow[]>(
          e,
          `place_memos?user_id=eq.${a.id}&place_id=eq.${aPlace}`,
          { method: "DELETE", token: b.token },
        );
        expect(d.error).toBeNull();
        expect(d.data).toEqual([]);
        // 본인 행은 그대로
        const mine = await rest<MemoRow[]>(
          e,
          `place_memos?place_id=eq.${aPlace}&select=body`,
          { token: a.token },
        );
        expect(mine.data?.[0]?.body).toBe("김치찌개 2인분");
      });

      it("user_id를 남으로 넣으면 거절", async () => {
        const r = await insert(b, {
          user_id: a.id,
          place_id: pid(20),
          body: "대신 쓰기",
        });
        expect(r.error?.code).toBe(PERMISSION_DENIED);
      });
    });

    describe("비로그인", () => {
      it("읽기, 쓰기, 즐겨찾기 메모 함수 모두 거절", async () => {
        const r = await rest(e, "place_memos?select=place_id", {});
        expect(r.error?.code).toBe(PERMISSION_DENIED);
        const w = await insert(undefined, {
          user_id: a.id,
          place_id: pid(30),
          body: "비로그인",
        });
        expect(w.error?.code).toBe(PERMISSION_DENIED);
        const fn = await rpc(e, "my_favorite_memos", {});
        expect(fn.error?.code).toBe(PERMISSION_DENIED);
      });
    });

    describe("정지된 본인", () => {
      it("쓰기와 고치기는 account_suspended로 거절, 읽기와 지우기는 된다", async () => {
        const w = await insert(s, {
          user_id: s.id,
          place_id: pid(2),
          body: "정지 중 메모",
        });
        expect(w.error?.code).toBe(PERMISSION_DENIED);
        expect(w.error?.message).toContain("account_suspended");

        const p = await patch(s, s.id, pid(1), { body: "정지 중 고침" });
        expect(p.error?.code).toBe(PERMISSION_DENIED);
        expect(p.error?.message).toContain("account_suspended");

        const r = await rest<MemoRow[]>(e, "place_memos?select=body", {
          token: s.token,
        });
        expect(r.data?.map((x) => x.body)).toEqual(["정지 전 메모"]);

        const d = await rest<MemoRow[]>(
          e,
          `place_memos?user_id=eq.${s.id}&place_id=eq.${pid(1)}`,
          { method: "DELETE", token: s.token },
        );
        expect(d.error).toBeNull();
        expect(d.data?.length).toBe(1);
      });
    });

    describe("장애 홈 즐겨찾기에서 고르기 (my_favorite_memos)", () => {
      it("메모가 있는 즐겨찾기만, 최근 메모 순 3곳까지", async () => {
        // 즐겨찾기 + 메모 4곳(41~44), 즐겨찾기만 1곳(45), 메모만 1곳(46)
        for (const n of [41, 42, 43, 44, 45]) {
          const fav = await rest(e, "favorites", {
            method: "POST",
            token: f.token,
            body: { user_id: f.id, place_id: pid(n), place_url: url(pid(n)) },
          });
          expect(fav.error, `fav ${n}`).toBeNull();
        }
        for (const n of [41, 42, 43, 44, 46]) {
          // place_url 없이 저장한 메모도 즐겨찾기 쪽 주소로 채워진다
          const m = await insert(f, {
            user_id: f.id,
            place_id: pid(n),
            body: `메모 ${n}`,
          });
          expect(m.error, `memo ${n}`).toBeNull();
        }
        // 41을 마지막에 고쳐 가장 최근으로 만든다
        const p = await patch(f, f.id, pid(41), { body: "메모 41 고침" });
        expect(p.error).toBeNull();

        const r = await rpc<FavoriteMemoRow[]>(
          e,
          "my_favorite_memos",
          {},
          f.token,
        );
        expect(r.error).toBeNull();
        expect(r.data?.map((x) => x.place_id)).toEqual([
          pid(41),
          pid(44),
          pid(43),
        ]);
        expect(r.data?.[0]?.body).toBe("메모 41 고침");
        expect(r.data?.every((x) => x.place_url === url(x.place_id))).toBe(
          true,
        );
      });

      it("타인이 부르면 남의 즐겨찾기 메모는 오지 않는다(본인 것만, 타인은 0건)", async () => {
        const r = await rpc<FavoriteMemoRow[]>(
          e,
          "my_favorite_memos",
          {},
          b.token,
        );
        expect(r.error).toBeNull();
        expect(r.data).toEqual([]);
      });
    });

    describe("탈퇴", () => {
      it("Auth 사용자를 지우면 메모도 cascade로 지워진다", async () => {
        const w = await insert(gone, {
          user_id: gone.id,
          place_id: pid(50),
          body: "탈퇴 전 메모",
        });
        expect(w.error).toBeNull();
        await deleteAuthUser(e, gone.id);
        const res = await adminRpc<ResidueRow[]>(e, "account_residue", {
          p_user_id: gone.id,
        });
        expect(res.error).toBeNull();
        const t = res.data?.find(
          (x) => x.table_schema === "public" && x.table_name === "place_memos",
        );
        expect(t?.on_delete).toBe("cascade");
        expect(Number(t?.remaining)).toBe(0);
      });
    });
  },
);
