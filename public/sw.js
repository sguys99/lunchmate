/*
 * 런치메이트 서비스 워커 (T8.3 오프라인 기본 화면, T8.4 캐시 범위, PRD APP-02, research-notes T0.16-3)
 *
 * 캐시 정책 (허용 목록 방식, CLAUDE.md 7장 "카카오 장소 데이터 저장, 캐싱 금지")
 * - 캐시하는 것은 앱 셸뿐이다. 같은 출처(이 사이트)의 GET 요청 가운데 아래만 넣는다.
 *   1) /_next/static/  빌드 산출물(JS, CSS, 빌드에 들어간 일러스트와 이미지). 파일 이름에 해시가 있어 내용이 바뀌지 않는다.
 *   2) /fonts/          웹 글꼴 목록과 조각(버전 경로, next.config headers의 immutable)
 *   3) /offline         오프라인 폴백 HTML(로그인 정보, 장소 데이터가 없는 정적 화면). 설치 때 미리 받는다.
 *   4) /favicon.ico, /icon.svg, /apple-icon.png, /manifest.webmanifest, /pwa/icon-*.png (홈 화면 앱 아이콘과 매니페스트, T8.2)
 *      iOS 시작 이미지(/pwa/startup-*)는 홈 화면에 추가할 때 iOS가 따로 받으므로 넣지 않는다.
 * - 캐시하지 않는 것(명시적 제외, 허용 목록보다 먼저 검사):
 *   - 다른 출처 전부. 특히 카카오(dapi.kakao.com, *.kakao.com, *.kakaocdn.net, *.daumcdn.net, *.daum.net),
 *     네이버 지도(*.naver.com, *.naver.net, *.pstatic.net), Supabase(*.supabase.co), PostHog, Sentry.
 *     다른 출처 요청에는 respondWith를 부르지 않는다. 서비스 워커가 아예 손대지 않고 브라우저가 평소대로 처리한다.
 *   - 같은 출처의 /api/, /auth/, /_next/image, /_next/data/, RSC 요청(RSC 헤더, ?_rsc=), Range 요청, GET이 아닌 요청.
 *   - 페이지 HTML(네비게이션 응답). 로그인 사용자 화면이 들어 있을 수 있어 저장하지 않는다.
 *   - 응답이 200 basic이 아니거나 Cache-Control에 no-store, private가 있으면 허용 경로라도 넣지 않는다.
 * - 네비게이션: 네트워크 우선. 실패(오프라인)하면 미리 받아 둔 /offline을 보여 준다. 응답은 저장하지 않는다.
 * - 버전: 등록 주소의 ?v=(빌드마다 바뀜, src/lib/sw/register-script.ts). 새 버전이 활성화되면 이전 lm-shell-* 캐시를 지운다.
 * - 끄기: 등록 스크립트가 꺼진 환경(개발)에서는 등록을 해제하고 lm-shell-* 캐시를 지운다.
 *
 * 규칙 함수(classifyRequest, shouldCache, isCacheableResponse)는 src/lib/sw/sw-policy.test.ts가 이 파일을 그대로 읽어 검사한다.
 * 이 파일은 빌드를 거치지 않는 정적 파일이라 import 없이 브라우저가 바로 읽을 수 있는 문법만 쓴다.
 *
 * 출처: Next.js 16 PWA 가이드 node_modules/next/dist/docs/01-app/02-guides/progressive-web-apps.md
 * (https://nextjs.org/docs/app/guides/progressive-web-apps, sw.js 헤더 권장값),
 * MDN Service Worker API, Cache, FetchEvent.respondWith, NavigationPreloadManager (2026-11-01 확인)
 */

const CACHE_PREFIX = "lm-shell-";
const SW_VERSION =
  new URL(self.location.href).searchParams.get("v") || "0";
const CACHE_NAME = CACHE_PREFIX + SW_VERSION;
const OFFLINE_URL = "/offline";
/** 설치 때 오프라인 화면과 함께 미리 받는 정적 파일 수 상한 */
const PRECACHE_ASSET_LIMIT = 80;

/** 이 도메인과 그 하위 도메인 응답은 절대 캐시하지 않는다 */
const NEVER_CACHE_DOMAINS = [
  "kakao.com",
  "kakaocdn.net",
  "daumcdn.net",
  "daum.net",
  "naver.com",
  "naver.net",
  "pstatic.net",
  "supabase.co",
  "supabase.in",
  "posthog.com",
  "sentry.io",
];

/** 같은 출처라도 캐시하지 않는 경로 */
const NEVER_CACHE_PATH_PREFIXES = [
  "/api/",
  "/auth/",
  "/_next/image",
  "/_next/data/",
];

/** 캐시해도 되는 같은 출처 경로(앱 셸) */
const SHELL_PATH_PREFIXES = ["/_next/static/", "/fonts/"];
// 아이콘 경로는 src/features/pwa/assets.ts와 같아야 한다(sw-policy.test.ts가 대조한다)
const SHELL_EXACT_PATHS = [
  OFFLINE_URL,
  "/favicon.ico",
  "/icon.svg",
  "/apple-icon.png",
  "/manifest.webmanifest",
  "/pwa/icon-192.png",
  "/pwa/icon-512.png",
  "/pwa/icon-maskable-192.png",
  "/pwa/icon-maskable-512.png",
  "/pwa/icon-monochrome-512.png",
];

function hostMatches(hostname, domain) {
  return hostname === domain || hostname.endsWith("." + domain);
}

function isNeverCacheHost(hostname) {
  const host = String(hostname).toLowerCase();
  return NEVER_CACHE_DOMAINS.some(function (d) {
    return hostMatches(host, d);
  });
}

