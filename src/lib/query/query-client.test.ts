import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { getQueryClient, makeQueryClient, QUERY_DEFAULTS } from "./client";

const ROOT = join(import.meta.dirname, "../../..");

describe("makeQueryClient 기본값 (T2.19)", () => {
  const client = makeQueryClient();
  const queries = client.getDefaultOptions().queries;

  it("gcTime은 5분 이하(T0.16-3, T10.2 답변 전)", () => {
    expect(queries?.gcTime).toBe(QUERY_DEFAULTS.gcTime);
    expect(QUERY_DEFAULTS.gcTime).toBeLessThanOrEqual(5 * 60 * 1000);
  });

  it("재시도 1회, 재연결 시 다시 불러오기, 포커스 복귀 시에는 그대로", () => {
    expect(queries?.retry).toBe(1);
    expect(queries?.refetchOnReconnect).toBe(true);
    expect(queries?.refetchOnWindowFocus).toBe(false);
    expect(queries?.staleTime).toBe(60 * 1000);
  });

  it("쓰기(mutation)는 자동 재시도하지 않는다", () => {
    expect(client.getDefaultOptions().mutations?.retry).toBe(0);
  });

  it("서버(node)에서는 호출마다 새 클라이언트", () => {
    expect(getQueryClient()).not.toBe(getQueryClient());
  });
});

describe("persist 금지 (CLAUDE.md 7장, 카카오 장소 데이터 저장 금지)", () => {
  it("package.json에 @tanstack/*persist* 의존성이 없다", () => {
    const pkg = JSON.parse(
      readFileSync(join(ROOT, "package.json"), "utf8"),
    ) as Record<string, Record<string, string> | undefined>;
    const names = [
      "dependencies",
      "devDependencies",
      "optionalDependencies",
      "peerDependencies",
    ].flatMap((key) => Object.keys(pkg[key] ?? {}));
    expect(names.filter((n) => /^@tanstack\/.*persist/.test(n))).toEqual([]);
  });

  it("src 안에서 persist 플러그인과 persistQueryClient를 쓰지 않는다", () => {
    const offenders: string[] = [];
    const walk = (dir: string) => {
      for (const name of readdirSync(dir)) {
        const path = join(dir, name);
        if (statSync(path).isDirectory()) walk(path);
        else if (/\.(ts|tsx)$/.test(name) && !name.endsWith(".test.ts")) {
          const text = readFileSync(path, "utf8");
          if (
            /@tanstack\/[\w-]*persist/.test(text) ||
            /\b(persistQueryClient|PersistQueryClientProvider)\b/.test(text)
          ) {
            offenders.push(path);
          }
        }
      }
    };
    walk(join(ROOT, "src"));
    expect(offenders).toEqual([]);
  });
});
