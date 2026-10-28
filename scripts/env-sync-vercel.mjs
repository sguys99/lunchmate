// .env.local의 키를 Vercel 환경변수(production, development)로 옮긴다 (T0.13). Node 내장 기능만 사용.
// 사용:
//   node scripts/env-sync-vercel.mjs                     dry-run, 비교 표만 출력 (기본)
//   node scripts/env-sync-vercel.mjs --apply             Vercel에 없는 키만 등록
//   node scripts/env-sync-vercel.mjs --apply --overwrite 이미 있는 키도 rm 후 다시 등록
// 규칙:
//   - 허용 목록 방식: src/lib/env/keys.ts의 서버, 클라이언트 키만 대상. VERCEL_OIDC_TOKEN 같은 로컬 전용 값은 올리지 않는다.
//   - NEXT_PUBLIC_SITE_URL, NEXT_PUBLIC_DESIGN_LAB은 환경별 값이 달라 건너뛴다.
//   - 서버 전용 키(NEXT_PUBLIC_ 아님)는 --sensitive로 등록한다.
//   - 값은 stdin으로만 전달하고 어디에도 출력하지 않는다(이름과 길이만).
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { spawn, spawnSync } from "node:child_process";
import { parseEnv } from "node:util";
import { SERVER_ENV_KEYS, CLIENT_ENV_KEYS } from "../src/lib/env/keys.ts";

const ENVIRONMENTS = ["production", "development"];
const SKIP = new Map([
  ["NEXT_PUBLIC_SITE_URL", "환경별 값"],
  ["NEXT_PUBLIC_DESIGN_LAB", "환경별 값"],
  ["NEXT_PUBLIC_VERCEL_PROJECT_PRODUCTION_URL", "Vercel 시스템 변수"],
]);

// pnpm 11은 `pnpm env:sync -- --apply`의 `--`를 그대로 넘기므로 무시한다
const args = new Set(process.argv.slice(2).filter((a) => a !== "--"));
for (const a of args) {
  if (!["--apply", "--overwrite"].includes(a)) {
    console.error(
      `[env-sync] 알 수 없는 옵션입니다: ${a} (--apply, --overwrite만 지원)`,
    );
    process.exit(2);
  }
}
const apply = args.has("--apply");
const overwrite = args.has("--overwrite");

const root = process.cwd();
const envPath = join(root, ".env.local");
if (!existsSync(envPath)) {
  console.error("[env-sync] .env.local이 없습니다. 먼저 값을 채워 주세요.");
  process.exit(2);
}
const local = parseEnv(readFileSync(envPath, "utf8"));

// Vercel에 등록된 키 목록 (키 이름과 대상 환경만 사용, 값은 읽지 않는다)
function listRemote() {
  const r = spawnSync("vercel", ["env", "ls", "--format", "json"], {
    cwd: root,
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
  });
  if (r.status !== 0) {
    console.error(
      "[env-sync] vercel env ls 실패. vercel login, vercel link 상태를 확인하세요.",
    );
    process.exit(1);
  }
  const start = r.stdout.indexOf("{");
  const data = JSON.parse(r.stdout.slice(start));
  const remote = new Map(); // key -> Set(target)
  for (const e of data.envs ?? []) {
    const targets = Array.isArray(e.target) ? e.target : [e.target];
    const set = remote.get(e.key) ?? new Set();
    for (const t of targets) set.add(t);
    remote.set(e.key, set);
  }
  return remote;
}

const remote = listRemote();
const isServer = (k) => !k.startsWith("NEXT_PUBLIC_");

const STATUS = {
  add: "추가 예정",
  exists: "이미 있음",
  overwrite: "덮어쓰기 예정",
  missing: "로컬에 값 없음",
  skip: "건너뜀",
};

