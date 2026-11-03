import { describe, expect, it } from "vitest";
import { adminCopy } from "@/copy/admin";
import {
  betaFeedbackRowSchema,
  decideItemInput,
  decideMenuInput,
  filterBetaFeedback,
  hiddenKeyOfLog,
  logRowSchema,
  mapAdminError,
  menuFlaggedRowSchema,
  menuQueue,
  menuSuggestionRowSchema,
  mergeMenuInput,
  orderWithSkipped,
  reportedRowSchema,
  sameAuthorOthers,
  searchUsersInput,
  sectionCounts,
  setSuspensionInput,
  sortQueue,
  todaysEntries,
  topReason,
  userRowSchema,
  formatKstDateTime,
  type ReportedItem,
} from "./model";

const UUID = "3f2a8c1e-5b7d-4e2a-9c1f-0a1b2c3d4e5f";

function row(over: Record<string, unknown> = {}) {
  return {
    target_type: "review",
    target_id: "r1",
    place_id: "1840235701",
    body: "공개 글",
    rating: "down",
    private_now: false,
    auto_hidden: true,
    reasons: { spam: 3, false: 1, unknown: 9 },
    notes: null,
    report_count: 4,
    first_reported_at: "2026-11-01T03:10:00+00:00",
    written_at: "2026-11-01T02:52:00+00:00",
    author_id: "u1",
    author_nickname: "test_작성자",
    author_provider: "custom:kakao",
    author_joined_at: "2026-10-30T00:00:00+00:00",
    author_status: "active",
    author_suspended_until: null,
    author_reports_received: 7,
    author_hidden_count: 2,
    ...over,
  };
}

const item = (over: Record<string, unknown> = {}): ReportedItem =>
  reportedRowSchema.parse(row(over));

describe("응답 스키마", () => {
  it("신고 큐 행을 화면 모양으로 바꾸고 모르는 사유는 버린다", () => {
    const it = item();
    expect(it.key).toBe("review:r1");
    expect(it.reasons).toEqual({ spam: 3, false: 1 });
    expect(it.notes).toEqual([]);
    expect(it.author.nickname).toBe("test_작성자");
  });

  it("비공개로 바뀐 글은 body null + privateNow 그대로", () => {
    const it = item({ body: null, private_now: true });
    expect(it.body).toBeNull();
    expect(it.privateNow).toBe(true);
  });

  it("모양이 다르면 실패한다(필수 열 누락)", () => {
    const bad = { ...row() } as Record<string, unknown>;
    delete bad.report_count;
    expect(reportedRowSchema.safeParse(bad).success).toBe(false);
  });

  it("사용자 행과 이력 행", () => {
    const u = userRowSchema.parse({
      kind: "candidate",
      user_id: "u1",
      nickname: null,
      provider: null,
      joined_at: "2026-10-30T00:00:00+00:00",
      role: "user",
      status: "active",
      suspended_until: null,
      suspended_reason: null,
      reports_received: 3,
      hidden_count: 2,
      hidden_since_review: 2,
      recent_items: [
        {
          target_type: "review",
          target_id: "r9",
          place_id: "1",
          body: null,
          private_now: true,
          hidden: true,
          report_count: 3,
          written_at: "2026-10-31T00:00:00+00:00",
        },
      ],
    });
    expect(u.recentItems[0]).toMatchObject({ privateNow: true, body: null });

    const l = logRowSchema.parse({
      id: "l1",
      created_at: "2026-11-01T05:40:00+00:00",
      action: "review_hide",
      target_type: "review",
      target_id: "r1",
      target_place_id: "1840235701",
      target_user_id: "u1",
      target_nickname: "test_작성자",
      reason: "spam",
      duration: null,
      by_system: false,
      admin_nickname: "운영자",
      reverted_at: null,
      undoable: true,
    });
    expect(l.reverted).toBe(false);
    expect(hiddenKeyOfLog(l)).toBe("review:r1");
    expect(hiddenKeyOfLog({ ...l, targetId: null })).toBeNull();
    expect(
      hiddenKeyOfLog({ ...l, action: "user_suspend", targetType: "user" }),
    ).toBeNull();
  });
});

