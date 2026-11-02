// T10.3b 금칙어 DB 안전망 테스트 (MOD-04, DEAL-04, POLL-01, D-27)
// 마이그레이션: supabase/migrations/20261102200000_t10_3b_banned_words_guard.sql
//
// 실행: pnpm test:rls (RUN_RLS_TESTS=1). 평소 pnpm test에서는 건너뛴다. 이 마이그레이션이 클라우드 개발 DB에 적용되기 전
// (트리거가 없어 금칙어 닉네임이 그냥 저장됨)에는 맨 위 확인에서 알아채고 건너뛴다.
//
// 역할: 본인 = 로그인 사용자 세션으로 PostgREST를 직접 부르는 사람(서버 액션을 거치지 않는 우회, T8.15 위험 1),
// 타인 = 신고하는 다른 사용자 세션. 단언은 전부 publishable 키 + 세션으로 한다. secret 키는 사용자 생성과 삭제에만 쓴다.
//
// 확인하는 것
// 1. 직접 insert, update, RPC로 금칙어를 넣으면 23514 banned_content로 거절되고 행과 한도가 남지 않는다.
// 2. 정상 문구는 통과한다(오탐 예문 포함).
// 3. 서버 액션 경로 문구 불변: 같은 글은 서버 zod(containsBannedContent)가 먼저 거르고, DB가 거절해도
//    mapPgError, mapPollError가 서버 액션과 같은 "banned"로 바꾼다(문구 moderationCopy.banned 그대로).
// 4. 같은 판정: 예문과 금칙어 목록 전부를 후기 글로 바꿔 보며 DB 거절 여부 = containsBannedContent.
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";

import { mapPollError } from "@/features/poll/create/errors";
import * as lists from "@/lib/moderation/banned-words";
import { mapPgError } from "@/lib/supabase/db-errors";

