// 홈 화면 설치 유도 (T8.2, PRD APP-01 "설치 유도는 3번째 방문부터 1회").
// InstallPromptLoader가 조건(window.__lmInstallDue)이 맞을 때만 유휴 시간에 이 청크를 받는다. 홈 첫 로드에 들지 않는다.
//
// UI는 새로 만들지 않고 기존 토스트(lazy-toaster, DESIGN.md에 설치 유도 문법이 없어 토스트 문법 재사용)를 쓴다.
// 하단 탭 위에 떠서 화면을 밀지 않고(레이아웃 이동 없음), 몇 초 뒤 스스로 사라진다.
//
// 판정 순서
// 1. 오프라인이면 이번에는 묻지 않는다(표시하지 않음, 다음 방문에 다시 판정).
// 2. 이미 홈 화면 앱으로 열렸으면(display-mode standalone, iOS navigator.standalone) "설치됨"으로 적고 끝.
// 3. 인앱 브라우저(카카오톡 등, src/lib/inapp.ts)에서는 띄우지 않는다. 표시도 하지 않아 다음에 일반 브라우저에서 열면 묻는다.
//    근거: 인앱 웹뷰는 설치 창(beforeinstallprompt)도 "홈 화면에 추가"도 없어서 안내해도 바로 할 수 없고,
//    "외부 브라우저로 열기"를 더 권하면 투표 링크로 막 들어온 사람의 할 일(투표, 추천 보기)을 가로막는 두 번째 안내가 된다.
//    외부 브라우저 안내는 로그인 때(AUTH-04) 이미 한다.
// 4. iOS(아이폰, 아이패드): 웹에서 설치 창을 띄울 수 없어 "공유 > 홈 화면에 추가" 방법을 토스트로 안내한다.
// 5. 그 밖: 보관된 beforeinstallprompt가 있으면(또는 15초 안에 오면) "설치" 버튼 토스트. 누르면 브라우저 설치 창(prompt()).
//    이벤트가 없는 브라우저(파이어폭스, 데스크톱 사파리 등)는 묻지 않는다(표시하지 않음).
// 토스트를 띄운 순간 "보여 줌"으로 적어 다시 묻지 않는다(1회). 분석 이벤트는 PRD 10.2에 설치 이벤트가 없어 보내지 않는다.
import { toast } from "@/components/ui/lazy-toaster";
import { pwaCopy } from "@/copy/pwa";
import { detectInApp } from "@/lib/inapp";
import { INSTALL_SHOWN_KEY } from "./install-script";

/** Chrome 계열의 beforeinstallprompt 이벤트(표준 lib.dom에 없음) */
export type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};

type InstallWindow = Window & {
  __lmInstallDue?: boolean;
  __lmBip?: BeforeInstallPromptEvent | null;
};

/** 설치 이벤트를 기다리는 최대 시간 */
const BIP_WAIT_MS = 15_000;
const DURATION_MS = { android: 10_000, ios: 15_000 } as const;

export type InstallEnv = {
  ua: string;
  standalone: boolean;
  online: boolean;
  /** iPadOS 데스크톱 UA 판정용 */
  maxTouchPoints: number;
};

export type InstallPlan =
  { kind: "skip"; markShown: boolean } | { kind: "ios" } | { kind: "prompt" };

export function isIos(ua: string, maxTouchPoints: number): boolean {
  if (/iphone|ipad|ipod/i.test(ua)) return true;
  // iPadOS 13 이후 사파리는 맥 UA를 쓴다. 터치 지점이 있으면 아이패드로 본다
  return /macintosh/i.test(ua) && maxTouchPoints > 1;
}

/** 순수 판정(테스트용). beforeinstallprompt 유무는 실행 때 따로 본다 */
export function planInstall(env: InstallEnv): InstallPlan {
  if (!env.online) return { kind: "skip", markShown: false };
  if (env.standalone) return { kind: "skip", markShown: true };
  if (detectInApp(env.ua)) return { kind: "skip", markShown: false };
  if (isIos(env.ua, env.maxTouchPoints)) return { kind: "ios" };
  return { kind: "prompt" };
}

function markShown(value: string) {
  try {
    window.localStorage.setItem(INSTALL_SHOWN_KEY, value);
  } catch {
    // 저장이 막힌 환경: 이번 세션에서만 다시 묻지 않는다
  }
  (window as InstallWindow).__lmInstallDue = false;
}

function readEnv(): InstallEnv {
  const nav = navigator as Navigator & { standalone?: boolean };
  return {
    ua: nav.userAgent,
    standalone:
      nav.standalone === true ||
      window.matchMedia?.("(display-mode: standalone)").matches === true,
    online: nav.onLine !== false,
    maxTouchPoints: nav.maxTouchPoints ?? 0,
  };
}

function waitForBip(
  w: InstallWindow,
): Promise<BeforeInstallPromptEvent | null> {
  if (w.__lmBip) return Promise.resolve(w.__lmBip);
  return new Promise((resolve) => {
    const done = () => {
      window.removeEventListener("lm:bip", done);
      window.clearTimeout(timer);
      resolve(w.__lmBip ?? null);
    };
    const timer = window.setTimeout(done, BIP_WAIT_MS);
    window.addEventListener("lm:bip", done);
  });
}

const copy = pwaCopy.install;

export async function runInstallPrompt(): Promise<void> {
  const w = window as InstallWindow;
  if (!w.__lmInstallDue) return;
  const plan = planInstall(readEnv());
  if (plan.kind === "skip") {
    if (plan.markShown) markShown("installed");
    return;
  }
  if (plan.kind === "ios") {
    markShown("ios");
    await toast(copy.title, {
      id: "lm-install",
      description: copy.iosBody,
      duration: DURATION_MS.ios,
      cancel: { label: copy.iosDismiss, onClick: () => {} },
    });
    return;
  }
  const bip = await waitForBip(w);
  if (!bip || !w.__lmInstallDue) return;
  markShown("prompt");
  await toast(copy.title, {
    id: "lm-install",
    description: copy.body,
    duration: DURATION_MS.android,
    action: {
      label: copy.action,
      onClick: () => {
        w.__lmBip = null;
        void bip.prompt().catch(() => {
          // 이미 쓴 이벤트이거나 브라우저가 거절: 조용히 끝낸다(다시 묻지 않음)
        });
      },
    },
  });
}
