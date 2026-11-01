import { describe, expect, it } from "vitest";
import {
  DUMP_PARTS,
  folderName,
  foldersToRotate,
  isInside,
  redact,
} from "./policy.mjs";

describe("DB 백업 규칙 (T8.17)", () => {
  it("폴더 이름은 KST 날짜와 시각", () => {
    expect(folderName(new Date("2026-11-01T00:30:00Z"))).toBe(
      "2026-11-01_0930",
    );
    expect(folderName(new Date("2026-11-01T15:05:00Z"))).toBe(
      "2026-11-02_0005",
    );
  });

  it("저장소 안 경로는 거절 대상", () => {
    expect(isInside("/repo", "/repo")).toBe(true);
    expect(isInside("/repo", "/repo/backups")).toBe(true);
    expect(isInside("/repo", "/repo-backups")).toBe(false);
    expect(isInside("/repo", "/Users/me/lunchmate-backups")).toBe(false);
  });

  it("보관 개수만 남기고 오래된 것부터 지운다, 형식 밖 이름은 건드리지 않는다", () => {
    const names = [
      "2026-11-08_0900",
      "2026-11-01_0900",
      "notes.txt",
      "2026-11-15_0900",
    ];
    expect(foldersToRotate(names, 2)).toEqual(["2026-11-01_0900"]);
    expect(foldersToRotate(names, 8)).toEqual([]);
    expect(() => foldersToRotate(names, 0)).toThrow();
  });

  it("비밀번호와 연결 문자열을 가린다", () => {
    const line =
      "connect postgresql://postgres.abc:s3cr3t-pw@aws-0.pooler.supabase.com:5432/postgres PGPASSWORD=s3cr3t-pw";
    const out = redact(line, ["s3cr3t-pw"]);
    expect(out).not.toContain("s3cr3t-pw");
    expect(out).toContain("postgres.abc:***@");
  });

  it("역할, 스키마, 데이터 세 파일", () => {
    expect(DUMP_PARTS.map((p) => p.file)).toEqual([
      "roles.sql",
      "schema.sql",
      "data.sql",
    ]);
  });
});
