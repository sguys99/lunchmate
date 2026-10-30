// RLS 테스트 사용자 정리 (T4.5, CLAUDE.md 7.1)
// 사용: pnpm test:rls:cleanup           → 지울 대상만 출력(드라이런)
//       pnpm test:rls:cleanup --yes     → 실제로 삭제
// 대상: 이메일이 test_rls_로 시작하는 Auth 사용자(src/lib/supabase/rls/harness.ts가 만든 계정)만.
// auth 사용자를 지우면 profiles, offices, preferences, avoid_rules는 on delete cascade로 함께 지워진다.
// secret 키는 Auth Admin API 호출에만 쓰고 출력하지 않는다.
import { existsSync } from "node:fs";
import { join } from "node:path";

const envFile = join(process.cwd(), ".env.local");
if (existsSync(envFile)) process.loadEnvFile(envFile);

const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.replace(/\/$/, "");
const secret = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !secret) {
  console.error(
    "[rls-cleanup] NEXT_PUBLIC_SUPABASE_URL 또는 SUPABASE_SERVICE_ROLE_KEY가 없습니다.",
  );
  process.exit(1);
}

const apply = process.argv.includes("--yes");
const headers = { apikey: secret, "Content-Type": "application/json" };
const PREFIX = "test_rls_";

const targets = [];
for (let page = 1; page < 100; page += 1) {
  const res = await fetch(
    `${url}/auth/v1/admin/users?page=${page}&per_page=200`,
    { headers },
  );
  if (!res.ok) {
    console.error(`[rls-cleanup] 사용자 목록 조회 실패 (${res.status})`);
    process.exit(1);
  }
  const body = await res.json();
  const users = Array.isArray(body.users) ? body.users : [];
  for (const u of users) {
    if (typeof u.email === "string" && u.email.startsWith(PREFIX))
      targets.push(u);
  }
  if (users.length < 200) break;
}

if (targets.length === 0) {
  console.log("[rls-cleanup] 지울 테스트 사용자가 없습니다.");
  process.exit(0);
}

for (const u of targets) {
  if (!apply) {
    console.log(`[rls-cleanup] 대상 ${u.email} (${u.id})`);
    continue;
  }
  const res = await fetch(`${url}/auth/v1/admin/users/${u.id}`, {
    method: "DELETE",
    headers,
  });
  console.log(
    `[rls-cleanup] ${res.ok ? "삭제" : `실패 ${res.status}`} ${u.email}`,
  );
}
if (!apply)
  console.log(
    `[rls-cleanup] ${targets.length}명. 지우려면 --yes를 붙여 다시 실행하세요.`,
  );
