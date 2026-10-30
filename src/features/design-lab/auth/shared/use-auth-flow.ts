"use client";
// 로그인 시안 흐름 (T4.2). 세 시안이 같은 상태 기계를 쓰고 그리는 방식만 다르다.
//   prompt(로그인 유도) --카카오, 네이버--> (제공자로 이동하는 척 0.9초) --> terms(첫 로그인 약관 동의)
//   prompt --구글 + 인앱--> inapp(외부 브라우저 안내, AC-AUTH-2: OAuth 오류 화면 대신)
//   terms --필수 모두 동의--> 온보딩(시안은 토스트)
// 환경: 쿼리 상태 + 실제 브라우저 상태(오프라인, 인앱 UA). 서버 렌더와 첫 렌더는 쿼리 값만 쓴다.
import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { toast } from "@/components/ui/lazy-toaster";
import {
  authLabCopy,
  type AuthInApp,
  type AuthOs,
  type AuthTermId,
} from "@/copy/design-lab-auth";
import type { DesignState } from "@/features/design-lab/mock";
import { inAppGuide, type InAppGuide } from "./inapp";
import {
  detectInAppUserAgent,
  detectOs,
  type AuthParams,
  type AuthProvider,
  type AuthView,
} from "./params";
import {
  canSubmit,
  EMPTY_CONSENT,
  missingRequired,
  setItem,
  toggleAll,
  type Consent,
} from "./terms";

const copy = authLabCopy;
/** 제공자로 이동하는 척하는 시간 (시안) */
const REDIRECT_MS = 900;
/** 외부 열기를 시도한 뒤에도 화면이 보이면 수동 안내로 바꾸는 시간 (research-notes T0.17) */
const EXTERNAL_FALLBACK_MS = 1500;

function subscribeOnline(onChange: () => void) {
  window.addEventListener("online", onChange);
  window.addEventListener("offline", onChange);
  return () => {
    window.removeEventListener("online", onChange);
    window.removeEventListener("offline", onChange);
  };
}
const noop = () => () => {};

export type AuthEnv = {
  state: DesignState;
  offline: boolean;
  inApp: AuthInApp | null;
  os: AuthOs;
};

export function useAuthEnv(params: AuthParams): AuthEnv {
  const browserOffline = useSyncExternalStore(
    subscribeOnline,
    () => !navigator.onLine,
    () => false,
  );
  const uaInApp = useSyncExternalStore(
    noop,
    () => detectInAppUserAgent(navigator.userAgent),
    () => null,
  );
  const uaOs = useSyncExternalStore(
    noop,
    () => detectOs(navigator.userAgent),
    () => null,
  );
  const offline = params.state === "offline" || browserOffline;
  const inApp = params.inApp ?? uaInApp;
  return {
    state: offline ? "offline" : params.state,
    offline,
    inApp,
    // 실기기 인앱이면 UA의 OS를 믿는다. 아니면 쿼리 값
    os: uaInApp && uaOs ? uaOs : params.os,
  };
}

export type PromptNotice = "cancelled" | "error" | null;

export type AuthFlow = ReturnType<typeof useAuthFlow>;

