import { describe, expect, it } from "vitest";
import { shareCopy } from "@/copy/share";
import { isOgDrawable } from "./ks-x-1001";
import {
  OG_INVITE_TAIL,
  OG_RESULT_TAIL,
  OG_SIZE,
  POLL_OG_FIXED_TEXTS,
  ogLabel,
  ogTitleSize,
} from "./og-art";
import type { PollOg } from "./og-data";

type Live = Extract<PollOg, { state: "open" | "closed" }>;

const base: Live = {
  state: "open",
  kind: "lunch",
  title: "목요일 점심",
  rawTitle: "목요일 점심",
  candidateCount: 3,
  deadline: "12:30",
  voters: null,
  topVotes: null,
  version: "t",
};

describe("투표 OG 그림 (T7.14, D-30 랜딩 B 구도)", () => {
  it("1200 x 600(카카오 2:1)", () => {
    expect(OG_SIZE).toEqual({ width: 1200, height: 600 });
  });

  it("행동 유도 꼬리는 지금 문구에서 제목만 뗀 것이다", () => {
    expect(`목요일 점심, ${OG_INVITE_TAIL}`).toBe(
      shareCopy.og.inviteHeadline("목요일 점심"),
    );
    expect(`목요일 점심, ${OG_RESULT_TAIL}`).toBe(
      shareCopy.og.resultHeadline("목요일 점심"),
    );
  });

  it("제목 길이에 따라 76, 66, 56으로 줄인다(20자도 두 줄)", () => {
    expect(ogTitleSize("목요일 점심")).toBe(76);
    expect(ogTitleSize("우리 팀 목요일 점심")).toBe(66);
    expect(ogTitleSize("디자인1팀 금요일 송년회 장소 정하기")).toBe(56);
  });

  it("오른쪽 위 라벨: 초대는 종류, 결과는 결과 라벨", () => {
    expect(ogLabel(base, "invite")).toBe("점심 투표");
    expect(ogLabel({ ...base, kind: "party" }, "invite")).toBe("회식 투표");
    expect(ogLabel({ ...base, state: "closed" }, "result")).toBe("점심 결과");
    // 아직 결과가 없는 방의 결과 링크는 초대 그림이라 초대 라벨
    expect(ogLabel(base, "result")).toBe("점심 투표");
  });

  it("제목이 기본 문구로 바뀐 방은 라벨을 숨긴다(D-30 안건 3)", () => {
    const fallback: Live = {
      ...base,
      title: shareCopy.og.fallbackTitle.lunch,
      rawTitle: "금요일 점심 🍜",
    };
    expect(ogLabel(fallback, "invite")).toBe("");
    expect(ogLabel({ ...fallback, state: "closed" }, "result")).toBe("");
  });

  it("이미지 안 고정 글은 서버 OG 글꼴(KS X 1001)로 그릴 수 있다", () => {
    for (const t of POLL_OG_FIXED_TEXTS) expect(isOgDrawable(t)).toBe(true);
  });
});
