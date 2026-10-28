import { describe, expect, it } from "vitest";
import {
  HAEYO_RATIO_RANGE,
  MIN_SENTENCES,
  PLACEHOLDER,
  buildToneReport,
  classifyTone,
  extractCopyTexts,
  formatToneReport,
  isTermsFile,
  splitSentences,
} from "./tone";

const H = "다시 시도합니다."; // 습니다체 한 문장
const Y = "넓혀볼까요?"; // 해요체 한 문장

/** 해요체 y개, 습니다체 h개로 이루어진 문구 목록 */
const texts = (y: number, h: number) => [
  ...Array<string>(y).fill(Y),
  ...Array<string>(h).fill(H),
];

describe("문장 문체 판정", () => {
  it.each([
    ["식당 정보를 불러오지 못했습니다.", "hamnida"],
    ["투표가 마감되었습니다!", "hamnida"],
    ["인터넷에 연결되어 있지 않습니다", "hamnida"],
    ["정말 삭제하시겠습니까?", "hamnida"],
    ["잠시 기다려 주십시오.", "hamnida"],
    ["어제 간 정담국밥, 어땠어요?", "haeyo"],
    ["오늘 점심은 여기로 정했어요!", "haeyo"],
    ["15분까지 넓혀볼까요?", "haeyo"],
    ["다시 시도해 주세요.", "haeyo"],
    ["괜찮죠?", "haeyo"],
    ["좋았어요 🙂", "haeyo"],
    ["“정했어요”", "haeyo"],
    ["길찾기", "noun"],
    ["도보 약 4분", "noun"],
    ["투표 만들기", "noun"],
    ["위치 권한 필요", "noun"],
    ["중요", "noun"],
    [`${PLACEHOLDER}분 전`, "noun"],
  ])("%s → %s", (s, tone) => {
    expect(classifyTone(s)).toBe(tone);
  });
});

describe("문장 나누기", () => {
  it("문장부호 뒤 공백과 줄바꿈에서 자른다", () => {
    expect(
      splitSentences(
        "도보 10분 안에 식당이 없습니다. 15분까지 넓혀볼까요?\n다시 시도",
      ),
    ).toEqual([
      "도보 10분 안에 식당이 없습니다.",
      "15분까지 넓혀볼까요?",
      "다시 시도",
    ]);
  });

  it("소수점과 주소 속 마침표, 물음표는 자르지 않는다", () => {
    expect(
      splitSentences("1.2만 원대입니다. ?state=loading 처럼 씁니다."),
    ).toEqual(["1.2만 원대입니다.", "?state=loading 처럼 씁니다."]);
  });
});

describe("문구 추출", () => {
  it("문자열, 템플릿을 뽑고 주석, 키, import 경로, 타입은 뺀다", () => {
    const src = [
      `import { x } from "./a";`,
      `type Meal = "lunch" | "dinner";`,
      `// 주석 문장입니다.`,
      `export const c = {`,
      `  "quoted-key": "라벨",`,
      `  title: "불러오지 못했습니다",`,
      `  /** 문서 주석입니다. */`,
      `  body: (n: number) => \`\${n}분까지 넓혀볼까요?\`,`,
      `  plain: \`그대로입니다.\`,`,
      `  pick: (ok: boolean) => \`결과: \${ok ? "좋아요" : "별로예요"}\`,`,
      `} as const;`,
    ].join("\n");
    expect(extractCopyTexts("src/copy/a.ts", src)).toEqual([
      "라벨",
      "불러오지 못했습니다",
      `${PLACEHOLDER}분까지 넓혀볼까요?`,
      "그대로입니다.",
      `결과: ${PLACEHOLDER}`,
      "좋아요",
      "별로예요",
    ]);
  });

  it("JSON 문구 파일은 문자열 값만 뽑는다", () => {
    expect(
      extractCopyTexts(
        "src/copy/a.json",
        `{"a": "없습니다.", "b": ["어때요?", 3], "c": {"d": "길찾기"}}`,
      ),
    ).toEqual(["없습니다.", "어때요?", "길찾기"]);
  });
});

describe("비율 리포트", () => {
  it("명사형은 비율에서 빼고 따로 센다", () => {
    const r = buildToneReport("src/copy/home.ts", [
      ...texts(3, 7),
      "길찾기",
      "다시 시도",
    ]);
    expect(r).toMatchObject({
      haeyo: 3,
      hamnida: 7,
      excluded: 2,
      haeyoRatio: 0.3,
      withinRange: true,
      status: "ok",
    });
  });

  it("한 문구 안 여러 문장을 각각 센다", () => {
    const r = buildToneReport("src/copy/a.ts", [`${H} ${Y}`]);
    expect([r.haeyo, r.hamnida]).toEqual([1, 1]);
  });

  it.each([
    // [해요체, 습니다체, 기대 상태]  경계값 25%, 40%는 범위 안
    [1, 3, "insufficient"], // 4문장: 표본 부족
    [0, 4, "insufficient"],
    [1, 4, "out-of-range"], // 20%, 5문장부터 판정
    [2, 6, "ok"], // 25%
    [4, 6, "ok"], // 40%
    [2, 7, "out-of-range"], // 22%
    [5, 7, "out-of-range"], // 42%
    [0, 10, "out-of-range"], // 0%
    [10, 0, "out-of-range"], // 100%
  ] as const)("해요체 %i, 습니다체 %i → %s", (y, h, status) => {
    expect(buildToneReport("src/copy/a.ts", texts(y, h)).status).toBe(status);
  });

  it("허용 범위와 최소 표본 상수", () => {
    expect(HAEYO_RATIO_RANGE).toEqual({ min: 0.25, max: 0.4 });
    expect(MIN_SENTENCES).toBe(5);
  });

  it("대상 문장이 없으면 비율 null, 표본 부족", () => {
    const r = buildToneReport("src/copy/a.ts", ["길찾기", "투표"]);
    expect(r).toMatchObject({
      haeyoRatio: null,
      withinRange: null,
      status: "insufficient",
      excluded: 2,
    });
  });

  it("약관 파일은 해요체가 하나라도 있으면 경고", () => {
    expect(isTermsFile("src/copy/terms.ts")).toBe(true);
    expect(isTermsFile("src/copy/privacy-policy.ts")).toBe(true);
    expect(isTermsFile("src/copy/home.ts")).toBe(false);
    expect(buildToneReport("src/copy/terms.ts", texts(0, 2)).status).toBe("ok");
    expect(buildToneReport("src/copy/terms.ts", texts(1, 20)).status).toBe(
      "terms-haeyo",
    );
  });
});

describe("리포트 출력", () => {
  it("범위 안은 비율만, 범위 밖은 경고 접두", () => {
    expect(
      formatToneReport(buildToneReport("src/copy/a.ts", texts(3, 7))),
    ).toBe(
      "  src/copy/a.ts  해요체 30%  (해요체 3, 습니다체 7, 명사형 제외 0)",
    );
    expect(
      formatToneReport(buildToneReport("src/copy/a.ts", texts(0, 10))),
    ).toMatch(/^경고 src\/copy\/a\.ts {2}해요체 0%, 허용 범위 25~40% 밖/);
  });

  it("표본 부족 표시", () => {
    expect(
      formatToneReport(buildToneReport("src/copy/a.ts", texts(1, 1))),
    ).toContain("표본 부족 해요체 50%");
  });
});
