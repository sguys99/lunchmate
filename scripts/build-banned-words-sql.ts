/**
 * 금칙어 SQL 덩어리 생성 CLI (T10.3b, MOD-04, D-27). 규칙은 scripts/moderation-sql/render.ts 머리말.
 *
 *   node scripts/build-banned-words-sql.ts           지금 목록으로 만든 SQL 덩어리를 표준 출력에
 *   node scripts/build-banned-words-sql.ts --check   마지막 마이그레이션의 덩어리와 다르면 exit 1
 *
 * DB에는 직접 쓰지 않는다. 덩어리는 새 마이그레이션 파일에 붙여 넣고, 적용은 백업 뒤 pnpm db:push(CLAUDE.md 7.1).
 * Node 내장 type stripping으로 실행한다(scripts/check-copy.ts와 같은 방식: 타입만 정적 import, 값은 .ts URL 동적 import).
 */
import { readFileSync, readdirSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import type * as RenderModule from "./moderation-sql/render";
import type * as ListsModule from "../src/lib/moderation/banned-words";

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, "..");

const render: typeof RenderModule = await import(
  new URL("./moderation-sql/render.ts", import.meta.url).href
);
const lists: typeof ListsModule = await import(
  new URL("../src/lib/moderation/banned-words.ts", import.meta.url).href
);

const sql = render.renderBannedWordListSql({
  hangul: lists.BANNED_HANGUL,
  jamo: lists.BANNED_JAMO,
  mixed: lists.BANNED_MIXED,
  latin: lists.BANNED_LATIN,
  safe: lists.SAFE_SUBSTRINGS,
});

if (process.argv.includes("--check")) {
  const dir = path.join(root, "supabase", "migrations");
  const migrations = readdirSync(dir)
    .filter((f) => f.endsWith(".sql"))
    .sort()
    .map((name) => ({ name, sql: readFileSync(path.join(dir, name), "utf8") }));
  const latest = render.latestGeneratedBlock(migrations);
  if (!latest) {
    console.error("[moderation:sql] 마이그레이션에 금칙어 덩어리가 없습니다.");
    process.exit(1);
  }
  if (latest.block !== sql || latest.lastDefinitionOutsideBlock) {
    console.error(
      `[moderation:sql] ${latest.name}의 금칙어 목록이 banned-words.ts와 다릅니다. ` +
        "새 마이그레이션 파일에 `pnpm moderation:sql` 출력을 넣으세요(이미 푸시한 파일은 고치지 않습니다).",
    );
    process.exit(1);
  }
  console.log(`[moderation:sql] 일치: ${latest.name}`);
} else {
  process.stdout.write(`${sql}\n`);
}
