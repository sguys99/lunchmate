// 클라우드 개발 프로젝트의 public 스키마에서 TypeScript 타입을 생성한다.
// 사용: pnpm db:types → src/lib/supabase/types.ts (Node 내장 기능만 사용)
// SUPABASE_PROJECT_REF는 환경변수 또는 .env.local에서 읽는다. 값은 출력하지 않는다.
import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";

const root = process.cwd();
const envFile = join(root, ".env.local");
if (!process.env.SUPABASE_PROJECT_REF && existsSync(envFile)) {
  process.loadEnvFile(envFile);
}

const ref = process.env.SUPABASE_PROJECT_REF;
if (!ref) {
  console.error(
    "[db:types] SUPABASE_PROJECT_REF가 없습니다. .env.local에 개발 프로젝트 ID를 넣은 뒤 다시 실행하세요.",
  );
  process.exit(1);
}

const outFile = join(root, "src", "lib", "supabase", "types.ts");

let types;
try {
  types = execFileSync(
    "supabase",
    ["gen", "types", "typescript", "--project-id", ref, "--schema", "public"],
    { encoding: "utf8", stdio: ["ignore", "pipe", "inherit"] },
  );
} catch {
  console.error(
    "[db:types] 타입 생성에 실패했습니다. supabase login 상태와 프로젝트 ID를 확인하세요.",
  );
  process.exit(1);
}

// 실패 시 기존 파일을 지우지 않도록 생성이 끝난 뒤에만 쓴다.
mkdirSync(dirname(outFile), { recursive: true });
writeFileSync(outFile, types);
console.log("[db:types] src/lib/supabase/types.ts 를 갱신했습니다.");
