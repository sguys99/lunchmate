#!/usr/bin/env node
/**
 * PWA 산출물 생성 (T8.2, PRD APP-01, design-decisions D-18 안건 3, 4, 5, 10)
 *
 * 사용법
 *   pnpm pwa:assets            아이콘과 iOS 시작 이미지를 만들어 저장소에 쓴다(결과는 커밋한다)
 *   pnpm pwa:assets --check    다시 만들어 보고 디스크와 다르면 exit 1(파일을 쓰지 않음)
 *
 * 만드는 것
 *   public/pwa/icon-{192,512}.png               매니페스트 any (샌드 바탕, 풀 블리드)
 *   public/pwa/icon-maskable-{192,512}.png      매니페스트 maskable (같은 그림, 이미 지름 80% 안전 원 안)
 *   public/pwa/icon-monochrome-512.png          매니페스트 monochrome (투명 바탕 단색 기호, 안드로이드는 알파만 쓴다)
 *   public/pwa/startup-<W>x<H>-<light|dark>.png iOS 시작 이미지(apple-touch-startup-image), 기기 크기마다
 *   src/app/icon.svg                            SVG 파비콘(tiny 단계, 모서리 20 둥근 면)
 *   src/app/apple-icon.png                      180 (iOS 홈 화면, iOS가 마스크를 건다)
 *   src/app/favicon.ico                         16 + 32 PNG를 담은 ICO (새 의존성 없이 직접 감싼다)
 *
 * 렌더: 이미 의존성인 Playwright Chromium이 SVG 문자열을 담은 HTML(setContent)을 그려 스크린샷으로 저장한다.
 * 앱 서버, 디자인 랩 라우트가 필요 없다. 그림은 src/features/pwa/icon-art.ts, 색은 `pnpm tokens` 생성 상수,
 * 기기 목록은 src/features/pwa/assets.ts 한 곳에서 읽는다. DESIGN.md 색이나 그림을 바꾸면 다시 돌린다.
 */
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "@playwright/test";

const repo = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const ts = (rel) => import(new URL(`../${rel}`, import.meta.url).href);

const art = await ts("src/features/pwa/icon-art.ts");
const assets = await ts("src/features/pwa/assets.ts");
const { sharePalette } = await ts("src/lib/design/share-palette.generated.ts");
const { pwaColors } = await ts("src/lib/design/pwa-colors.generated.ts");

const check = process.argv.includes("--check");

const sand = art.sandInk(sharePalette);
// monochrome은 알파만 쓰이므로 색은 상관없다. 생성 상수 가운데 글자색을 쓴다
const mono = art.monoInk(sharePalette.foreground);

/** 출력 경로(저장소 기준) → 내용 */
const outputs = new Map();

function html(body, bg) {
  return `<!doctype html><html><head><meta charset="utf-8"><style>
html,body{margin:0;padding:0;width:100%;height:100%;background:${bg};}
body{display:flex;align-items:center;justify-content:center;}
svg{display:block;}
</style></head><body>${body}</body></html>`;
}

