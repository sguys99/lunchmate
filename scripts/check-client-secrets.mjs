// 빌드 산출물(.next/static)에 서버 전용 키의 이름이나 값이 들어 있으면 실패한다.
// 사용: pnpm build 이후 node scripts/check-client-secrets.mjs (Node 24 내장 기능만 사용)
import { readdirSync, readFileSync, existsSync, statSync } from "node:fs";
import { join } from "node:path";
import { SERVER_ENV_KEYS } from "../src/lib/env/keys.ts";

const root = process.cwd();
const staticDir = join(root, ".next", "static");

if (!existsSync(staticDir)) {
  console.error(
    "[check-client-secrets] .next/static 이 없습니다. 먼저 pnpm build 를 실행하세요.",
  );
  process.exit(2);
}

// 로컬 .env 파일의 값도 검사 대상에 포함 (Vercel 빌드에서는 process.env에 이미 있음)
for (const f of [
  ".env",
  ".env.local",
  ".env.production",
  ".env.production.local",
]) {
  const p = join(root, f);
  if (existsSync(p)) process.loadEnvFile(p);
}

function* walk(dir) {
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    if (statSync(p).isDirectory()) yield* walk(p);
    else yield p;
  }
}

// 이름 검사: NEXT_PUBLIC_SENTRY_DSN 같은 공개 키와 구분하기 위해 앞뒤 경계를 둔다.
const nameRes = SERVER_ENV_KEYS.map((k) => ({
  key: k,
  re: new RegExp(`(?<![A-Z0-9_])${k}(?![A-Z0-9_])`),
}));
// 값 검사: 너무 짧은 값("1" 등)은 오탐이 많아 8자 이상만 본다.
const values = SERVER_ENV_KEYS.map((k) => ({
  key: k,
  value: process.env[k]?.trim(),
})).filter((v) => v.value && v.value.length >= 8);

const findings = [];
let scanned = 0;
for (const file of walk(staticDir)) {
  if (!/\.(js|mjs|css|html|json|map|txt)$/.test(file)) continue;
  scanned++;
  const text = readFileSync(file, "utf8");
  const rel = file.slice(root.length + 1);
  for (const { key, re } of nameRes)
    if (re.test(text)) findings.push(`${rel}: 서버 키 이름 ${key}`);
  for (const { key, value } of values)
    if (text.includes(value)) findings.push(`${rel}: ${key} 의 값`);
}

if (findings.length > 0) {
  console.error(
    "[check-client-secrets] 클라이언트 번들에 서버 전용 키가 포함되어 있습니다.",
  );
  for (const f of findings) console.error(`  - ${f}`); // 값 자체는 출력하지 않음
  process.exit(1);
}
console.log(
  `[check-client-secrets] 통과 (파일 ${scanned}개, 서버 키 ${SERVER_ENV_KEYS.length}개 검사)`,
);
