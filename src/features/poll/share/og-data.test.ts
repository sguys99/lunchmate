import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

const { formatDeadline, toPollOg } = await import("./og-data");
const { buildPollMetadata } = await import("./metadata");

// 2026-11-05(목) 11:00 KST
const now = new Date("2026-11-05T02:00:00Z");
const base = {
  status: "open",
  kind: "lunch",
  title: "목요일 점심",
  closes_at: "2026-11-05T03:30:00Z", // 12:30 KST
  candidates: [{}, {}, {}],
};

describe("formatDeadline (KST)", () => {
  it("오늘이면 시각만, 다른 날이면 날짜를 붙인다", () => {
    expect(formatDeadline(new Date("2026-11-05T03:30:00Z"), now)).toBe("12:30");
    expect(formatDeadline(new Date("2026-11-06T09:00:00Z"), now)).toBe(
      "11월 6일 18:00",
    );
  });
});

describe("toPollOg (T7.14, POLL-04)", () => {
  it("진행 중: 제목, 후보 수, 마감, 버전", () => {
    const og = toPollOg(base, now);
    expect(og).toMatchObject({
      state: "open",
      kind: "lunch",
      title: "목요일 점심",
      candidateCount: 3,
      deadline: "12:30",
      voters: null,
      topVotes: null,
    });
  });

  it("없음, 만료, 취소는 열 수 없음", () => {
    expect(toPollOg(null, now).state).toBe("unavailable");
    expect(toPollOg({ status: "expired" }, now).state).toBe("unavailable");
    expect(toPollOg({ ...base, status: "canceled" }, now).state).toBe(
      "unavailable",
    );
  });

  it("서버 글꼴 밖 글자가 있는 제목은 끼니별 기본 문구 (D-17 안건 4)", () => {
    const og = toPollOg({ ...base, kind: "party", title: "똠양꿍 회식" }, now);
    expect(og.state !== "unavailable" && og.title).toBe("회식 투표");
    expect(og.state !== "unavailable" && og.rawTitle).toBe("똠양꿍 회식");
  });

  it("확정된 방만 득표 숫자를 쓴다", () => {
    const closed = toPollOg(
      { ...base, status: "closed", voted_count: 5, top_votes: 3 },
      now,
    );
    expect(closed).toMatchObject({ state: "closed", voters: 5, topVotes: 3 });
    const tie = toPollOg({ ...base, status: "tie", voted_count: 5 }, now);
    expect(tie).toMatchObject({ state: "open", voters: null });
  });

  it("상태가 바뀌면 버전이 바뀐다 (D-17 안건 7)", () => {
    const a = toPollOg(base, now);
    const b = toPollOg({ ...base, candidates: [{}, {}, {}, {}] }, now);
    const c = toPollOg(
      { ...base, status: "closed", voted_count: 5, top_votes: 3 },
      now,
    );
    const v = (o: ReturnType<typeof toPollOg>) =>
      o.state === "unavailable" ? null : o.version;
    expect(v(a)).not.toBe(v(b));
    expect(v(a)).not.toBe(v(c));
    expect(v(a)).toBe(v(toPollOg(base, now)));
  });
});

describe("buildPollMetadata", () => {
  const code = "4vdvm3887pr7";

  it("초대: 제목, 설명, 버전 붙은 og:image, 식당 이름 없음", () => {
    const og = toPollOg(base, now);
    const m = buildPollMetadata(code, "invite", og);
    expect(m.title).toBe("목요일 점심 투표");
    expect(m.description).toBe(
      "후보 3곳 중에서 골라 주세요. 12:30에 마감합니다.",
    );
    const img = (m.openGraph?.images as { url: string; width: number }[])[0]!;
    expect(img.url).toMatch(
      /^\/api\/og\/poll\/4vdvm3887pr7\?img=invite&v=[0-9a-z]+$/,
    );
    expect(img.width).toBe(1200);
    expect(m.robots).toMatchObject({ index: false });
  });

  it("결과 링크: 확정 숫자가 있으면 설명에, 없으면 기본 설명", () => {
    const counted = buildPollMetadata(
      code,
      "result",
      toPollOg(
        { ...base, status: "closed", voted_count: 5, top_votes: 3 },
        now,
      ),
    );
    expect(counted.title).toBe("목요일 점심, 정해졌어요");
    expect(counted.description).toBe("5명이 참여했고 1위는 3표입니다.");
    expect(counted.openGraph?.url).toBe("/poll/4vdvm3887pr7/result");

    const bare = buildPollMetadata(
      code,
      "result",
      toPollOg({ ...base, status: "closed" }, now),
    );
    expect(bare.description).toBe(
      "투표 결과를 런치메이트에서 확인할 수 있습니다.",
    );
  });

  it("열 수 없는 방은 버전 없는 이미지와 안내", () => {
    const m = buildPollMetadata(code, "invite", { state: "unavailable" });
    expect(m.title).toBe("런치메이트 투표");
    const img = (m.openGraph?.images as { url: string }[])[0]!;
    expect(img.url).toBe("/api/og/poll/4vdvm3887pr7?img=invite");
  });
});