export function useAuthFlow(params: AuthParams) {
  const env = useAuthEnv(params);
  const at = (view: AuthView, s: DesignState) =>
    params.view === view && params.state === s;

  const [step, setStep] = useState<AuthView>(params.view);
  const [pending, setPending] = useState<AuthProvider | null>(
    at("prompt", "loading") ? "kakao" : null,
  );
  const [notice, setNotice] = useState<PromptNotice>(
    at("prompt", "error")
      ? "error"
      : at("prompt", "empty")
        ? "cancelled"
        : null,
  );
  const [provider, setProvider] = useState<AuthProvider>(params.provider);
  // 저장 실패 상태는 "고른 항목은 그대로" 보여 주려고 필수를 켠 채 시작한다
  const [consent, setConsent] = useState<Consent>(
    at("terms", "error")
      ? { age: true, service: true, privacy: true, marketing: false }
      : EMPTY_CONSENT,
  );
  const [attempted, setAttempted] = useState(false);
  const [submitError, setSubmitError] = useState(at("terms", "error"));
  const [submitting, setSubmitting] = useState(false);
  const [doc, setDoc] = useState<AuthTermId | null>(null);
  const [opening, setOpening] = useState(
    at("inapp", "loading") && params.os === "android",
  );
  const [openFailed, setOpenFailed] = useState(at("inapp", "error"));
  const timers = useRef<number[]>([]);

  useEffect(
    () => () => {
      for (const t of timers.current) window.clearTimeout(t);
    },
    [],
  );

  function later(fn: () => void, ms: number) {
    timers.current.push(window.setTimeout(fn, ms));
  }

  const inApp = env.inApp;
  const guide: InAppGuide | null = inApp ? inAppGuide(inApp, env.os) : null;
  const appName = inApp ? copy.inapp.appNames[inApp] : "";
  const termsLoading =
    step === "terms" && params.view === "terms" && params.state === "loading";

  function pick(id: AuthProvider) {
    if (env.offline || pending) return;
    if (id === "google" && inApp) {
      setNotice(null);
      setStep("inapp");
      return;
    }
    setNotice(null);
    setPending(id);
    later(() => {
      setPending(null);
      if (params.state === "error") {
        setNotice("error");
        return;
      }
      setProvider(id);
      setConsent(EMPTY_CONSENT);
      setAttempted(false);
      setStep("terms");
    }, REDIRECT_MS);
  }

  function toggleAllItems() {
    setConsent((c) => toggleAll(c));
  }

  function setTerm(id: AuthTermId, checked: boolean) {
    setConsent((c) => setItem(c, id, checked));
  }

  /** 시작하기. 필수가 빠졌으면 false를 돌려주고 첫 빠진 항목 id를 알려 준다 */
  function submit(): { ok: boolean; firstMissing?: AuthTermId } {
    if (env.offline || submitting) return { ok: false };
    if (!canSubmit(consent)) {
      setAttempted(true);
      return { ok: false, firstMissing: missingRequired(consent)[0] };
    }
    setSubmitError(false);
    setSubmitting(true);
    later(() => {
      setSubmitting(false);
      void toast(copy.terms.doneToast);
    }, 700);
    return { ok: true };
  }

  function openExternal() {
    if (!guide?.canAutoOpen || env.offline || opening) return;
    // 실제 구현은 여기서 location.href = externalOpenUrl(app, location.href) (사용자 탭 안에서 동기 호출)
    setOpenFailed(false);
    setOpening(true);
    later(() => {
      setOpening(false);
      if (document.visibilityState === "visible") setOpenFailed(true);
    }, EXTERNAL_FALLBACK_MS);
  }

  async function copyLink() {
    try {
      await navigator.clipboard.writeText(window.location.href);
      void toast(copy.inapp.copied);
    } catch {
      void toast.error(copy.inapp.copyFailed);
    }
  }

  function backToPrompt() {
    setStep("prompt");
    setOpening(false);
  }

  return {
    env,
    params,
    step,
    setStep,
    pending,
    notice,
    provider,
    providerName: copy.providerNames[provider],
    consent,
    missing: missingRequired(consent),
    attempted,
    submitError,
    submitting,
    termsLoading,
    doc,
    setDoc,
    guide,
    appName,
    opening,
    openFailed,
    pick,
    toggleAllItems,
    setTerm,
    submit,
    openExternal,
    copyLink,
    backToPrompt,
  };
}

/** 단계가 바뀌면 그 단계 제목으로 포커스를 옮긴다. 첫 렌더(와 개발 모드 이중 실행)는 직전 값과 같아 건너뛴다 */
export function useFocusOnChange<T extends HTMLElement>(key: string) {
  const ref = useRef<T | null>(null);
  const prev = useRef(key);
  useEffect(() => {
    if (prev.current === key) return;
    prev.current = key;
    ref.current?.focus({ preventScroll: false });
  }, [key]);
  return ref;
}
