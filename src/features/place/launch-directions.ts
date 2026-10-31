// 길찾기 실행: 앱 시도 → 미설치면 웹, 데스크톱은 바로 웹 (T5.36 NAV-01, T5.37 NAV-02, NAV-03).
// 미설치 감지는 공식 문서의 타이머 방식을 따른다(guide.ncloud-docs.com/docs/maps-url-scheme, iOS 예시 1500ms).
// 앱이 열리면 페이지가 가려진다(visibilitychange hidden, pagehide). blur는 쓰지 않는다: iOS Safari가 "열 수 없는 주소"
// 경고를 띄울 때도 blur가 날 수 있어 미설치를 설치로 잘못 볼 수 있다. 정해진 시간 안에 가려지지 않으면 앱이 없다고 보고
// 네이버 지도 웹 길찾기로 보낸다. 앱에서 오래 있다 돌아와 타이머가 늦게 불린 경우(경과가 길면)에는 웹을 열지 않는다.
//
// 브라우저 API는 env로 주입한다(테스트에서 가짜 타이머와 이벤트를 쓴다). 실제 값은 browserLaunchEnv().
import {
  isMobileUserAgent,
  naverWebWalkUrl,
  nmapWalkUrl,
  type DirectionsOrigin,
  type DirectionsPoint,
} from "@/lib/naver/directions";

/** 앱을 띄운 뒤 웹으로 넘어가기까지 기다리는 시간 (공식 예시 1500ms) */
export const APP_DETECT_TIMEOUT_MS = 1500;
/** 타이머가 이보다 늦게 불렸으면 앱이 열렸다가 돌아온 것으로 본다 (공식 예시 2000ms) */
export const APP_DETECT_LATE_MS = 2000;

export type DirectionsResult = "app" | "web";

export type LaunchEnv = {
  userAgent: string;
  /** iPadOS Safari는 데스크톱 UA를 쓴다. 터치 지점 수로 가린다 */
  maxTouchPoints: number;
  now: () => number;
  setTimer: (fn: () => void, ms: number) => unknown;
  clearTimer: (id: unknown) => void;
  /** 지금 탭에서 이동 */
  navigate: (url: string) => void;
  /** 새 탭으로 연다(데스크톱) */
  openWindow: (url: string) => void;
  isHidden: () => boolean;
  /** 페이지가 가려지는 신호 구독. 해제 함수를 돌려준다 */
  onHide: (fn: () => void) => () => void;
};

export type LaunchArgs = {
  destination: DirectionsPoint;
  origin: DirectionsOrigin | null;
  appname: string;
};

export function isMobileEnv(
  env: Pick<LaunchEnv, "userAgent" | "maxTouchPoints">,
) {
  if (isMobileUserAgent(env.userAgent)) return true;
  // iPadOS 13+ Safari: "Macintosh" UA + 터치
  return /Macintosh/i.test(env.userAgent) && env.maxTouchPoints > 1;
}

/**
 * 길찾기를 연다. 반환 값은 분석 이벤트 directions_clicked.app_or_web에 쓴다.
 * 사용자 탭 안에서 동기로 불러야 한다(새 탭, 앱 실행이 사용자 동작으로 인정되게).
 */
export function launchDirections(
  args: LaunchArgs,
  env: LaunchEnv,
): Promise<DirectionsResult> {
  const web = naverWebWalkUrl(args);
  if (!isMobileEnv(env)) {
    env.openWindow(web);
    return Promise.resolve("web");
  }

  const app = nmapWalkUrl(args);
  return new Promise((resolve) => {
    const started = env.now();
    let done = false;
    const finish = (result: DirectionsResult) => {
      if (done) return;
      done = true;
      env.clearTimer(timer);
      unsubscribe();
      resolve(result);
    };
    const unsubscribe = env.onHide(() => finish("app"));
    const timer = env.setTimer(() => {
      if (done) return;
      const late = env.now() - started >= APP_DETECT_LATE_MS;
      if (env.isHidden() || late) {
        finish("app");
        return;
      }
      env.navigate(web);
      finish("web");
    }, APP_DETECT_TIMEOUT_MS);
    env.navigate(app);
  });
}

/** 실제 브라우저 환경. 서버에서 부르면 안 된다 */
export function browserLaunchEnv(): LaunchEnv {
  return {
    userAgent: navigator.userAgent,
    maxTouchPoints: navigator.maxTouchPoints ?? 0,
    now: () => Date.now(),
    setTimer: (fn, ms) => window.setTimeout(fn, ms),
    clearTimer: (id) => window.clearTimeout(id as number),
    navigate: (url) => {
      window.location.href = url;
    },
    openWindow: (url) => {
      // window.open(noopener)은 열려도 null을 돌려줘 막힘을 가릴 수 없다. 사용자 탭 안의 링크 클릭은 팝업 차단 대상이 아니다
      const a = document.createElement("a");
      a.href = url;
      a.target = "_blank";
      a.rel = "noopener noreferrer";
      a.click();
    },
    isHidden: () => document.visibilityState === "hidden",
    onHide: (fn) => {
      const onVisibility = () => {
        if (document.visibilityState === "hidden") fn();
      };
      document.addEventListener("visibilitychange", onVisibility);
      window.addEventListener("pagehide", fn);
      return () => {
        document.removeEventListener("visibilitychange", onVisibility);
        window.removeEventListener("pagehide", fn);
      };
    },
  };
}