import {
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

vi.mock("server-only", () => ({}));

const { containsBannedContent } = await import("@/lib/moderation");

const env = loadRlsEnv();

const CHECK_VIOLATION = "23514";
const BANNED = "banned_content";

/** 트리거가 적용됐는가: 임시 사용자가 금칙어 닉네임으로 바꿔 보고 banned_content로 거절되는지 본다 */
async function guardReady(e: RlsEnv): Promise<boolean> {
  if (!(await schemaReady(e, "reviews"))) return false;
  const probe = await createTestUser(e, newRunId(), "gp");
  try {
    const r = await rest(e, `profiles?user_id=eq.${probe.id}`, {
      method: "PATCH",
      token: probe.token,
      body: { nickname: "시발" },
    });
    return r.error?.message?.includes(BANNED) ?? false;
  } finally {
    await deleteAuthUser(e, probe.id);
  }
}

const ready = env !== null && (await guardReady(env));

const inMinutes = (m: number) =>
  new Date(Date.now() + m * 60_000).toISOString();

describe.skipIf(!ready)(
  "T10.3b 금칙어 DB 안전망 (PostgREST 직접 호출)",
  { timeout: 180_000 },
  () => {
    const e = env as RlsEnv;
    const runId = newRunId();
    const placeBase = `7${String(Date.now()).slice(-9)}${String(Math.floor(Math.random() * 90) + 10)}`;
    const place = (n: number) => `${placeBase}${String(n).padStart(3, "0")}`;

    let a: TestUser; // 직접 호출하는 본인
    let b: TestUser; // 신고하는 타인
    const created: string[] = [];
    let aReviewId = "";

    async function visit(user: TestUser, placeId: string) {
      const r = await rest<{ id: string }[]>(e, "visits", {
        method: "POST",
        token: user.token,
        body: { place_id: placeId, meal: "lunch", source: "rec" },
      });
      expect(r.error).toBeNull();
      return r.data?.[0]?.id ?? "";
    }

    function expectBanned(r: {
      error: { code?: string; message?: string } | null;
    }) {
      expect(r.error?.code).toBe(CHECK_VIOLATION);
      expect(r.error?.message).toContain(BANNED);
    }

    beforeAll(async () => {
      a = await createTestUser(e, runId, "ga");
      b = await createTestUser(e, runId, "gb");
      created.push(a.id, b.id);
    });

    afterAll(async () => {
      for (const id of created) await deleteAuthUser(e, id);
    });

    describe("닉네임 (profiles.nickname)", () => {
      it("금칙어, 우회 표기, 연락처는 거절", async () => {
        for (const nickname of ["시 발 놈", "ㅅㅂ", "f*ck", "010-1234-5678"]) {
          const r = await rest(e, `profiles?user_id=eq.${a.id}`, {
            method: "PATCH",
            token: a.token,
            body: { nickname },
          });
          expectBanned(r);
        }
        const me = await rest<{ nickname: string }[]>(
          e,
          `profiles?user_id=eq.${a.id}&select=nickname`,
          { token: a.token },
        );
        expect(me.data?.[0]?.nickname).toBe(a.nickname);
      });

      it("정상 닉네임과 오탐 예문은 통과, 닉네임을 안 바꾸는 수정도 통과", async () => {
        for (const nickname of [
          "점심손님 1234",
          "시바견 좋아",
          "역시 발 빠름",
        ]) {
          const r = await rest<{ nickname: string }[]>(
            e,
            `profiles?user_id=eq.${a.id}`,
            { method: "PATCH", token: a.token, body: { nickname } },
          );
          expect(r.error).toBeNull();
          expect(r.data?.[0]?.nickname).toBe(nickname);
        }
        const terms = await rest(e, `profiles?user_id=eq.${a.id}`, {
          method: "PATCH",
          token: a.token,
          body: { terms_agreed_at: new Date().toISOString() },
        });
        expect(terms.error).toBeNull();
      });
    });

    describe("한 줄 후기 (reviews.body)", () => {
      it("금칙어 후기 insert는 거절되고 행이 남지 않는다", async () => {
        const v = await visit(a, place(1));
        const bad = await rest(e, "reviews", {
          method: "POST",
          token: a.token,
          body: { visit_id: v, rating: "down", body: "오픈 카톡으로 오세요" },
        });
        expectBanned(bad);
        const rows = await rest<unknown[]>(
          e,
          `reviews?visit_id=eq.${v}&select=id`,
          { token: a.token },
        );
        expect(rows.data).toEqual([]);

        const ok = await rest<{ id: string; body: string }[]>(e, "reviews", {
          method: "POST",
          token: a.token,
          body: { visit_id: v, rating: "up", body: "국물이 진해요" },
        });
        expect(ok.error).toBeNull();
        aReviewId = ok.data?.[0]?.id ?? "";
        expect(aReviewId).not.toBe("");
      });

      it("글을 금칙어로 고치면 거절, 글을 안 바꾸는 수정은 통과", async () => {
        const bad = await rest(e, `reviews?id=eq.${aReviewId}`, {
          method: "PATCH",
          token: a.token,
          body: { body: "ㅂㅅ같은 집" },
        });
        expectBanned(bad);
        const ok = await rest<{ rating: string; body: string }[]>(
          e,
          `reviews?id=eq.${aReviewId}`,
          { method: "PATCH", token: a.token, body: { rating: "down" } },
        );
        expect(ok.error).toBeNull();
        expect(ok.data?.[0]?.body).toBe("국물이 진해요");
      });
    });

    describe("신고 기타 글 (review_reports.note)", () => {
      it("금칙어 기타 글은 거절, 정상 글은 통과", async () => {
        const bad = await rest(e, "review_reports", {
          method: "POST",
          token: b.token,
          body: {
            target_type: "review",
            review_id: aReviewId,
            reason: "other",
            note: "텔레그램 문의 주세요",
          },
        });
        expectBanned(bad);
        const ok = await rest(e, "review_reports", {
          method: "POST",
          token: b.token,
          body: {
            target_type: "review",
            review_id: aReviewId,
            reason: "other",
            note: "광고 같아요",
          },
        });
        expect(ok.error).toBeNull();
      });
    });

    describe("할인 내용 (place_deals.content, register_deal)", () => {
      it("금칙어 할인은 거절되고 한도도 쓰지 않는다, 정상 할인은 통과", async () => {
        const before = await rpc<{ bucket: string; used: number }[]>(
          e,
          "my_daily_limits",
          {},
          a.token,
        );
        const usedBefore =
          before.data?.find((x) => x.bucket === "deals")?.used ?? 0;

        const bad = await rpc(
          e,
          "register_deal",
          {
            p_place_id: place(2),
            p_type: "discount",
            p_content: "naver . com 에서 쿠폰",
          },
          a.token,
        );
        expectBanned(bad);

        const after = await rpc<{ bucket: string; used: number }[]>(
          e,
          "my_daily_limits",
          {},
          a.token,
        );
        expect(after.data?.find((x) => x.bucket === "deals")?.used ?? 0).toBe(
          usedBefore,
        );

        const ok = await rpc<{ deal_id: string | null }[]>(
          e,
          "register_deal",
          {
            p_place_id: place(2),
            p_type: "discount",
            p_content: "점심 특선 9천 원",
          },
          a.token,
        );
        expect(ok.error).toBeNull();
        expect(ok.data?.[0]?.deal_id).toBeTruthy();
      });
    });

    describe("투표방 제목 (polls.title, create_poll, update_poll)", () => {
      const args = (title: string) => ({
        p_kind: "lunch",
        p_title: title,
        p_closes_at: inMinutes(30),
        p_multi: false,
        p_place_ids: [place(3), place(4)],
        p_place_urls: [place(3), place(4)].map(
          (p) => `https://place.map.kakao.com/${p}`,
        ),
        p_anchor_lat: 37.5665,
        p_anchor_lng: 126.978,
        p_radius_m: 800,
      });

      it("금칙어 제목으로 만들기, 고치기는 거절, 정상 제목은 통과", async () => {
        const bad = await rpc(e, "create_poll", args("병 신 모임"), a.token);
        expectBanned(bad);

        const ok = await rpc<{ poll_id: string }[]>(
          e,
          "create_poll",
          args(`test_점심_${runId}`.slice(0, 20)),
          a.token,
        );
        expect(ok.error).toBeNull();
        const pollId = ok.data?.[0]?.poll_id ?? "";

        const badUpdate = await rpc(
          e,
          "update_poll",
          { p_poll_id: pollId, p_title: "f u c k" },
          a.token,
        );
        expectBanned(badUpdate);

        const okUpdate = await rpc(
          e,
          "update_poll",
          { p_poll_id: pollId, p_title: `test_금요일_${runId}`.slice(0, 20) },
          a.token,
        );
        expect(okUpdate.error).toBeNull();

        // 정리: 보내기 전이라 취소하면 지워지고 한도도 돌아온다
        await rpc(e, "cancel_unsent_poll", { p_poll_id: pollId }, a.token);
      });
    });

    describe("서버 액션 경로 문구 불변", () => {
      it("서버 zod가 먼저 거르는 글이고, DB 거절도 같은 banned 코드로 바뀐다", async () => {
        const text = "ㅅㅂ 별로";
        // 서버 액션은 이 글을 DB에 보내기 전에 banned로 돌려준다(withoutBannedContent)
        expect(containsBannedContent(text)).toBe(true);

        const r = await rest(e, `reviews?id=eq.${aReviewId}`, {
          method: "PATCH",
          token: a.token,
          body: { body: text },
        });
        expectBanned(r);
        // DB까지 와도 일반 check 위반(invalid)이 아니라 서버 액션과 같은 banned
        expect(mapPgError(r.error)).toEqual({ ok: false, error: "banned" });
        expect(mapPollError(r.error)).toBe("banned");
        // 걸린 낱말은 오류에 담기지 않는다(D-13 안건 13)
        expect(JSON.stringify(r.error)).not.toContain("ㅅㅂ");
      });
    });

    describe("같은 판정: DB 거절 = containsBannedContent", () => {
      // 예문(오탐 방지 포함)과 목록 전부. 후기 글(1~100자, 앞뒤 공백 없음)로 하나씩 바꿔 본다
      const samples = [
        "시.발",
        "시1발",
        "씨이이발",
        "ㅅㅣㅂㅏㄹ",
        "미친 놈이 운영함",
        "개 새 끼",
        "ｆｕｃｋ",
        "sh1t",
        "씨​발",
        "18놈",
        "공일공 일이삼사 오육칠팔",
        "1588-1234",
        "abc@example.com",
        "t.me/abcd",
        "시발점이 된 가게",
        "수박씨발라먹기",
        "역시발 빠른 서빙",
        "미친 맛이에요",
        "새끼손가락만 한 새우",
        "생강간장 소스가 맛있어요",
        "가격 12,000원 15,000원",
        "2026.11.01 방문",
        "11:30~13:00 웨이팅",
        "사이다 2병, 신라면",
        "제휴카드 할인돼요",
        "3.5점",
      ];
      const corpus = [
        ...new Set(
          [
            ...samples,
            ...lists.BANNED_HANGUL,
            ...lists.BANNED_JAMO,
            ...lists.BANNED_MIXED,
            ...lists.BANNED_LATIN,
            ...lists.SAFE_SUBSTRINGS,
          ].map((s) => s.trim()),
        ),
      ].filter((s) => s.length >= 1 && s.length <= 100);

      it(`${corpus.length}개 글에서 판정이 모두 같다`, async () => {
        const mismatches: string[] = [];
        for (const text of corpus) {
          const r = await rest(e, `reviews?id=eq.${aReviewId}`, {
            method: "PATCH",
            token: a.token,
            body: { body: text },
          });
          const dbBanned = r.error?.message?.includes(BANNED) ?? false;
          if (r.error && !dbBanned) {
            throw new Error(
              `[rls] 예상 밖 오류 ${r.error.code} ${r.error.message}`,
            );
          }
          if (dbBanned !== containsBannedContent(text)) mismatches.push(text);
        }
        expect(mismatches).toEqual([]);
      });
    });
  },
);
