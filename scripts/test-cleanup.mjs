// 테스트 계정과 그 데이터 정리 (T8.18, T4.5 rls-cleanup 확장, CLAUDE.md 7.1)
// 사용: pnpm test:cleanup           → 지울 대상만 출력(드라이런, 기본)
//       pnpm test:cleanup --yes     → 실제로 삭제
//       (pnpm test:rls:cleanup도 같은 스크립트다)
//
// 대상 판정은 scripts/test-cleanup/policy.mjs: 닉네임 test_ + 이메일 test_rls_@테스트 도메인 + email provider만,
// 세 겹이 모두 맞는 Auth 사용자만 지운다. 일부만 맞으면 "확인 필요"로 보여 주고 지우지 않는다.
// - auth 사용자를 지우면 profiles, offices, preferences, avoid_rules, visits, favorites, blocklist, reviews,
//   신고, 제보, 할인, 웨이팅, 투표 참여와 표는 on delete cascade로 함께 지워진다(T6.27 탈퇴 범위 점검).
// - 투표방은 방장이 지워져도 host_id만 null이 되어 남는다. 방장 없는 방 가운데 제목이 test_로 시작하는 것을
//   사용자를 지운 뒤에 지운다(후보, 참여자, 표는 cascade).
// - secret 키(SUPABASE_SERVICE_ROLE_KEY)는 이 서버 스크립트에서만 쓰고 출력하지 않는다. 이메일도 출력하지 않는다.
import { existsSync } from "node:fs";
import { join } from "node:path";
import {
  classifyUser,
  isOrphanTestPoll,
  shortId,
} from "./test-cleanup/policy.mjs";

const TAG = "[test-cleanup]";
const envFile = join(process.cwd(), ".env.local");
if (existsSync(envFile)) process.loadEnvFile(envFile);

const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.replace(/\/$/, "");
const secret = process.env.SUPABASE_SERVICE_ROLE_KEY;
const emailDomain = process.env.RLS_TEST_EMAIL_DOMAIN ?? "example.com";
if (!url || !secret) {
  console.error(
    `${TAG} NEXT_PUBLIC_SUPABASE_URL 또는 SUPABASE_SERVICE_ROLE_KEY가 없습니다.`,
  );
  process.exit(1);
}

const apply = process.argv.includes("--yes");
// 새 secret 키는 JWT가 아니므로 apikey 헤더로만 보낸다
const headers = { apikey: secret, "Content-Type": "application/json" };

async function listAuthUsers() {
  const users = [];
  for (let page = 1; page < 100; page += 1) {
    const res = await fetch(
      `${url}/auth/v1/admin/users?page=${page}&per_page=200`,
      { headers },
    );
    if (!res.ok) throw new Error(`사용자 목록 조회 실패 (${res.status})`);
    const body = await res.json();
    const batch = Array.isArray(body.users) ? body.users : [];
    users.push(...batch);
    if (batch.length < 200) break;
  }
  return users;
}

/** user_id → nickname (service role로 읽는다. 정리 판정에만 쓴다) */
async function profileNicknames(ids) {
  const map = new Map();
  for (let i = 0; i < ids.length; i += 100) {
    const chunk = ids.slice(i, i + 100);
    const res = await fetch(
      `${url}/rest/v1/profiles?select=user_id,nickname&user_id=in.(${chunk.join(",")})`,
      { headers },
    );
    if (!res.ok) throw new Error(`프로필 조회 실패 (${res.status})`);
    for (const row of await res.json()) map.set(row.user_id, row.nickname);
  }
  return map;
}

async function orphanTestPolls() {
  const res = await fetch(
    `${url}/rest/v1/polls?select=id,title,host_id&host_id=is.null&limit=1000`,
    { headers },
  );
  if (res.status === 404) return []; // 마이그레이션 전
  if (!res.ok) throw new Error(`투표방 조회 실패 (${res.status})`);
  return (await res.json()).filter(isOrphanTestPoll);
}

function checkMarks(checks) {
  return `닉네임 ${checks.nickname ? "O" : "X"}, 이메일 ${checks.email ? "O" : "X"}, provider ${checks.provider ? "O" : "X"}`;
}

async function main() {
  const users = await listAuthUsers();
  const nicknames = await profileNicknames(users.map((u) => u.id));
  const targets = [];
  const review = [];
  for (const u of users) {
    const v = classifyUser(u, nicknames.get(u.id), { emailDomain });
    if (v.kind === "target") targets.push({ user: u, verdict: v });
    else if (v.kind === "review") review.push({ user: u, verdict: v });
  }

  console.log(
    `${TAG} 전체 Auth 사용자 ${users.length}명, 삭제 대상 ${targets.length}명, 확인 필요 ${review.length}명 (${apply ? "삭제 실행" : "드라이런"})`,
  );
  for (const { user, verdict } of review) {
    console.log(
      `${TAG} 확인 필요(지우지 않음) ${shortId(user.id)} ${checkMarks(verdict.checks)}`,
    );
  }

  let deleted = 0;
  for (const { user, verdict } of targets) {
    if (!apply) {
      console.log(`${TAG} 대상 ${shortId(user.id)} ${verdict.nickname}`);
      continue;
    }
    const res = await fetch(`${url}/auth/v1/admin/users/${user.id}`, {
      method: "DELETE",
      headers,
    });
    if (res.ok) deleted += 1;
    else console.log(`${TAG} 실패 ${res.status} ${shortId(user.id)}`);
  }
  if (apply) console.log(`${TAG} 사용자 ${deleted}/${targets.length}명 삭제`);

  // 사용자를 지운 뒤에 센다(방장이 지워져야 host_id가 null). 드라이런에서는 지금 이미 방장 없는 방만 보인다.
  const polls = await orphanTestPolls();
  if (!apply) {
    console.log(
      `${TAG} 방장 없는 테스트 투표방 ${polls.length}개 (대상 사용자를 지우면 그들이 연 test_ 방도 이어서 지운다)`,
    );
    console.log(`${TAG} 지우려면 --yes를 붙여 다시 실행하세요.`);
    return;
  }
  for (let i = 0; i < polls.length; i += 100) {
    const ids = polls.slice(i, i + 100).map((p) => p.id);
    const res = await fetch(`${url}/rest/v1/polls?id=in.(${ids.join(",")})`, {
      method: "DELETE",
      headers,
    });
    console.log(
      `${TAG} 투표방 ${res.ok ? "삭제" : `실패 ${res.status}`} ${ids.length}개`,
    );
  }
}

try {
  await main();
} catch (e) {
  console.error(`${TAG} ${e instanceof Error ? e.message : "알 수 없는 오류"}`);
  process.exit(1);
}
