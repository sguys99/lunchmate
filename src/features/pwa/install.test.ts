// 설치 유도 규칙 (T8.2, PRD APP-01 "3번째 방문부터 1회")
import vm from "node:vm";
import { describe, expect, it } from "vitest";
import { isIos, planInstall } from "./install-prompt";
import {
  INSTALL_SESSION_KEY,
  INSTALL_SHOWN_KEY,
  INSTALL_VISITS_KEY,
  installInitScript,
} from "./install-script";

const UA = {
  androidChrome:
    "Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Mobile Safari/537.36",
  iphoneSafari:
    "Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Mobile/15E148 Safari/604.1",
  ipadDesktop:
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Safari/605.1.15",
  kakaoIos:
    "Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148 KAKAOTALK 10.8.0",
};

function memoryStorage() {
  const m = new Map<string, string>();
  return {
    getItem: (k: string) => m.get(k) ?? null,
    setItem: (k: string, v: string) => void m.set(k, String(v)),
    map: m,
  };
}

/** 인라인 스크립트를 가짜 window에서 실행한다. 반환: window */
function runScript(opts: {
  path?: string;
  local: ReturnType<typeof memoryStorage>;
  session: ReturnType<typeof memoryStorage>;
}) {
  const listeners: Record<string, (e: unknown) => void> = {};
  const win: Record<string, unknown> = {
    localStorage: opts.local,
    sessionStorage: opts.session,
    location: { pathname: opts.path ?? "/today" },
    addEventListener: (t: string, fn: (e: unknown) => void) => {
      listeners[t] = fn;
    },
    dispatchEvent: () => true,
  };
  vm.runInContext(
    installInitScript(),
    vm.createContext({ window: win, Event: class {} }),
  );
  return { win, listeners };
}

describe("방문 세기 (인라인 스크립트)", () => {
  it("세션마다 한 번 세고, 3번째 방문부터 대상이 된다", () => {
    const local = memoryStorage();
    for (let visit = 1; visit <= 3; visit++) {
      const session = memoryStorage();
      const { win } = runScript({ local, session });
      // 같은 세션에서 다른 화면으로 다시 열어도 늘지 않는다
      runScript({ local, session, path: "/map" });
      expect(local.getItem(INSTALL_VISITS_KEY)).toBe(String(visit));
      expect(win.__lmInstallDue).toBe(visit >= 3);
      expect(session.getItem(INSTALL_SESSION_KEY)).toBe("1");
    }
  });

  it("한 번 보여 준 뒤에는 대상이 아니다", () => {
    const local = memoryStorage();
    local.setItem(INSTALL_VISITS_KEY, "7");
    local.setItem(INSTALL_SHOWN_KEY, "prompt");
    const { win } = runScript({ local, session: memoryStorage() });
    expect(win.__lmInstallDue).toBe(false);
  });

  it("시안, 관리자, 오프라인, 인증 경로는 세지 않는다", () => {
    const local = memoryStorage();
    for (const path of [
      "/design-lab/app-icon/a",
      "/admin",
      "/offline",
      "/auth/callback",
    ]) {
      runScript({ local, session: memoryStorage(), path });
    }
    expect(local.getItem(INSTALL_VISITS_KEY)).toBeNull();
  });

  it("저장소가 막혀도 오류 없이 넘어가고 설치 이벤트는 보관한다", () => {
    const throwing = {
      getItem: () => {
        throw new Error("blocked");
      },
      setItem: () => {
        throw new Error("blocked");
      },
      map: new Map(),
    };
    const { win, listeners } = runScript({
      local: throwing,
      session: throwing,
    });
    let prevented = false;
    const ev = { preventDefault: () => (prevented = true) };
    listeners.beforeinstallprompt?.(ev);
    expect(prevented).toBe(true);
    expect(win.__lmBip).toBe(ev);
  });

  it("appinstalled가 오면 다시 묻지 않도록 적는다", () => {
    const local = memoryStorage();
    const { listeners } = runScript({ local, session: memoryStorage() });
    listeners.appinstalled?.({});
    expect(local.getItem(INSTALL_SHOWN_KEY)).toBe("installed");
  });
});

describe("어디서 무엇을 보여 주는가 (planInstall)", () => {
  const base = { standalone: false, online: true, maxTouchPoints: 0 };

  it("안드로이드 Chrome은 설치 버튼 토스트", () => {
    expect(planInstall({ ...base, ua: UA.androidChrome })).toEqual({
      kind: "prompt",
    });
  });

  it("아이폰과 아이패드(데스크톱 UA)는 홈 화면에 추가 안내", () => {
    expect(planInstall({ ...base, ua: UA.iphoneSafari })).toEqual({
      kind: "ios",
    });
    expect(
      planInstall({ ...base, ua: UA.ipadDesktop, maxTouchPoints: 5 }),
    ).toEqual({ kind: "ios" });
    expect(isIos(UA.ipadDesktop, 0)).toBe(false);
  });

  it("카카오톡 인앱은 띄우지 않고 표시도 하지 않는다(다음에 일반 브라우저에서 묻는다)", () => {
    expect(planInstall({ ...base, ua: UA.kakaoIos })).toEqual({
      kind: "skip",
      markShown: false,
    });
  });

  it("이미 홈 화면 앱이면 설치됨으로 적고 끝", () => {
    expect(
      planInstall({ ...base, ua: UA.iphoneSafari, standalone: true }),
    ).toEqual({
      kind: "skip",
      markShown: true,
    });
  });

  it("오프라인이면 이번에는 묻지 않는다", () => {
    expect(
      planInstall({ ...base, ua: UA.androidChrome, online: false }),
    ).toEqual({
      kind: "skip",
      markShown: false,
    });
  });
});