describe("입력 재검증", () => {
  it("숨김은 사유가 필요하고, 같은 작성자 일괄은 숨김에만", () => {
    const base = {
      targetType: "review",
      targetId: UUID,
      includeAuthor: false,
    } as const;
    expect(
      decideItemInput.safeParse({ ...base, result: "hide", reason: "spam" })
        .success,
    ).toBe(true);
    expect(
      decideItemInput.safeParse({ ...base, result: "hide", reason: null })
        .success,
    ).toBe(false);
    expect(
      decideItemInput.safeParse({
        ...base,
        result: "restore",
        reason: null,
        includeAuthor: true,
      }).success,
    ).toBe(false);
    expect(
      decideItemInput.safeParse({
        ...base,
        targetId: "not-a-uuid",
        result: "restore",
        reason: null,
      }).success,
    ).toBe(false);
  });

  it("정지는 기간과 사유가 목록 안에서만", () => {
    expect(
      setSuspensionInput.safeParse({
        userId: UUID,
        status: "suspended",
        duration: "d7",
        reason: "spam",
      }).success,
    ).toBe(true);
    expect(
      setSuspensionInput.safeParse({
        userId: UUID,
        status: "suspended",
        duration: "d1",
        reason: "spam",
      }).success,
    ).toBe(false);
    expect(
      setSuspensionInput.safeParse({ userId: UUID, status: "active" }).success,
    ).toBe(true);
  });

  it("닉네임 찾기는 1~20자, 제어 문자 없음", () => {
    expect(searchUsersInput.safeParse({ query: " test_ " }).success).toBe(true);
    expect(searchUsersInput.safeParse({ query: "  " }).success).toBe(false);
    expect(searchUsersInput.safeParse({ query: "a".repeat(21) }).success).toBe(
      false,
    );
    expect(searchUsersInput.safeParse({ query: "a\u0007" }).success).toBe(
      false,
    );
  });
});

describe("오류 이름 → 결과 코드", () => {
  it.each([
    ["admin_only", "42501", "forbidden"],
    ["moderation_undo_unavailable", "23514", "undo_unavailable"],
    ["moderation_conflict", "23514", "conflict"],
    ["moderation_admin_target", "23514", "admin_target"],
    ["moderation_target_unavailable", "23514", "unavailable"],
    ["admin_invalid_input", "23514", "invalid"],
    ["fetch failed", undefined, "save"],
  ] as const)("%s → %s", (message, code, expected) => {
    expect(mapAdminError({ message, code })).toBe(expected);
  });
  it("오류가 없으면 null, 모든 코드에 문구가 있다", () => {
    expect(mapAdminError(null)).toBeNull();
    for (const k of [
      "forbidden",
      "unavailable",
      "conflict",
      "undo_unavailable",
      "admin_target",
      "invalid",
      "save",
    ] as const)
      expect(adminCopy.errors[k]).toBeTruthy();
  });
});