function headerOf(request, name) {
  const h = request && request.headers;
  if (!h || typeof h.get !== "function") return null;
  return h.get(name);
}

/**
 * 요청 하나를 어떻게 다룰지 정한다.
 * - "passthrough": 서비스 워커가 손대지 않는다(respondWith 없음, 캐시 없음)
 * - "navigate": 네트워크 우선, 실패하면 오프라인 화면(응답 저장 없음)
 * - "shell": 캐시 우선, 없으면 네트워크에서 받아 캐시에 넣는다
 * request는 { url, method, mode, headers } 꼴이면 된다(Request 그대로 넘겨도 된다).
 */
function classifyRequest(request, scopeOrigin) {
  if (!request || request.method !== "GET") return "passthrough";
  let url;
  try {
    url = new URL(request.url);
  } catch {
    return "passthrough";
  }
  if (url.protocol !== "https:" && url.protocol !== "http:") {
    return "passthrough";
  }
  if (isNeverCacheHost(url.hostname)) return "passthrough";
  if (url.origin !== scopeOrigin) return "passthrough";

  const path = url.pathname;
  if (
    NEVER_CACHE_PATH_PREFIXES.some(function (p) {
      return path.startsWith(p);
    })
  ) {
    return "passthrough";
  }
  if (request.mode === "navigate") return "navigate";

  if (headerOf(request, "RSC") || url.searchParams.has("_rsc")) {
    return "passthrough";
  }
  if (headerOf(request, "Range")) return "passthrough";

  if (
    SHELL_EXACT_PATHS.indexOf(path) !== -1 ||
    SHELL_PATH_PREFIXES.some(function (p) {
      return path.startsWith(p);
    })
  ) {
    return "shell";
  }
  return "passthrough";
}

/** 이 요청의 응답을 캐시에 넣어도 되는가(테스트와 문서가 쓰는 이름, 처리기는 classifyRequest를 바로 쓴다) */
// eslint-disable-next-line @typescript-eslint/no-unused-vars
function shouldCache(request, scopeOrigin) {
  return classifyRequest(request, scopeOrigin) === "shell";
}

/** 받은 응답을 캐시에 넣어도 되는가(200, 같은 출처 basic, no-store/private 아님) */
function isCacheableResponse(response) {
  if (!response || response.status !== 200 || response.type !== "basic") {
    return false;
  }
  const cc = (headerOf(response, "Cache-Control") || "").toLowerCase();
  return !/no-store|private/.test(cc);
}

/** 오프라인 화면 HTML에서 그 화면이 쓰는 /_next/static 파일 주소를 뽑는다 */
function extractShellAssets(html) {
  const found = String(html).match(/\/_next\/static\/[A-Za-z0-9._~\-/%@]+/g);
  if (!found) return [];
  const seen = [];
  for (const raw of found) {
    const p = raw.replace(/[\\]+$/, "");
    if (seen.indexOf(p) === -1) seen.push(p);
    if (seen.length >= PRECACHE_ASSET_LIMIT) break;
  }
  return seen;
}

async function precacheShell() {
  const cache = await caches.open(CACHE_NAME);
  // 로그인 쿠키 없이 받는다: 오프라인 화면은 누구에게나 같은 정적 HTML이어야 한다
  const res = await fetch(OFFLINE_URL, {
    cache: "reload",
    credentials: "omit",
  });
  if (!res.ok) throw new Error("offline page " + res.status);
  const html = await res.clone().text();
  await cache.put(OFFLINE_URL, res);
  const assets = extractShellAssets(html);
  await Promise.all(
    assets.map(function (path) {
      return fetch(path, { credentials: "omit" })
        .then(function (r) {
          return isCacheableResponse(r) ? cache.put(path, r) : undefined;
        })
        .catch(function () {
          // 하나가 실패해도 설치는 계속한다(다음 방문 때 실행 중 캐시가 채운다)
        });
    }),
  );
}

async function handleNavigate(event) {
  try {
    const preloaded = await event.preloadResponse;
    if (preloaded) return preloaded;
    return await fetch(event.request);
  } catch {
    const cache = await caches.open(CACHE_NAME);
    const offline = await cache.match(OFFLINE_URL);
    return offline || Response.error();
  }
}

async function handleShell(request) {
  const cache = await caches.open(CACHE_NAME);
  const hit = await cache.match(request);
  if (hit) return hit;
  const res = await fetch(request);
  if (isCacheableResponse(res)) {
    cache.put(request, res.clone()).catch(function () {});
  }
  return res;
}

self.addEventListener("install", function (event) {
  event.waitUntil(
    precacheShell().then(function () {
      return self.skipWaiting();
    }),
  );
});

self.addEventListener("activate", function (event) {
  event.waitUntil(
    (async function () {
      const keys = await caches.keys();
      await Promise.all(
        keys
          .filter(function (k) {
            return k.startsWith(CACHE_PREFIX) && k !== CACHE_NAME;
          })
          .map(function (k) {
            return caches.delete(k);
          }),
      );
      if (self.registration && self.registration.navigationPreload) {
        await self.registration.navigationPreload.enable();
      }
      await self.clients.claim();
    })(),
  );
});

self.addEventListener("fetch", function (event) {
  const kind = classifyRequest(event.request, self.location.origin);
  if (kind === "navigate") {
    event.respondWith(handleNavigate(event));
  } else if (kind === "shell") {
    event.respondWith(handleShell(event.request));
  }
  // passthrough: respondWith를 부르지 않는다(카카오, 네이버, Supabase 등 다른 출처와 /api/는 여기)
});