const browser = await chromium.launch();
try {
  const context = await browser.newContext({ deviceScaleFactor: 1 });
  const page = await context.newPage();

  async function renderSquare(svg, size, { transparent = false } = {}) {
    await page.setViewportSize({ width: size, height: size });
    await page.setContent(html(svg, "transparent"));
    return page.screenshot({
      type: "png",
      omitBackground: transparent,
      clip: { x: 0, y: 0, width: size, height: size },
    });
  }

  // 매니페스트 아이콘
  for (const size of [192, 512]) {
    const svg = art.appIconSvg({ ink: sand, level: art.levelFor(size), size });
    const png = await renderSquare(svg, size);
    outputs.set(`public${assets.PWA_DIR}/icon-${size}.png`, png);
    outputs.set(`public${assets.PWA_DIR}/icon-maskable-${size}.png`, png);
  }
  outputs.set(
    `public${assets.PWA_ICONS.monochrome512}`,
    await renderSquare(
      art.appIconSvg({ ink: mono, level: "full", size: 512 }),
      512,
      { transparent: true },
    ),
  );

  // Next 파일 규칙 아이콘
  outputs.set(
    "src/app/apple-icon.png",
    await renderSquare(
      art.appIconSvg({ ink: sand, level: art.levelFor(180), size: 180 }),
      180,
    ),
  );
  const favicon = (size) =>
    renderSquare(
      art.appIconSvg({ ink: sand, level: "tiny", size, radius: 20 }),
      size,
      { transparent: true },
    );
  outputs.set(
    "src/app/favicon.ico",
    pngsToIco([
      { size: 16, png: await favicon(16) },
      { size: 32, png: await favicon(32) },
    ]),
  );
  outputs.set(
    "src/app/icon.svg",
    Buffer.from(
      art.appIconSvg({ ink: sand, level: "tiny", radius: 20 }) + "\n",
      "utf8",
    ),
  );

  // iOS 시작 이미지: 앱 배경(라이트 샌드, 다크 차콜) 가운데 아이콘(iOS 둥근 사각 22.37%)
  for (const scheme of assets.STARTUP_SCHEMES) {
    const bg = scheme === "dark" ? pwaColors.dark : pwaColors.light;
    for (const d of assets.STARTUP_DEVICES) {
      const sctx = await browser.newContext({
        deviceScaleFactor: d.dpr,
        viewport: { width: d.w, height: d.h },
      });
      const sp = await sctx.newPage();
      const icon = art.appIconSvg({
        ink: sand,
        level: "full",
        size: assets.STARTUP_ICON_PT,
        radius: 22.37,
      });
      await sp.setContent(html(icon, bg));
      const png = await sp.screenshot({ type: "png" });
      await sctx.close();
      outputs.set(`public${assets.startupImagePath(d, scheme)}`, png);
    }
  }
} finally {
  await browser.close();
}

/**
 * PNG 여러 장을 ICO 컨테이너로 감싼다(Windows Vista 이후와 모든 최신 브라우저가 PNG 내장 ICO를 읽는다).
 * 구조: ICONDIR(6바이트) + ICONDIRENTRY(16바이트 x n) + PNG 데이터.
 */
function pngsToIco(images) {
  const header = Buffer.alloc(6);
  header.writeUInt16LE(0, 0); // 예약
  header.writeUInt16LE(1, 2); // 1 = 아이콘
  header.writeUInt16LE(images.length, 4);
  const entries = [];
  let offset = 6 + 16 * images.length;
  for (const { size, png } of images) {
    const e = Buffer.alloc(16);
    e.writeUInt8(size >= 256 ? 0 : size, 0); // 폭(256은 0)
    e.writeUInt8(size >= 256 ? 0 : size, 1); // 높이
    e.writeUInt8(0, 2); // 팔레트 수
    e.writeUInt8(0, 3); // 예약
    e.writeUInt16LE(1, 4); // 색 평면
    e.writeUInt16LE(32, 6); // 픽셀당 비트
    e.writeUInt32LE(png.length, 8);
    e.writeUInt32LE(offset, 12);
    offset += png.length;
    entries.push(e);
  }
  return Buffer.concat([header, ...entries, ...images.map((i) => i.png)]);
}

let changed = 0;
for (const [rel, content] of outputs) {
  const abs = path.join(repo, rel);
  let current = null;
  try {
    current = await readFile(abs);
  } catch {
    // 새 파일
  }
  if (current && Buffer.compare(current, content) === 0) continue;
  changed++;
  if (check) {
    console.error(`다름: ${rel}`);
    continue;
  }
  await mkdir(path.dirname(abs), { recursive: true });
  await writeFile(abs, content);
  console.log(`생성: ${rel} (${(content.length / 1024).toFixed(1)} KB)`);
}

const total = [...outputs.values()].reduce((n, b) => n + b.length, 0);
console.log(
  `${outputs.size}개 파일, 합계 ${(total / 1024).toFixed(1)} KB, 바뀐 파일 ${changed}개`,
);
if (check && changed > 0) {
  console.error("pnpm pwa:assets로 다시 만드세요.");
  process.exit(1);
}
