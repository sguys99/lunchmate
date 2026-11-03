// AC-MENU-2 (T10.16, PRD MENU): 메뉴 제보는 추천 점수와 하드 필터에 쓰지 않는다.
// 추천 함수와 엔진이 메뉴 모듈, 메뉴 테이블, 집계 함수를 읽지 않음을 소스로 확인한다(할인 미반영 AC-DEAL-2와 같은 방식의 경계 검사).
// 홈 카드 대표 메뉴는 화면(TodayHero)만 받고, 엔진 입력(toCandidates, statsLookup)에는 place_stats 행만 들어간다.
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const root = process.cwd();

function sources(dir: string): string[] {
  return readdirSync(join(root, dir), { withFileTypes: true }).flatMap((e) => {
    const p = join(dir, e.name);
    if (e.isDirectory()) return sources(p);
    return /\.tsx?$/.test(e.name) && !/\.test\.tsx?$/.test(e.name) ? [p] : [];
  });
}

const FORBIDDEN = /features\/menu|menu_reports|place_menus|CardMenu|MenuStat/;

describe("AC-MENU-2 메뉴 제보는 추천에 쓰지 않는다", () => {
  it("src/lib/reco는 메뉴 모듈과 집계를 읽지 않는다", () => {
    for (const f of sources("src/lib/reco")) {
      expect(readFileSync(join(root, f), "utf8"), f).not.toMatch(FORBIDDEN);
    }
  });

  it("오늘(홈) 엔진 조립 파일(engine, candidates, place-stats)도 메뉴를 읽지 않는다", () => {
    for (const f of [
      "src/features/rec/engine.ts",
      "src/features/rec/candidates.ts",
      "src/features/rec/place-stats.ts",
    ]) {
      expect(readFileSync(join(root, f), "utf8"), f).not.toMatch(FORBIDDEN);
    }
  });

  it("홈 화면은 메뉴를 카드에만 넘긴다(statsLookup에는 rows만)", () => {
    const screen = readFileSync(
      join(root, "src/features/rec/today-screen.tsx"),
      "utf8",
    );
    expect(screen).toMatch(/engine\.statsLookup\(statsRows\)/);
    expect(screen).not.toMatch(/statsLookup\([^)]*menus/);
  });
});