describe("큐 규칙", () => {
  const a = item({ target_id: "a", auto_hidden: false, report_count: 2 });
  const b = item({ target_id: "b", auto_hidden: true, report_count: 3 });
  const c = item({
    target_id: "c",
    auto_hidden: true,
    report_count: 3,
    first_reported_at: "2026-10-31T00:00:00+00:00",
    author_id: "u2",
  });

  it("자동 숨김 먼저, 신고 많은 순, 첫 신고 오래된 순", () => {
    expect(sortQueue([a, b, c]).map((x) => x.targetId)).toEqual([
      "c",
      "b",
      "a",
    ]);
  });

  it("건너뛴 항목은 맨 뒤로", () => {
    expect(
      orderWithSkipped(sortQueue([a, b, c]), ["review:c"]).map(
        (x) => x.targetId,
      ),
    ).toEqual(["b", "a", "c"]);
  });

  it("같은 작성자의 다른 글 수", () => {
    expect(sameAuthorOthers([a, b, c], b)).toBe(1);
    expect(sameAuthorOthers([a, b, c], c)).toBe(0);
  });

  it("숨김 사유 기본값은 가장 많이 받은 사유, 할인은 할인 사유 안에서", () => {
    expect(topReason(item({ reasons: { abuse: 1, privacy: 2 } }))).toBe(
      "privacy",
    );
    expect(
      topReason(item({ target_type: "deal", reasons: { spam: 5, abuse: 1 } })),
    ).toBe("abuse");
    expect(topReason(item({ target_type: "deal", reasons: {} }))).toBe(
      "ad_false",
    );
  });

  it("구역 수와 오늘(KST) 처리한 것", () => {
    expect(sectionCounts(undefined).reviews).toBeNull();
    const log = [
      logRowSchema.parse({
        id: "1",
        created_at: "2026-10-31T15:30:00+00:00", // KST 11월 1일 00:30
        action: "review_hide",
        target_type: "review",
        target_id: "r1",
        target_place_id: "1",
        target_user_id: null,
        target_nickname: null,
        reason: "spam",
        duration: null,
        by_system: false,
        admin_nickname: "운영자",
        reverted_at: null,
        undoable: true,
      }),
      logRowSchema.parse({
        id: "2",
        created_at: "2026-10-31T14:30:00+00:00", // KST 10월 31일 23:30
        action: "review_restore",
        target_type: "review",
        target_id: "r2",
        target_place_id: "1",
        target_user_id: null,
        target_nickname: null,
        reason: null,
        duration: null,
        by_system: false,
        admin_nickname: "운영자",
        reverted_at: null,
        undoable: true,
      }),
    ];
    const now = new Date("2026-11-01T03:00:00+00:00");
    expect(todaysEntries(log, now).map((e) => e.id)).toEqual(["1"]);
    expect(formatKstDateTime("2026-10-31T15:30:00+00:00")).toBe(
      "11월 1일 00:30",
    );
  });
});

describe("베타 의견 (T9.4)", () => {
  const base = {
    id: UUID,
    author_no: 3,
    category: "bug",
    body: "득표 바가 비어 보였습니다.",
    route: "/poll/[code]",
    app_version: "0.1.0",
    algo_version: "2026-11-01.1",
    device: "ios",
    in_app: true,
    standalone: false,
    created_at: "2026-11-02T03:00:00+00:00",
  };
  it("함수 행을 화면 모양으로. 닉네임, 사용자 id 열은 없다", () => {
    const r = betaFeedbackRowSchema.parse(base);
    expect(r).toMatchObject({ authorNo: 3, category: "bug", inApp: true });
    expect(Object.keys(r)).not.toContain("userId");
    expect(betaFeedbackRowSchema.safeParse({ ...base, category: null }).success).toBe(true);
    expect(betaFeedbackRowSchema.safeParse({ ...base, device: "other" }).success).toBe(false);
  });
  it("종류 필터: 전체, 종류, 종류 없음", () => {
    const items = [
      betaFeedbackRowSchema.parse(base),
      betaFeedbackRowSchema.parse({ ...base, id: "b", category: "good" }),
      betaFeedbackRowSchema.parse({ ...base, id: "c", category: null }),
    ];
    expect(filterBetaFeedback(items, "all")).toHaveLength(3);
    expect(filterBetaFeedback(items, "good").map((i) => i.id)).toEqual(["b"]);
    expect(filterBetaFeedback(items, "none").map((i) => i.id)).toEqual(["c"]);
  });
  it("베타 의견 구역은 검토 대기 수가 없다(읽음 처리 없음)", () => {
    expect(sectionCounts(undefined).beta).toBeNull();
  });
});

/* ---------- 메뉴 제보 (T10.16f) ---------- */

