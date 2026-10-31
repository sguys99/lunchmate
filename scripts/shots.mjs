#!/usr/bin/env node
/**
 * 시안 캡처 스크립트 (T0.29, CLAUDE.md 6.1절, tasks.md 2.3절)
 *
 * 사용법
 *   pnpm shots /design-lab/home/d1 [/design-lab/landing/b ...] [옵션]
 *
 * 옵션
 *   --base-url <url>   기본 http://localhost:3000. 응답이 없으면 `pnpm dev`를 띄우고 끝나면 종료한다.
 *   --out <dir>        기본 docs/design/shots. 실제 저장은 <dir>/<YYYY-MM-DD, KST>/
 *   --full-page <bool> 기본 true. false면 뷰포트 영역만 캡처
 *                      화면형 시안(하단 탭, 하단 액션, 지도 칸이 sticky인 /design-lab/system/<a|b|c>/<home|sheet>)은
 *                      false로 찍는다. fullPage는 뷰포트를 늘리지 않고 이어 붙이므로 sticky 요소가 첫 뷰포트
 *                      위치(화면 중간)에 찍힌다. 문서형 페이지(/design-lab/system/tokens 견본표)는 기본값 true.
 *   --states           4상태(loading, empty, error, offline)도 함께 캡처
 *   --wait <ms>        페이지 준비 후 추가 대기. 기본 300
 *
 * 4상태 쿼리 규약 (시안 페이지가 따라야 한다)
 *   ?state=loading | ?state=empty | ?state=error | ?state=offline
 *   쿼리가 없으면 정상(데이터 있음) 상태를 렌더한다. 기존 쿼리가 있으면 &state=로 덧붙인다.
 *
 * 캡처 조건
 *   390px(deviceScaleFactor 2, 모바일 터치) / 1280px(deviceScaleFactor 1)
 *   × light / dark(colorScheme 에뮬레이션, prefers-color-scheme 기준 토큰)
 *   reducedMotion 'reduce' 고정, networkidle, document.fonts.ready 대기
 *
 * 파일명
 *   <route-slug>__<390|1280>__<light|dark>[__<state>].png
 *   route-slug: 경로의 / 를 - 로 바꾼 값, 루트(/)는 root
 */
import { spawn } from "node:child_process";
import { mkdir } from "node:fs/promises";
import path from "node:path";
import { parseArgs } from "node:util";

import { readFileSync } from "node:fs";
import { chromium } from "@playwright/test";

/** src/lib/fonts/web-fonts.ts의 "글꼴 받음" 표시 키와 버전(TS 파일이라 값만 읽는다) */
const WEB_FONTS = (() => {
  const src = readFileSync(
    new URL("../src/lib/fonts/web-fonts.ts", import.meta.url),
    "utf8",
  );
  const pick = (name) => src.match(new RegExp(`${name} = "([^"]+)"`))?.[1];
  return {
    key: pick("WEB_FONTS_STORAGE_KEY") ?? "lm-fonts",
    version: pick("WEB_FONTS_VERSION") ?? "v1",
  };
})();

const STATES = ["loading", "empty", "error", "offline"];
const VIEWPORTS = [
  {
    width: 390,
    height: 844,
    deviceScaleFactor: 2,
    isMobile: true,
    hasTouch: true,
  },
  {
    width: 1280,
    height: 800,
    deviceScaleFactor: 1,
    isMobile: false,
    hasTouch: false,
  },
];
const SCHEMES = ["light", "dark"];

function usage(message) {
  if (message) console.error(`오류: ${message}\n`);
  console.error(
    "사용법: pnpm shots <route> [<route> ...] [--base-url URL] [--out DIR] [--full-page true|false] [--states] [--wait MS]",
  );
  process.exit(1);
}

function parseCli() {
  let parsed;
  try {
    parsed = parseArgs({
      allowPositionals: true,
      options: {
        "base-url": { type: "string", default: "http://localhost:3000" },
        out: { type: "string", default: "docs/design/shots" },
        "full-page": { type: "string", default: "true" },
        states: { type: "boolean", default: false },
        wait: { type: "string", default: "300" },
        help: { type: "boolean", short: "h", default: false },
      },
    });
  } catch (error) {
    usage(error instanceof Error ? error.message : String(error));
  }
  const { values, positionals } = parsed;
  if (values.help) usage();
  if (positionals.length === 0) usage("캡처할 경로를 하나 이상 지정하세요.");

  const routes = positionals.map((r) => (r.startsWith("/") ? r : `/${r}`));
  const wait = Number(values.wait);
  if (!Number.isFinite(wait) || wait < 0)
    usage("--wait는 0 이상의 숫자(ms)여야 합니다.");
  const fullPage = values["full-page"] !== "false";

  return {
    routes,
    baseUrl: values["base-url"].replace(/\/$/, ""),
    outRoot: values.out,
    fullPage,
    withStates: values.states,
    wait,
  };
}

/** KST(Asia/Seoul) 기준 YYYY-MM-DD */
function kstDateKey(date = new Date()) {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Seoul",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);
}

