/**
 * 금칙어 목록 → SQL 함수 private.banned_word_list (T10.3b, MOD-04, D-27). 순수 함수.
 *
 * 정본은 src/lib/moderation/banned-words.ts 하나다. DB 안전망(트리거)이 같은 목록을 쓰도록 이 함수가 만든
 * SQL 덩어리를 마이그레이션에 그대로 붙여 넣는다. 목록을 고치면:
 *   1. banned-words.ts를 고친다.
 *   2. `pnpm moderation:sql > /tmp/x.sql`로 덩어리를 뽑아 **새 마이그레이션 파일**에 넣는다(이미 푸시한 파일은 고치지 않는다).
 *   3. `pnpm test`의 banned-words-sync.test.ts가 "가장 마지막 마이그레이션의 덩어리 = 지금 목록"을 확인한다.
 *
 * 목록은 적힌 모양 그대로 넣고, 반복 합치기와 중복 제거(index.ts의 prep)는 SQL private.banned_words()가 한다.
 */

export type BannedLists = {
  readonly hangul: readonly string[];
  readonly jamo: readonly string[];
  readonly mixed: readonly string[];
  readonly latin: readonly string[];
  readonly safe: readonly string[];
};

export const BEGIN_MARKER =
  "-- BEGIN GENERATED banned-words (pnpm moderation:sql, 원본 src/lib/moderation/banned-words.ts)";
export const END_MARKER = "-- END GENERATED banned-words";

const KINDS = ["hangul", "jamo", "mixed", "latin", "safe"] as const;

const quote = (s: string) => `'${s.replace(/'/g, "''")}'`;

/** 한 줄 100자 안팎으로 묶는다(리뷰할 때 읽기 쉽게) */
function wrap(items: readonly string[], indent: string): string {
  const lines: string[] = [];
  let line = "";
  for (const item of items.map(quote)) {
    const next = line ? `${line}, ${item}` : item;
    if (line && indent.length + next.length > 100) {
      lines.push(`${indent}${line},`);
      line = item;
    } else {
      line = next;
    }
  }
  if (line) lines.push(`${indent}${line}`);
  return lines.join("\n");
}

export function renderBannedWordListSql(lists: BannedLists): string {
  const cases = KINDS.map(
    (kind) =>
      `    when '${kind}' then array[\n${wrap(lists[kind], "      ")}\n    ]::text[]`,
  ).join("\n");
  return [
    BEGIN_MARKER,
    "create or replace function private.banned_word_list(p_kind text)",
    "returns text[]",
    "language sql",
    "immutable",
    "set search_path = ''",
    "as $$",
    "  select case p_kind",
    cases,
    "  end;",
    "$$;",
    END_MARKER,
  ].join("\n");
}

/** SQL 글에서 생성 덩어리를 꺼낸다. 없으면 null */
export function extractGeneratedBlock(sql: string): string | null {
  const start = sql.indexOf(BEGIN_MARKER);
  if (start < 0) return null;
  const end = sql.indexOf(END_MARKER, start);
  if (end < 0) return null;
  return sql.slice(start, end + END_MARKER.length);
}

/**
 * 정렬된 마이그레이션 목록에서 마지막 생성 덩어리. private.banned_word_list를 다시 정의한 파일이
 * 덩어리 밖에서 손으로 고쳤다면 lastDefinitionOutsideBlock이 true다(테스트가 실패시킨다).
 */
export function latestGeneratedBlock(
  migrations: readonly { name: string; sql: string }[],
): { name: string; block: string; lastDefinitionOutsideBlock: boolean } | null {
  let found: { name: string; block: string } | null = null;
  let lastDefinitionOutsideBlock = false;
  for (const m of migrations) {
    const block = extractGeneratedBlock(m.sql);
    const rest = block ? m.sql.replace(block, "") : m.sql;
    if (block) {
      found = { name: m.name, block };
      lastDefinitionOutsideBlock = false;
    }
    if (
      /create\s+or\s+replace\s+function\s+private\.banned_word_list\b/i.test(
        rest,
      )
    ) {
      lastDefinitionOutsideBlock = true;
    }
  }
  return found ? { ...found, lastDefinitionOutsideBlock } : null;
}
