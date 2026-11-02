// 금칙어 TS 정본 = DB 안전망 (T10.3b, MOD-04, D-27).
// - 목록: 가장 마지막 마이그레이션의 생성 덩어리(private.banned_word_list)가 banned-words.ts에서 지금 만든 것과 글자까지 같은가.
//   다르면 `pnpm moderation:sql` 출력을 새 마이그레이션에 넣는다(이미 푸시한 파일은 고치지 않는다).
// - 판정 규칙: SQL로 옮긴 상수(leet 치환, 링크 도메인 끝)가 TS 원본과 같은가.
// - 트리거: T8.15 금칙어 적용 지점 표의 다섯 열에 걸려 있고, profiles는 insert를 막지 않는가(가입 트리거 보호).
// 같은 판정인지(정규화 전체)는 DB가 있어야 볼 수 있어 test:rls(t10-banned-guard.rls.test.ts)가 맡는다.
import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import {
  latestGeneratedBlock,
  renderBannedWordListSql,
} from "../../../scripts/moderation-sql/render";
import * as lists from "./banned-words";

const dir = join(process.cwd(), "supabase", "migrations");
const migrations = readdirSync(dir)
  .filter((f) => f.endsWith(".sql"))
  .sort()
  .map((name) => ({ name, sql: readFileSync(join(dir, name), "utf8") }));
const allSql = migrations.map((m) => m.sql).join("\n");

const expected = renderBannedWordListSql({
  hangul: lists.BANNED_HANGUL,
  jamo: lists.BANNED_JAMO,
  mixed: lists.BANNED_MIXED,
  latin: lists.BANNED_LATIN,
  safe: lists.SAFE_SUBSTRINGS,
});

describe("금칙어 목록: banned-words.ts = 마지막 마이그레이션", () => {
  const latest = latestGeneratedBlock(migrations);

  it("생성 덩어리가 있다", () => {
    expect(latest).not.toBeNull();
  });

  it("글자까지 같다 (다르면 pnpm moderation:sql 출력을 새 마이그레이션에)", () => {
    expect(latest?.block).toBe(expected);
  });

  it("덩어리 밖에서 private.banned_word_list를 다시 정의하지 않았다", () => {
    expect(latest?.lastDefinitionOutsideBlock).toBe(false);
  });

  it("SQL 배열 원소 수가 TS 목록과 같다", () => {
    const counts = [
      ...(latest?.block ?? "").matchAll(
        /when '(\w+)' then array\[([\s\S]*?)\]::text\[\]/g,
      ),
    ].map((m) => [m[1], (m[2] ?? "").match(/'(?:[^']|'')*'/g)?.length ?? 0]);
    expect(Object.fromEntries(counts)).toEqual({
      hangul: lists.BANNED_HANGUL.length,
      jamo: lists.BANNED_JAMO.length,
      mixed: lists.BANNED_MIXED.length,
      latin: lists.BANNED_LATIN.length,
      safe: lists.SAFE_SUBSTRINGS.length,
    });
  });
});

describe("판정 상수: TS 원본 = SQL", () => {
  const normalizeSrc = readFileSync(
    join(process.cwd(), "src/lib/moderation/normalize.ts"),
    "utf8",
  );
  const indexSrc = readFileSync(
    join(process.cwd(), "src/lib/moderation/index.ts"),
    "utf8",
  );

  it("leet 치환표", () => {
    const body = /const LEET[^{]*\{([\s\S]*?)\};/.exec(normalizeSrc)?.[1] ?? "";
    const pairs = [...body.matchAll(/"?([^\s":,]+)"?\s*:\s*"([a-z])"/g)].map(
      (m) => [m[1] ?? "", m[2] ?? ""] as const,
    );
    expect(pairs.length).toBeGreaterThan(0);
    const from = pairs.map(([k]) => k).join("");
    const to = pairs.map(([, v]) => v).join("");
    expect(allSql).toContain(`translate(r.x, '${from}', '${to}')`);
  });

  it("링크 도메인 끝 목록", () => {
    const tlds = /\\\.\(([a-z|]+)\)\(\?!\[a-z\]\)/.exec(indexSrc)?.[1];
    expect(tlds).toBeTruthy();
    expect(allSql).toContain(`\\.(${tlds})(?![a-z])`);
  });

  it("한글 숫자표", () => {
    const body =
      /const HANGUL_DIGITS[^{]*\{([\s\S]*?)\};/.exec(indexSrc)?.[1] ?? "";
    const pairs = [...body.matchAll(/(\S)\s*:\s*"(\d)"/g)];
    const from = pairs.map((m) => m[1]).join("");
    const to = pairs.map((m) => m[2]).join("");
    expect(allSql).toContain(`translate(run, '${from}', '${to}')`);
  });
});

describe("트리거 자리 (T8.15 금칙어 적용 지점)", () => {
  it.each([
    ["reviews", "insert or update of body", "body"],
    ["place_deals", "insert or update of content", "content"],
    ["review_reports", "insert or update of note", "note"],
    ["polls", "insert or update of title", "title"],
    ["profiles", "update of nickname", "nickname"],
  ])("%s: before %s", (table, events, col) => {
    expect(allSql).toContain(
      `create trigger ${table}_banned_text_guard\n  before ${events} on public.${table}\n  for each row execute function private.reject_banned_text('${col}');`,
    );
  });

  it("profiles insert는 검사하지 않는다(가입 트리거 handle_new_user 보호)", () => {
    expect(allSql).not.toMatch(
      /before insert[^;]*on public\.profiles[^;]*reject_banned_text/,
    );
  });

  it("오류 이름은 banned_content, check_violation", () => {
    expect(allSql).toMatch(
      /raise exception 'banned_content'\s+using errcode = 'check_violation'/,
    );
  });
});