function flaggedRow(over: Record<string, unknown> = {}) {
  return {
    place_id: "111",
    menu_key: "차슈덮밥",
    menu_name: "차슈덮밥",
    report_count: 4,
    median_krw: 3000,
    lo_krw: 1000,
    hi_krw: 9500,
    last_at: "2026-11-03T03:00:00Z",
    variants: [{ name: "차슈덮밥", count: 4 }],
    auto_hidden: true,
    flags: { false: 2, abuse: 1, privacy: 9 },
    flag_count: 3,
    first_flag_at: "2026-11-03T03:10:00Z",
    others: [{ key: "제육", name: "제육", count: 1 }],
    ...over,
  };
}
function suggestionRow(over: Record<string, unknown> = {}) {
  return {
    place_id: "111",
    from_key: "제육",
    from_name: "제육",
    from_count: 1,
    from_median: 9000,
    to_key: "제육볶음",
    to_name: "제육볶음",
    to_count: 2,
    to_median: 9200,
    to_last_at: "2026-11-03T03:00:00Z",
    why: "contains",
    ...over,
  };
}

describe("메뉴 제보 큐 (T10.16f, MENU-05)", () => {
  it("신고 줄: 모르는 사유는 버리고, 집계가 없으면 이름은 키로", () => {
    const f = menuFlaggedRowSchema.parse(flaggedRow());
    expect(f).toMatchObject({ kind: "flag", key: "menu:111/차슈덮밥", autoHidden: true });
    expect(f.flags).toEqual({ false: 2, abuse: 1 });
    const gone = menuFlaggedRowSchema.parse(
      flaggedRow({ menu_name: null, report_count: null, median_krw: null, lo_krw: null, hi_krw: null, last_at: null }),
    );
    expect(gone).toMatchObject({ name: "차슈덮밥", reportCount: 0, medianKrw: null });
  });

  it("큐는 신고 줄 다음 합치기 후보, 같은 옛 줄이면 신고 쪽만", () => {
    const flag = menuFlaggedRowSchema.parse(flaggedRow({ menu_key: "제육", menu_name: "제육" }));
    const other = menuFlaggedRowSchema.parse(flaggedRow());
    const s = menuSuggestionRowSchema.parse(suggestionRow());
    const s2 = menuSuggestionRowSchema.parse(
      suggestionRow({ from_key: "돈꼬츠라멘", from_name: "돈꼬츠라멘", to_key: "돈코츠라멘", to_name: "돈코츠라멘", why: "typo" }),
    );
    expect(menuQueue([other, flag], [s, s2]).map((i) => i.key)).toEqual([
      "menu:111/차슈덮밥",
      "menu:111/제육",
      "menu:111/돈꼬츠라멘",
    ]);
  });

  it("입력: 공백 있는 키, 같은 키 합치기, 모르는 결과는 받지 않는다", () => {
    expect(decideMenuInput.safeParse({ placeId: "111", menuKey: "제육", result: "hide" }).success).toBe(true);
    expect(decideMenuInput.safeParse({ placeId: "111", menuKey: "제육 볶음", result: "hide" }).success).toBe(false);
    expect(decideMenuInput.safeParse({ placeId: "111", menuKey: "제육", result: "restore" }).success).toBe(false);
    expect(mergeMenuInput.safeParse({ placeId: "111", from: "제육", to: "제육" }).success).toBe(false);
    expect(mergeMenuInput.safeParse({ placeId: "x", from: "제육", to: "제육볶음" }).success).toBe(false);
  });

  it("처리 이력: 메뉴 처리는 키와 함께, 되돌리면 그 줄이 다시 보이게 키를 돌려준다", () => {
    const l = logRowSchema.parse({
      id: UUID,
      created_at: "2026-11-03T03:00:00Z",
      action: "menu_merge",
      target_type: "menu",
      target_id: null,
      target_place_id: "111",
      target_user_id: null,
      target_nickname: null,
      reason: null,
      duration: null,
      by_system: false,
      admin_nickname: "운영자",
      reverted_at: null,
      undoable: true,
      target_menu_key: "제육",
    });
    expect(l.targetMenuKey).toBe("제육");
    expect(hiddenKeyOfLog(l)).toBe("menu:111/제육");
    expect(adminCopy.log.actions[l.action]).toBe("메뉴 합치기");
  });
});