const rows = [];
for (const key of [...SERVER_ENV_KEYS, ...CLIENT_ENV_KEYS]) {
  const value = local[key]?.trim() ?? "";
  for (const env of ENVIRONMENTS) {
    const has = remote.get(key)?.has(env) ?? false;
    let status;
    let note = "";
    if (SKIP.has(key)) {
      status = "skip";
      note = SKIP.get(key);
    } else if (!value) {
      status = "missing";
    } else if (has) {
      status = overwrite ? "overwrite" : "exists";
    } else {
      status = "add";
    }
    rows.push({ key, env, status, note, value, has });
  }
}

const pad = (s, n) => {
  const w = [...String(s)].reduce(
    (a, c) => a + (c.charCodeAt(0) > 0x1100 ? 2 : 1),
    0,
  );
  return String(s) + " ".repeat(Math.max(0, n - w));
};
console.log(
  `[env-sync] ${apply ? "적용 모드" : "dry-run (실제 등록 안 함, --apply로 적용)"}${overwrite ? ", --overwrite" : ""}\n`,
);
console.log(
  `${pad("키", 44)}${pad("환경", 13)}${pad("종류", 11)}${pad("길이", 6)}상태`,
);
console.log("-".repeat(90));
for (const r of rows) {
  const kind = isServer(r.key) ? "sensitive" : "일반";
  const len = r.value ? String(r.value.length) : "-";
  const status = STATUS[r.status] + (r.note ? ` (${r.note})` : "");
  console.log(
    `${pad(r.key, 44)}${pad(r.env, 13)}${pad(kind, 11)}${pad(len, 6)}${status}`,
  );
}
const count = (s) => rows.filter((r) => r.status === s).length;
console.log(
  `\n합계: 추가 예정 ${count("add")}, 덮어쓰기 예정 ${count("overwrite")}, 이미 있음 ${count("exists")}, 로컬에 값 없음 ${count("missing")}, 건너뜀 ${count("skip")}`,
);

// vercel 출력에 값이 섞여 나오지 않도록 값 문자열은 가린다
function redact(text, value) {
  return value ? text.split(value).join("<값 숨김>") : text;
}

function runVercel(cliArgs, stdinValue) {
  return new Promise((resolve) => {
    const child = spawn("vercel", cliArgs, {
      cwd: root,
      stdio: ["pipe", "pipe", "pipe"],
    });
    let out = "";
    child.stdout.on("data", (d) => (out += d));
    child.stderr.on("data", (d) => (out += d));
    child.on("error", (err) => resolve({ code: 1, out: String(err) }));
    child.on("close", (code) =>
      resolve({ code: code ?? 1, out: redact(out, stdinValue) }),
    );
    if (stdinValue !== undefined) child.stdin.write(stdinValue);
    child.stdin.end();
  });
}

if (apply) {
  const targets = rows.filter(
    (r) => r.status === "add" || r.status === "overwrite",
  );
  let failed = 0;
  console.log("");
  for (const r of targets) {
    if (r.status === "overwrite") {
      const rm = await runVercel(["env", "rm", r.key, r.env, "--yes"]);
      if (rm.code !== 0) {
        failed++;
        console.error(`  실패  rm ${r.key} (${r.env})\n${rm.out.trim()}`);
        continue;
      }
    }
    const addArgs = ["env", "add", r.key, r.env];
    if (isServer(r.key)) addArgs.push("--sensitive");
    const add = await runVercel(addArgs, r.value);
    if (add.code === 0) {
      console.log(`  완료  ${r.key} (${r.env})`);
    } else {
      failed++;
      console.error(`  실패  add ${r.key} (${r.env})\n${add.out.trim()}`);
    }
  }
  console.log(
    `\n등록 ${targets.length - failed}건, 실패 ${failed}건. Vercel 재배포가 필요합니다(git push 또는 vercel --prod).`,
  );
  if (failed > 0) process.exit(1);
} else {
  console.log(
    "\n다음 행동: 표를 확인한 뒤 --apply로 등록하세요. 등록 후 Vercel 재배포가 필요합니다(git push 또는 vercel --prod).",
  );
}
