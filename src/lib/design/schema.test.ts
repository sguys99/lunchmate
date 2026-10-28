import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import {
  APP_COLOR_KEYS,
  CATEGORY_SLUGS,
  SHADCN_COLOR_KEYS,
  designFrontmatterSchema,
  missingBodySections,
  parseDesignDoc,
  parseOklch,
  splitDesignDoc,
} from "./schema";

const TEMPLATE = path.resolve(
  process.cwd(),
  "docs/design/candidates/_template.DESIGN.md",
);
const source = readFileSync(TEMPLATE, "utf8");
const tokensCss = readFileSync(
  path.resolve(process.cwd(), "src/styles/tokens.css"),
  "utf8",
);

/** 템플릿 프런트매터를 깊은 복사해서 한 군데만 바꿔 보는 도우미. */
function mutate(fn: (fm: Record<string, unknown>) => void): unknown {
  const { frontmatter } = splitDesignDoc(source);
  const copy = structuredClone(frontmatter) as Record<string, unknown>;
  fn(copy);
  return copy;
}

function at(obj: unknown, ...keys: string[]): Record<string, unknown> {
  let cur: unknown = obj;
  for (const k of keys) cur = (cur as Record<string, unknown>)[k];
  return cur as Record<string, unknown>;
}

describe("_template.DESIGN.md", () => {
  it("프런트매터가 스키마를 통과하고 본문 섹션이 모두 있다", () => {
    const { tokens, body } = parseDesignDoc(source);
    expect(tokens.meta.status).toBe("template");
    expect(missingBodySections(body)).toEqual([]);
  });

  it("라이트/다크 모두 shadcn, 앱, 카테고리 색을 빠짐없이 가진다", () => {
    const { tokens } = parseDesignDoc(source);
    for (const theme of [tokens.color.light, tokens.color.dark]) {
      expect(Object.keys(theme.shadcn).sort()).toEqual(
        [...SHADCN_COLOR_KEYS].sort(),
      );
      expect(Object.keys(theme.app).sort()).toEqual([...APP_COLOR_KEYS].sort());
      expect(Object.keys(theme.category).sort()).toEqual(
        [...CATEGORY_SLUGS].sort(),
      );
    }
  });

  it("shadcn 색 기본값은 현재 tokens.css와 같다 (임시 토큰과 어긋나지 않음)", () => {
    const { tokens } = parseDesignDoc(source);
    const [lightBlock = "", darkBlock = ""] = [
      /:root\s*\{([\s\S]*?)\}/.exec(tokensCss)?.[1],
      /\.dark\s*\{([\s\S]*?)\}/.exec(tokensCss)?.[1],
    ];
    const read = (block: string, key: string) =>
      new RegExp(`--${key}:\\s*([^;]+);`).exec(block)?.[1]?.trim();
    for (const key of SHADCN_COLOR_KEYS) {
      expect(tokens.color.light.shadcn[key], `light ${key}`).toBe(
        read(lightBlock, key),
      );
      expect(tokens.color.dark.shadcn[key], `dark ${key}`).toBe(
        read(darkBlock, key),
      );
    }
    expect(`${tokens.radius.base}rem`).toBe(read(lightBlock, "radius"));
  });
});

describe("designFrontmatterSchema 거부 규칙", () => {
  const fails = (data: unknown) =>
    designFrontmatterSchema.safeParse(data).success === false;

  it("shadcn 색 키가 하나라도 빠지면 실패", () => {
    expect(
      fails(mutate((fm) => delete at(fm, "color", "dark", "shadcn")["ring"])),
    ).toBe(true);
  });

  it("모르는 키가 있으면 실패 (오타 방지)", () => {
    expect(
      fails(
        mutate(
          (fm) =>
            (at(fm, "color", "light", "app")["sucess"] = "oklch(0.5 0.1 150)"),
        ),
      ),
    ).toBe(true);
  });

  it("hex 색은 실패", () => {
    expect(
      fails(
        mutate(
          (fm) => (at(fm, "color", "light", "shadcn")["primary"] = "#c0583a"),
        ),
      ),
    ).toBe(true);
  });

  it("그림자에 rgba를 쓰면 실패", () => {
    expect(
      fails(
        mutate(
          (fm) =>
            (at(fm, "shadow", "light")["md"] = "0 2px 8px rgba(0,0,0,.1)"),
        ),
      ),
    ).toBe(true);
  });

  it("필수 대비 쌍을 빼면 실패", () => {
    expect(
      fails(
        mutate((fm) => {
          fm["contrastPairs"] = (
            fm["contrastPairs"] as { fg: string }[]
          ).filter((p) => p.fg !== "muted-foreground");
        }),
      ),
    ).toBe(true);
  });

  it("카테고리 대비 쌍을 빼면 실패", () => {
    expect(
      fails(
        mutate((fm) => {
          fm["contrastPairs"] = (
            fm["contrastPairs"] as { fg: string }[]
          ).filter((p) => p.fg !== "cat-pub-ink");
        }),
      ),
    ).toBe(true);
  });

  it("무드 키워드가 3개가 아니면 실패", () => {
    expect(
      fails(mutate((fm) => (at(fm, "meta")["mood"] = ["따뜻한", "편안한"]))),
    ).toBe(true);
  });

  it("세리프 제목은 시안 B에서만 허용", () => {
    const serif = (id: string) =>
      mutate((fm) => {
        at(fm, "meta")["id"] = id;
        at(fm, "font", "heading")["kind"] = "serif";
      });
    expect(fails(serif("a"))).toBe(true);
    expect(fails(serif("b"))).toBe(false);
  });

  it("duration 순서가 fast < base < slow가 아니면 실패", () => {
    expect(
      fails(mutate((fm) => (at(fm, "motion", "duration")["fast"] = 400))),
    ).toBe(true);
  });

  it("일러스트 팔레트 참조가 풀리지 않으면 실패", () => {
    expect(
      fails(
        mutate(
          (fm) =>
            (at(fm, "illustration", "palette")["ink"] = "cat-{slug}-line"),
        ),
      ),
    ).toBe(true);
  });
});

describe("parseOklch", () => {
  it("알파 표기 두 가지를 읽는다", () => {
    expect(parseOklch("oklch(0.94 0.01 85 / 12%)")?.alpha).toBeCloseTo(0.12);
    expect(parseOklch("oklch(0.94 0.01 85 / 0.5)")?.alpha).toBe(0.5);
  });
  it("범위를 벗어나면 null", () => {
    expect(parseOklch("oklch(1.2 0.1 40)")).toBeNull();
    expect(parseOklch("oklch(52% 0.1 40)")).toBeNull();
  });
});

describe("대비 쌍의 알파 색", () => {
  it("알파가 있는 색(border 다크)을 대비 쌍에 넣으면 실패", () => {
    const data = mutate((fm) => {
      (fm["contrastPairs"] as unknown[]).push({
        fg: "border",
        bg: "background",
        min: 3,
      });
    });
    expect(designFrontmatterSchema.safeParse(data).success).toBe(false);
  });
});

describe("카테고리 slug 동기화", () => {
  it("도메인 카테고리 정의(src/features/place/categories.ts)와 같다", async () => {
    const domain = await import("@/features/place/categories");
    expect(CATEGORY_SLUGS).toEqual([...domain.CATEGORY_SLUGS]);
  });
});
