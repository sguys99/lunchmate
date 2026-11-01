// POLL-13 기피 경고는 Postgres 보안 함수가 판정한다(참여자 avoid_rules는 본인만 읽기).
// 그 키워드 표(private.avoid_keywords)가 추천 필터의 TS 표(src/lib/reco/avoid-match.ts)와 같은지 확인한다.
// TS 표를 바꾸면 이 테스트가 실패한다. 새 마이그레이션으로 키워드 표를 다시 채우고, 아래 MIGRATIONS에 그 파일을 더한다.
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

import {
  ALLERGY_RULES,
  FOOD_RULES,
  normalizeText,
  type AvoidMatcher,
} from "@/lib/reco/avoid-match";

const MIGRATIONS = ["20261101140000_t7_6_polls.sql"];

function sqlRows(): Set<string> {
  const rows = new Set<string>();
  for (const f of MIGRATIONS) {
    const sql = readFileSync(
      join(process.cwd(), "supabase/migrations", f),
      "utf8",
    );
    const block =
      sql
        .split("-- avoid-keywords:begin")[1]
        ?.split("-- avoid-keywords:end")[0] ?? "";
    for (const m of block.matchAll(
      /\('(food|allergy)', '([^']+)', '(category|exact|name)', '([^']+)'\)/g,
    )) {
      rows.add(`${m[1]}|${m[2]}|${m[3]}|${m[4]}`);
    }
  }
  return rows;
}

function tsRows(): Set<string> {
  const rows = new Set<string>();
  const sets: [string, Record<string, AvoidMatcher>][] = [
    ["food", FOOD_RULES],
    ["allergy", ALLERGY_RULES],
  ];
  for (const [set, table] of sets) {
    for (const [value, m] of Object.entries(table)) {
      const fields: [string, readonly string[]][] = [
        ["category", m.category],
        ["exact", m.categoryExact ?? []],
        ["name", m.name],
      ];
      for (const [field, list] of fields) {
        for (const k of list)
          rows.add(`${set}|${value}|${field}|${normalizeText(k)}`);
      }
    }
  }
  return rows;
}

describe("기피 키워드 표 DB와 TS 일치 (POLL-13)", () => {
  it("마이그레이션의 키워드 행이 avoid-match.ts 표와 같다", () => {
    const sql = sqlRows();
    expect(sql.size).toBeGreaterThan(100);
    expect([...sql].sort()).toEqual([...tsRows()].sort());
  });
});
