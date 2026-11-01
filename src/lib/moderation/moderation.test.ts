import { describe, expect, it, vi } from "vitest";
import * as z from "zod";

vi.mock("server-only", () => ({}));

const {
  containsBannedContent,
  hasBannedIssue,
  hasBannedWord,
  hasContactOrLink,
  withoutBannedContent,
} = await import("./index");
const { composeJamo, mergeStretch, collapseRepeats, normalizeTokens } =
  await import("./normalize");
const lists = await import("./banned-words");

describe("정규화", () => {
  it("풀어 쓴 자모를 음절로 모은다", () => {
    expect(composeJamo("ㅅㅣㅂㅏㄹ")).toBe("시발");
    expect(composeJamo("ㅅㅂ")).toBe("ㅅㅂ");
    expect(composeJamo("ㄱㅏㅂㅏ")).toBe("가바");
  });
  it("소리 늘이기를 합친다", () => {
    expect(mergeStretch("씨이이발")).toBe("씨발");
    expect(mergeStretch("시바알")).toBe("시발");
    expect(mergeStretch("아이")).toBe("아이");
  });
  it("반복 글자를 합친다", () => {
    expect(collapseRepeats("ㅋㅋㅋㅋ")).toBe("ㅋ");
  });
  it("한 글자 낱말 덩어리만 붙인다", () => {
    expect(normalizeTokens("시 발 놈").hangul).toEqual(["시발놈"]);
    expect(normalizeTokens("역시 발이 빠르다").hangul).toEqual([
      "역시",
      "발이",
      "빠르다",
    ]);
  });
});

describe("금칙어: 걸러야 하는 말", () => {
  it.each([
    "씨발",
    "시발 진짜",
    "시.발",
    "시*발",
    "시1발",
    "시 발",
    "씨이이발",
    "시바알",
    "ㅅㅣㅂㅏㄹ",
    "ㅅㅂ 별로",
    "ㅆ발",
    "ㅂㅅ같은 집",
    "병 신",
    "병-신",
    "미친 놈이 운영함",
    "개 새 끼",
    "개새끼들",
    "존나 맛없음",
    "지랄하네",
    "ㅈㄹ",
    "18놈",
    "fuck",
    "f u c k",
    "f*ck",
    "FUCK",
    "ｆｕｃｋ",
    "sh1t",
    "tlqkf",
    "한남충",
    "틀딱들",
    "섹스",
    "오픈 채팅으로 오세요",
    "오픈카톡 주세요",
    "텔레그램 문의",
    "토토사이트 추천",
    "씨​발",
    // T8.15 보강
    "슬롯 사이트 추천",
    "사설토토 가입",
    "주식 리딩방 무료",
    "재택알바 구함",
    "제휴 문의는 디엠",
  ])("%s", (text) => {
    expect(containsBannedContent(text)).toBe(true);
  });
});

describe("금칙어: 걸리면 안 되는 말 (오탐 방지)", () => {
  it.each([
    "시발점이 된 가게",
    "시발역 근처",
    "수박씨 발라 먹기",
    "수박씨발라먹기",
    "포도 씨발라내고 드세요",
    "역시 발 빠르게 나와요",
    "역시발 빠른 서빙",
    "미친 맛이에요",
    "고기가 잘 씹혀요",
    "새끼손가락만 한 새우",
    "보지 마세요 그냥 가세요",
    "자지 말고 일찍 오세요",
    "걸레 냄새가 나요",
    "불이 꺼져 있었어요",
    "홍어삼합 최고",
    "생강간장 소스가 맛있어요",
    "3개년 연속 맛집",
    "언니거 시켰는데 맛있었어요",
    "언니 엄마랑 갔어요",
    "가격 12,000원 15,000원",
    "1인 9000원 2인 18000원",
    "2026.11.01 방문",
    "11:30~13:00 웨이팅",
    "시바견 데려와도 돼요",
    "shiitake pasta",
    "class assignment",
    "사이다 2병, 신라면",
    "아이랑 가기 좋아요",
    "ㅋㅋㅋ 존맛",
    "점심 특선 9천 원",
    // T8.15 보강 오탐 확인
    "파스타 양이 볼 만해요",
    "알바생이 친절해요",
    "제휴카드 할인돼요",
    "사설 주차장 이용",
    "리딩 램프 있는 창가",
  ])("%s", (text) => {
    expect(containsBannedContent(text)).toBe(false);
  });
});

describe("연락처와 링크", () => {
  it.each([
    "010-1234-5678",
    "010 1234 5678",
    "0 1 0 1 2 3 4 5 6 7 8",
    "01012345678",
    "02-123-4567",
    "공일공 일이삼사 오육칠팔",
    "1588-1234",
    "https://example.com",
    "www.example.com",
    "naver . com",
    "open.kakao.com/o/abc",
    "abc@example.com",
    "t.me/abcd",
  ])("%s", (text) => {
    expect(hasContactOrLink(text)).toBe(true);
  });
  it.each(["1만 2천 원", "12000 15000", "1,500원 2,000원", "3.5점"])(
    "%s는 연락처가 아니다",
    (text) => {
      expect(hasContactOrLink(text)).toBe(false);
    },
  );
});

describe("목록 규칙", () => {
  const all = [
    ...lists.BANNED_HANGUL,
    ...lists.BANNED_JAMO,
    ...lists.BANNED_MIXED,
    ...lists.BANNED_LATIN,
  ];
  it("100~200개 범위이고 겹치지 않는다(D-13)", () => {
    expect(all.length).toBeGreaterThanOrEqual(100);
    expect(all.length).toBeLessThanOrEqual(200);
    expect(new Set(all).size).toBe(all.length);
  });
  it("모든 항목은 정규화된 모양이라 자기 자신이 걸린다", () => {
    for (const w of all) expect(hasBannedWord(w), w).toBe(true);
  });
});

describe("zod 연결", () => {
  const schema = z.strictObject({ body: withoutBannedContent(z.string()) });
  it("금칙어면 banned issue", () => {
    const r = schema.safeParse({ body: "시발" });
    expect(r.success).toBe(false);
    if (!r.success) expect(hasBannedIssue(r.error)).toBe(true);
  });
  it("형식 오류는 banned가 아니다", () => {
    const r = schema.safeParse({ body: 3 });
    expect(r.success).toBe(false);
    if (!r.success) expect(hasBannedIssue(r.error)).toBe(false);
  });
  it("깨끗한 글은 통과", () => {
    expect(schema.safeParse({ body: "국물이 진해요" }).success).toBe(true);
  });
});
