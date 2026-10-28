// 라우트별 첫 로드 JS(gzip) 합계를 계산하고, 한 라우트라도 예산을 넘으면 exit 1.
// 입력: `next build`가 만드는 .next/diagnostics/route-bundle-stats.json (Turbopack 빌드).
// 사용: node scripts/bundle-report.mjs [--route / --route /today] [--budget 200] [--dir .next]
//   --route를 주지 않으면 DEFAULT_ROUTES를 모두 검사한다. postbuild에서 자동 실행되어 Vercel 빌드도 막는다 (T2.22).
// 의존성 없음(Node 내장만). 라우트마다 마지막 줄은 docs/design/bundle-log.md 표에 붙여넣는 형식이다.
import { readFileSync, existsSync } from "node:fs";
import { gzipSync } from "node:zlib";
import { resolve } from "node:path";

/**
 * 기본 검사 라우트. 홈 예산(CLAUDE.md 9장)은 실제 홈인 오늘 탭(/today) 기준이고,
 * 랜딩(/)은 모든 라우트가 공유하는 루트 첫 로드(루트 레이아웃, error, global-error, not-found)의 지표다.
 * 앱 셸에 새 탭이나 첫 화면이 생기면 여기에 더한다.
 */
const DEFAULT_ROUTES = ["/", "/today"];

function arg(name, fallback) {
  const i = process.argv.indexOf(`--${name}`);
  return i !== -1 && process.argv[i + 1] ? process.argv[i + 1] : fallback;
}

function args(name) {
  const out = [];
  process.argv.forEach((v, i) => {
    if (v === `--${name}` && process.argv[i + 1]) out.push(process.argv[i + 1]);
  });
  return out;
}

const routes = args("route").length > 0 ? args("route") : DEFAULT_ROUTES;
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
const kb = (n) => (n / 1024).toFixed(1);
const today = new Date().toLocaleDateString("sv-SE", {
  timeZone: "Asia/Seoul",
});

/** 한 라우트의 첫 로드 청크를 gzip(level 9)으로 재고 출력한다. 예산 초과면 false */
function report(route) {
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
    return {
      path: p,
      raw: buf.length,
      gzip: gzipSync(buf, { level: 9 }).length,
    };
  });

  const totalRaw = rows.reduce((s, r) => s + r.raw, 0);
  const totalGzip = rows.reduce((s, r) => s + r.gzip, 0);
  const over = totalGzip / 1024 > budgetKb;

  console.log(`라우트 ${route} 첫 로드 JS (${rows.length}개 청크)`);
  for (const r of rows) {
    console.log(
      `  ${kb(r.gzip).padStart(7)} KB gzip  ${kb(r.raw).padStart(7)} KB raw  ${r.path}`,
    );
  }
  console.log(
    `합계: ${kb(totalGzip)} KB gzip (raw ${kb(totalRaw)} KB), 예산 ${budgetKb} KB, 여유 ${(budgetKb - totalGzip / 1024).toFixed(1)} KB`,
  );
  console.log(`| ${today} | | | | +? KB | ${kb(totalGzip)} KB (\`${route}\`) | |`);
  console.log("");
  return { route, total: totalGzip, over };
}

console.log(
  `| 날짜 | 패키지@버전 | 용도 | 로딩 방식 | 홈 번들 영향 (gzip) | 누적 (gzip, 예산 ${budgetKb}KB) | 비고 |`,
);
console.log("");
const results = routes.map(report);
const failed = results.filter((r) => r.over);
if (failed.length > 0) {
  for (const r of failed)
    console.error(`예산 초과: ${r.route} ${kb(r.total)} KB > ${budgetKb} KB`);
  console.error(
    "원인 추적: pnpm analyze 후 next analyze export --route <경로>. 줄일 수 없으면 docs/design/bundle-log.md에 기록하고 사용자에게 묻습니다.",
  );
  process.exit(1);
}
console.log(
  `번들 예산 통과: ${results.map((r) => `${r.route} ${kb(r.total)} KB`).join(", ")} (예산 ${budgetKb} KB)`,
);