function routeSlug(route) {
  const pathname = route.split(/[?#]/)[0];
  const slug = pathname
    .replace(/^\/+|\/+$/g, "")
    .replace(/[^a-zA-Z0-9_-]+/g, "-")
    .replace(/-+/g, "-");
  return slug || "root";
}

function withState(route, state) {
  if (!state) return route;
  const [beforeHash, hash] = route.split("#");
  const sep = beforeHash.includes("?") ? "&" : "?";
  return `${beforeHash}${sep}state=${state}${hash ? `#${hash}` : ""}`;
}

async function isUp(url) {
  try {
    const res = await fetch(url, {
      redirect: "manual",
      signal: AbortSignal.timeout(3000),
    });
    return res.status > 0;
  } catch {
    return false;
  }
}

async function ensureServer(baseUrl) {
  if (await isUp(baseUrl)) {
    console.log(`기존 서버 재사용: ${baseUrl}`);
    return null;
  }
  const port = new URL(baseUrl).port || "3000";
  console.log(`서버가 없어 pnpm dev를 시작합니다 (포트 ${port})...`);
  const child = spawn("pnpm", ["dev", "--port", port], {
    stdio: ["ignore", "ignore", "inherit"],
    detached: process.platform !== "win32",
    env: { ...process.env },
  });
  const deadline = Date.now() + 120_000;
  while (Date.now() < deadline) {
    if (child.exitCode !== null)
      throw new Error("pnpm dev가 시작 중에 종료되었습니다.");
    if (await isUp(baseUrl)) return child;
    await new Promise((r) => setTimeout(r, 1000));
  }
  stopServer(child);
  throw new Error("pnpm dev 준비 대기 시간(120초)을 넘겼습니다.");
}

function stopServer(child) {
  if (!child || child.exitCode !== null) return;
  try {
    // detached로 띄웠으므로 프로세스 그룹 전체(next dev 자식 포함)를 종료
    if (process.platform !== "win32" && child.pid)
      process.kill(-child.pid, "SIGTERM");
    else child.kill("SIGTERM");
  } catch {
    child.kill("SIGTERM");
  }
}

async function capture(browser, opts, outDir) {
  const created = [];
  const states = opts.withStates ? [null, ...STATES] : [null];

  for (const vp of VIEWPORTS) {
    for (const scheme of SCHEMES) {
      const context = await browser.newContext({
        viewport: { width: vp.width, height: vp.height },
        deviceScaleFactor: vp.deviceScaleFactor,
        isMobile: vp.isMobile,
        hasTouch: vp.hasTouch,
        colorScheme: scheme,
        reducedMotion: "reduce",
        locale: "ko-KR",
        timezoneId: "Asia/Seoul",
      });
      // 웹 글꼴은 첫 방문이면 화면이 뜬 뒤에 붙는다(src/lib/fonts/web-fonts.ts). 캡처는 최종 서체로 찍도록 재방문 표시를 미리 남긴다
      await context.addInitScript(
        ([k, v]) => {
          try {
            window.localStorage.setItem(k, v);
          } catch {}
        },
        [WEB_FONTS.key, WEB_FONTS.version],
      );
      const page = await context.newPage();
      for (const route of opts.routes) {
        for (const state of states) {
          const url = `${opts.baseUrl}${withState(route, state)}`;
          const res = await page.goto(url, {
            waitUntil: "networkidle",
            timeout: 60_000,
          });
          if (res && res.status() >= 400) {
            console.warn(`경고: ${url} 응답 ${res.status()}`);
          }
          // Next dev 표시기(왼쪽 아래 N 배지)는 시안이 아니므로 숨긴다
          await page.addStyleTag({
            content: "nextjs-portal { display: none !important; }",
          });
          await page.evaluate(() => document.fonts.ready);
          if (opts.wait > 0) await page.waitForTimeout(opts.wait);

          const name = [routeSlug(route), String(vp.width), scheme, state]
            .filter(Boolean)
            .join("__");
          const file = path.join(outDir, `${name}.png`);
          await page.screenshot({
            path: file,
            fullPage: opts.fullPage,
            animations: "disabled",
          });
          created.push(file);
        }
      }
      await context.close();
    }
  }
  return created;
}

async function main() {
  const opts = parseCli();
  const outDir = path.resolve(opts.outRoot, kstDateKey());
  await mkdir(outDir, { recursive: true });

  const server = await ensureServer(opts.baseUrl);
  const cleanup = () => stopServer(server);
  process.on("SIGINT", () => {
    cleanup();
    process.exit(130);
  });

  let browser;
  try {
    browser = await chromium.launch();
    const created = await capture(browser, opts, outDir);
    console.log(
      `\n캡처 ${created.length}장 → ${path.relative(process.cwd(), outDir)}/`,
    );
    for (const file of created)
      console.log(`  ${path.relative(process.cwd(), file)}`);
  } finally {
    await browser?.close();
    cleanup();
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
