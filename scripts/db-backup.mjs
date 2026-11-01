// 클라우드 DB 주간 백업 (T8.17, T0.19). Supabase 무료 플랜은 자동 백업이 없어 공식 문서가 CLI db dump 정기 내보내기를 권한다.
// 사용: pnpm db:backup              → 역할, 스키마, 데이터 덤프 → gzip → 보관 개수 넘는 옛 백업 정리
//       pnpm db:backup --dry-run    → 연결하지 않고 저장 위치와 정리 대상만 출력
//
// 읽기 전용 작업이다(pg_dump). DB에 아무것도 쓰지 않는다.
// 필요한 것
// - supabase CLI(로그인, supabase link로 개발 프로젝트 연결됨), Docker 실행 중(CLI가 pg_dump를 컨테이너에서 돌린다)
// - SUPABASE_DB_PASSWORD(환경변수 또는 .env.local). CLI가 환경변수로 읽으므로 명령줄 인자에 넣지 않는다.
// - SUPABASE_PROJECT_REF: 연결된 프로젝트(supabase/.temp/project-ref)와 같아야 실행한다(엉뚱한 프로젝트 방지).
// 저장 위치
// - LUNCHMATE_BACKUP_DIR(기본 ~/lunchmate-backups). 저장소 안 경로는 거절한다(git에 들어가지 않게).
// - <위치>/<YYYY-MM-DD_HHMM KST>/{roles,schema,data}.sql.gz + manifest.json, 폴더 700, 파일 600.
// - LUNCHMATE_BACKUP_KEEP(기본 8, 주 1회면 8주) 개를 넘는 옛 폴더는 지운다.
// 백업에는 auth.users와 비공개 후기, 사무실 핀 좌표 같은 개인정보가 들어간다. 클라우드 동기화 폴더나 공유 위치에 두지 않는다.
// 비밀값(DB 비밀번호, 연결 문자열)은 출력하지 않는다. CLI 출력은 가린 뒤에만 보여 준다.
import { spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import {
  chmodSync,
  createReadStream,
  createWriteStream,
  existsSync,
  mkdirSync,
  readdirSync,
  readFileSync,
  rmSync,
  statSync,
  unlinkSync,
  writeFileSync,
} from "node:fs";
import { homedir } from "node:os";
import { join, resolve } from "node:path";
import { pipeline } from "node:stream/promises";
import { createGzip } from "node:zlib";
import {
  DUMP_PARTS,
  folderName,
  foldersToRotate,
  isInside,
  redact,
} from "./db-backup/policy.mjs";

const TAG = "[db:backup]";
const root = process.cwd();
const envFile = join(root, ".env.local");
if (existsSync(envFile)) process.loadEnvFile(envFile);

const dryRun = process.argv.includes("--dry-run");
const password = process.env.SUPABASE_DB_PASSWORD;
const ref = process.env.SUPABASE_PROJECT_REF;
const baseDir = resolve(
  process.env.LUNCHMATE_BACKUP_DIR ?? join(homedir(), "lunchmate-backups"),
);
const keep = Number(process.env.LUNCHMATE_BACKUP_KEEP ?? "8");

function fail(message, code = 1) {
  console.error(`${TAG} ${message}`);
  process.exit(code);
}

if (isInside(root, baseDir))
  fail(
    "백업 위치가 저장소 안입니다. LUNCHMATE_BACKUP_DIR을 저장소 밖으로 정하세요.",
  );
if (!Number.isInteger(keep) || keep < 1)
  fail("LUNCHMATE_BACKUP_KEEP은 1 이상의 정수여야 합니다.");
if (!ref) fail("SUPABASE_PROJECT_REF가 없습니다.");
const refFile = join(root, "supabase", ".temp", "project-ref");
const linkedRef = existsSync(refFile)
  ? readFileSync(refFile, "utf8").trim()
  : null;
if (linkedRef !== ref)
  fail(
    "supabase link로 연결된 프로젝트가 SUPABASE_PROJECT_REF와 다릅니다(또는 연결 전). supabase link --project-ref로 연결하세요.",
  );

const existing = existsSync(baseDir) ? readdirSync(baseDir) : [];
const folder = folderName(new Date());
const outDir = join(baseDir, folder);

if (dryRun) {
  console.log(
    `${TAG} 드라이런: ${outDir} 에 ${DUMP_PARTS.map((p) => `${p.file}.gz`).join(", ")}`,
  );
  const old = foldersToRotate([...existing, folder], keep);
  console.log(
    `${TAG} 보관 ${keep}개, 이번 실행 뒤 지울 옛 백업 ${old.length}개${old.length ? `: ${old.join(", ")}` : ""}`,
  );
  console.log(
    `${TAG} DB 비밀번호 ${password ? "있음" : "없음(SUPABASE_DB_PASSWORD 필요)"}`,
  );
  process.exit(0);
}

if (!password) fail("SUPABASE_DB_PASSWORD가 없습니다. .env.local에 넣으세요.");
if (spawnSync("docker", ["info"], { stdio: "ignore" }).status !== 0)
  fail(
    "Docker가 실행 중이 아닙니다. supabase db dump는 pg_dump를 Docker 컨테이너에서 돌립니다. Docker Desktop을 켠 뒤 다시 실행하세요.",
    2,
  );

mkdirSync(outDir, { recursive: true, mode: 0o700 });
chmodSync(baseDir, 0o700);

const manifest = {
  created_at: new Date().toISOString(),
  project_ref: ref,
  cli: (
    spawnSync("supabase", ["--version"], { encoding: "utf8" }).stdout ?? ""
  ).trim(),
  files: [],
};

for (const part of DUMP_PARTS) {
  const sqlPath = join(outDir, part.file);
  const r = spawnSync(
    "supabase",
    ["db", "dump", "--linked", "-f", sqlPath, ...part.args],
    {
      cwd: root,
      encoding: "utf8",
      env: { ...process.env, SUPABASE_DB_PASSWORD: password },
      stdio: ["ignore", "pipe", "pipe"],
      maxBuffer: 16 * 1024 * 1024,
    },
  );
  if (r.status !== 0 || !existsSync(sqlPath)) {
    const tail = redact(`${r.stderr ?? ""}`, [password, ref])
      .split("\n")
      .filter(Boolean)
      .slice(-8)
      .join("\n");
    rmSync(outDir, { recursive: true, force: true });
    fail(
      `${part.file} 덤프 실패 (종료 코드 ${r.status}). 만든 폴더는 지웠습니다.\n${tail}`,
    );
  }
  const gzPath = `${sqlPath}.gz`;
  await pipeline(
    createReadStream(sqlPath),
    createGzip({ level: 9 }),
    createWriteStream(gzPath, { mode: 0o600 }),
  );
  unlinkSync(sqlPath);
  const sha256 = createHash("sha256")
    .update(readFileSync(gzPath))
    .digest("hex");
  const bytes = statSync(gzPath).size;
  manifest.files.push({
    name: `${part.file}.gz`,
    bytes,
    sha256,
  });
  console.log(`${TAG} ${part.file}.gz ${(bytes / 1024).toFixed(1)} KB`);
}

writeFileSync(
  join(outDir, "manifest.json"),
  JSON.stringify(manifest, null, 2),
  {
    mode: 0o600,
  },
);

for (const name of foldersToRotate(readdirSync(baseDir), keep)) {
  rmSync(join(baseDir, name), { recursive: true, force: true });
  console.log(`${TAG} 옛 백업 정리 ${name}`);
}
console.log(`${TAG} 완료: ${outDir}`);
