// 라우트별 첫 로드 JS(gzip) 합계를 계산하고 예산 초과 시 exit 1.
// 입력: `next build`가 만드는 .next/diagnostics/route-bundle-stats.json (Turbopack 빌드).
// 사용: node scripts/bundle-report.mjs [--route /] [--budget 200] [--dir .next]
// 의존성 없음(Node 내장만). 출력의 마지막 줄은 docs/design/bundle-log.md 표에 붙여넣는 형식이다.
import { readFileSync, existsSync } from "node:fs";
import { gzipSync } from "node:zlib";
import { resolve } from "node:path";

function arg(name, fallback) {
  const i = process.argv.indexOf(`--${name}`);
  return i !== -1 && process.argv[i + 1] ? process.argv[i + 1] : fallback;
}

const route = arg("route", "/");
const budgetKb = Number(arg("budget", "200"));
const dir = resolve(arg("dir", ".next"));
const statsPath = resolve(dir, "diagnostics/route-bundle-stats.json");

if (!Number.isFinite(budgetKb) || budgetKb <= 0) {
  console.error("--budget은 양수(KB)여야 합니다.");
  process.exit(2);
}
if (!existsSync(statsPath)) {
  console.error(
    `${statsPath} 파일이 없습니다. 먼저 pnpm build를 실행하세요(Turbopack 빌드 필요).`,
  );
  process.exit(2);
}

const stats = JSON.parse(readFileSync(statsPath, "utf8"));
const entry = stats.find((r) => r.route === route);
if (!entry) {
  console.error(
    `라우트 ${route}를 찾지 못했습니다. 사용 가능: ${stats.map((r) => r.route).join(", ")}`,
  );
  process.exit(2);
}

// 청크 경로는 프로젝트 루트 기준(".next/static/..."). --dir를 바꿔도 .next 접두사를 dir로 치환한다.
const rows = entry.firstLoadChunkPaths.map((p) => {
  const file = resolve(dir, p.replace(/^\.next\//, ""));
  const buf = readFileSync(file);
  return { path: p, raw: buf.length, gzip: gzipSync(buf, { level: 9 }).length };
});

const kb = (n) => (n / 1024).toFixed(1);
const totalRaw = rows.reduce((s, r) => s + r.raw, 0);
const totalGzip = rows.reduce((s, r) => s + r.gzip, 0);

console.log(`라우트 ${route} 첫 로드 JS (${rows.length}개 청크)`);
for (const r of rows) {
  console.log(
    `  ${kb(r.gzip).padStart(7)} KB gzip  ${kb(r.raw).padStart(7)} KB raw  ${r.path}`,
  );
}
console.log(
  `합계: ${kb(totalGzip)} KB gzip (raw ${kb(totalRaw)} KB), 예산 ${budgetKb} KB`,
);
console.log(
  `| 날짜 | 패키지@버전 | 용도 | 로딩 방식 | 홈 번들 영향 (gzip) | 누적 (gzip, 예산 ${budgetKb}KB) | 비고 |`,
);
const today = new Date().toLocaleDateString("sv-SE", {
  timeZone: "Asia/Seoul",
});
console.log(`| ${today} | | | | +? KB | ${kb(totalGzip)} KB | |`);

if (totalGzip / 1024 > budgetKb) {
  console.error(`예산 초과: ${kb(totalGzip)} KB > ${budgetKb} KB`);
  process.exit(1);
}
