"use client";
// /beta 베타 환영 페이지 (T9.3, D-23: A 기기별 단계 목록 + C의 마루 부리 큰 제목, 리드 한 줄, 데스크톱은 A 2단).
// - 기기를 알아보고 "지금 할 일"만 펼친 세로 단계 목록. 인앱(카카오톡 등)이면 1 외부 브라우저 → 2 홈 화면 → 3 로그인.
//   지금 단계와 마친 단계는 내용을 펼치고, 다음 단계는 한 줄 요약. "다른 기기 보기"로 다른 기기 방법을 접어 둔다.
// - 주 버튼(올리브) 하나는 화면 아래: 인앱이면 "외부 브라우저로 열기" + 글자 버튼 "카카오톡에서 바로 시작"(D-23 안건 2),
//   그 밖은 "로그인하고 시작", 로그인했으면 "오늘 추천 보기"(/today). 로그인 주소는 내부 경로만(/login?next=%2Ftoday).
// - 외부 브라우저 열기는 로그인 화면(T4.10)과 같은 흐름: 사용자 탭 안에서 스킴(externalOpenUrl)으로 이동, 1.5초 뒤에도 화면이
//   보이면 실패(오류 상태)로 보고 메뉴 그림 + 링크 복사. 자동 열기 수단이 없는 앱은 처음부터 메뉴 안내만.
// - 홈 화면 앱(standalone)으로 열었으면 설치 단계 "마침"(D-23 안건 4). 안드로이드는 보관된 beforeinstallprompt(T8.2 install-script)가
//   있을 때만 "설치" 보조 버튼. 맥 UA 아이패드는 첫 렌더 뒤 아이폰 방법으로 고친다.
// - 4상태: 로딩(page Suspense 스켈레톤), 빈 상태(기기 모름: 기기 칩 3개), 오류(외부 열기 실패), 오프라인(위 안내 + 로그인 aria-disabled).
// - 첫 등장: 단계 줄이 70ms 간격으로 8px 떠오름(CSS la-step, 축소 모드는 없음). 접기는 grid-rows base. Motion 없음.
// - UA, 기기 판정 값은 저장하거나 분석 도구로 보내지 않는다. 분석 이벤트 없음(D-23 안건 17).
import { Download, MessageSquareText } from "lucide-react";
import Link from "next/link";
import {
  useEffect,
  useId,
  useRef,
  useState,
  useSyncExternalStore,
  type ReactNode,
} from "react";
import { buttonClass } from "@/components/ui/button-classes";
import { authCopy } from "@/copy/auth";
import { betaCopy as copy } from "@/copy/beta";
import { MenuDiagram } from "@/features/auth/auth-parts";
import { loginUrl } from "@/features/auth/routes";
import type { BeforeInstallPromptEvent } from "@/features/pwa/install-prompt";
import {
  externalOpenUrl,
  inAppGuide,
  type InApp,
  type InAppGuide,
} from "@/lib/inapp";
import { useOnlineStatus } from "@/lib/network";
import { cn } from "@/lib/utils";
import type { BetaEnv, BetaPlatform } from "./env";
import {
  BetaFrame,
  BottomZone,
  Collapsible,
  DevicePicker,
  OfflineLine,
  OpenFailedBlock,
  ShareDiagram,
  StepMark,
  textLink,
  type StepStatus,
} from "./parts";

/** 외부 열기를 시도한 뒤에도 화면이 보이면 실패로 보는 시간(로그인 화면과 같다, research-notes T0.17) */
const EXTERNAL_FALLBACK_MS = 1500;
const BETA_PATH = "/beta";
const HOME = "/today";

type Step = {
  key: string;
  title: string;
  status: StepStatus;
  /** 다음 단계일 때 보이는 한 줄 */
  summary: string;
  body: ReactNode;
};

type InstallWindow = Window & { __lmBip?: BeforeInstallPromptEvent | null };

const noSubscribe = () => () => {};

/** 브라우저에서만 아는 값. 서버 HTML과 첫 하이드레이션은 serverValue, 그 뒤 브라우저 값(useSyncExternalStore) */
function useClientValue<T>(read: () => T, serverValue: T): T {
  return useSyncExternalStore(noSubscribe, read, () => serverValue);
}

function readStandalone(): boolean {
  const nav = navigator as Navigator & { standalone?: boolean };
  return (
    nav.standalone === true ||
    window.matchMedia?.("(display-mode: standalone)").matches === true
  );
}

/** 맥 UA로 오는 아이패드 사파리 */
function readIpadAsMac(): boolean {
  return /macintosh/i.test(navigator.userAgent) && navigator.maxTouchPoints > 1;
}

/** 보관된 설치 이벤트(Chrome, Edge, 삼성 인터넷). 루트 인라인 스크립트가 일찍 잡아 둔다(T8.2) */
function useInstallEvent(): BeforeInstallPromptEvent | null {
  const [bip, setBip] = useState<BeforeInstallPromptEvent | null>(null);
  useEffect(() => {
    const w = window as InstallWindow;
    const read = () => setBip(w.__lmBip ?? null);
    read();
    window.addEventListener("lm:bip", read);
    return () => window.removeEventListener("lm:bip", read);
  }, []);
  return bip;
}

export function BetaWelcome({
  env,
  signedIn,
}: {
  env: BetaEnv;
  signedIn: boolean;
}) {
  const online = useOnlineStatus();
  const offline = !online;
  const standalone =
    useClientValue(readStandalone, false) || env.forceStandalone;
  const ipadAsMac = useClientValue(readIpadAsMac, false);
  const detected: BetaPlatform | null =
    env.platform === "desktop" && ipadAsMac ? "ios" : env.platform;
  const bip = useInstallEvent();
  const [others, setOthers] = useState(false);
  const [picked, setPicked] = useState<BetaPlatform | null>(null);
  const [opening, setOpening] = useState(false);
  const [openFailed, setOpenFailed] = useState(false);
  const timer = useRef<number | null>(null);
  const othersId = useId();

  useEffect(() => {
    const onShow = (e: PageTransitionEvent) => {
      if (e.persisted) setOpening(false);
    };
    window.addEventListener("pageshow", onShow);
    return () => {
      window.removeEventListener("pageshow", onShow);
      if (timer.current) window.clearTimeout(timer.current);
    };
  }, []);

  // 다른 기기를 고르면 그 기기의 일반 방법(인앱 단계 없이)을 보인다
  const platform = picked ?? detected;
  const inApp: InApp | null = picked ? null : env.inApp;
  const guide: InAppGuide | null = inApp ? inAppGuide(inApp, env.os) : null;
  const appName = inApp ? authCopy.inapp.appNames[inApp] : "";
  const nextHref = signedIn ? HOME : loginUrl(HOME);

  function betaUrl(): string {
    return new URL(BETA_PATH, window.location.origin).toString();
  }

  /** 반드시 사용자 탭 이벤트 안에서 동기로 부른다(스킴 이동은 사용자 제스처가 있어야 한다) */
  function openExternal() {
    if (!inApp || offline || opening) return;
    const url = externalOpenUrl(inApp, env.os, betaUrl());
    if (!url) {
      setOpenFailed(true);
      return;
    }
    setOpenFailed(false);
    setOpening(true);
    window.location.href = url;
    if (timer.current) window.clearTimeout(timer.current);
    timer.current = window.setTimeout(() => {
      setOpening(false);
      if (document.visibilityState === "visible") setOpenFailed(true);
    }, EXTERNAL_FALLBACK_MS);
  }

  const showExternalPrimary =
    guide !== null && guide.canAutoOpen && !openFailed;

  return (
    <BetaFrame>
      <div className="flex flex-col gap-3">
        <p className="type-caption text-muted-foreground">{copy.eyebrow}</p>
        <h1 className="type-display font-heading break-keep">{copy.title}</h1>
        <p className="type-body break-keep text-muted-foreground">
          {copy.lead}
        </p>
      </div>

      {platform === null ? (
        <section
          aria-labelledby={`${othersId}-pick`}
          className="mt-8 flex flex-col gap-4 border-t border-border pt-6"
        >
          <p className="flex flex-col gap-1">
            <span id={`${othersId}-pick`} className="type-label">
              {copy.states.empty.title}
            </span>
            <span className="type-body-sm break-keep text-muted-foreground">
              {copy.states.empty.body}
            </span>
          </p>
          <DevicePicker value={picked} onChange={setPicked} />
        </section>
      ) : (
        <>
          <div className="mt-6 flex flex-wrap items-center justify-between gap-x-4">
            <p className="type-caption text-muted-foreground">
              {standalone && !picked
                ? copy.standalone
                : inApp && env.os
                  ? copy.detectedInApp(appName, copy.devices[env.os])
                  : copy.detected(copy.devices[platform])}
            </p>
            <button
              type="button"
              aria-expanded={others}
              aria-controls={othersId}
              onClick={() => setOthers((v) => !v)}
              className={cn(textLink, "type-caption")}
            >
              {others ? copy.hideOtherDevices : copy.otherDevices}
            </button>
          </div>
          <Collapsible open={others} id={othersId}>
            <DevicePicker
              value={picked}
              onChange={setPicked}
              className="pt-3 pb-1"
            />
          </Collapsible>
          <Steps
            platform={platform}
            iosChrome={!picked && env.iosChrome === true}
            guide={guide}
            appName={appName}
            standalone={standalone && !picked}
            signedIn={signedIn}
            openFailed={openFailed}
            reopenLink={BETA_PATH}
            bip={platform === "android" && !inApp ? bip : null}
          />
          <section className="flex gap-4 border-y border-border py-5">
            <MessageSquareText
              aria-hidden
              className="mt-0.5 size-5 shrink-0 text-muted-foreground"
              strokeWidth={1.5}
            />
            <p className="flex flex-col gap-1">
              <span className="type-label">{copy.feedback.title}</span>
              <span className="type-body-sm break-keep text-muted-foreground">
                {copy.feedback.body}
              </span>
            </p>
          </section>
        </>
      )}

      <BottomZone>
        {offline ? <OfflineLine /> : null}
        {showExternalPrimary ? (
          <>
            <button
              type="button"
              onClick={openExternal}
              aria-disabled={offline || opening || undefined}
              className={cn(buttonClass("primary"), "w-full")}
            >
              {opening
                ? copy.steps.external.opening
                : copy.steps.external.action}
            </button>
            <NextLink
              href={nextHref}
              offline={offline && !signedIn}
              variant="ghost"
              label={copy.cta.stayInApp(appName)}
            />
          </>
        ) : (
          <NextLink
            href={nextHref}
            offline={offline && !signedIn}
            variant="primary"
            label={signedIn ? copy.cta.today : copy.cta.login}
          />
        )}
      </BottomZone>
    </BetaFrame>
  );
}

/** 로그인(또는 오늘 추천)으로 가는 링크. 오프라인 로그인은 aria-disabled + 이동 막음 */
function NextLink({
  href,
  offline,
  variant,
  label,
}: {
  href: string;
  offline: boolean;
  variant: "primary" | "ghost";
  label: string;
}) {
  return (
    <Link
      href={href}
      prefetch={false}
      aria-disabled={offline || undefined}
      onClick={(e) => {
        if (offline) e.preventDefault();
      }}
      className={cn(buttonClass(variant), "w-full")}
    >
      {label}
    </Link>
  );
}

function Steps({
  platform,
  iosChrome,
  guide,
  appName,
  standalone,
  signedIn,
  openFailed,
  reopenLink,
  bip,
}: {
  platform: BetaPlatform;
  iosChrome: boolean;
  guide: InAppGuide | null;
  appName: string;
  standalone: boolean;
  signedIn: boolean;
  openFailed: boolean;
  reopenLink: string;
  bip: BeforeInstallPromptEvent | null;
}) {
  const link = useClientValue(
    () => new URL(reopenLink, window.location.origin).toString(),
    reopenLink,
  );
  const inApp = guide !== null;
  const installed = standalone || platform === "desktop";
  const steps: Step[] = [];

  if (guide) {
    steps.push({
      key: "external",
      title: copy.steps.external.title,
      status: "current",
      summary: "",
      body: openFailed ? (
        <OpenFailedBlock guide={guide} link={link} />
      ) : (
        <div className="flex flex-col gap-3">
          <p className="type-body-sm break-keep text-muted-foreground">
            {copy.steps.external.body(appName, guide.menu, guide.menuItem)}
          </p>
          <MenuDiagram guide={guide} size="sm" />
        </div>
      ),
    });
  }

  const installText = standalone
    ? copy.steps.install.done
    : platform === "ios"
      ? iosChrome
        ? copy.steps.install.iosChrome
        : copy.steps.install.ios
      : platform === "android"
        ? copy.steps.install.android
        : copy.steps.install.desktop;
  steps.push({
    key: "install",
    title: copy.steps.install.title,
    status: inApp ? "next" : installed ? "done" : "current",
    summary: installText,
    body: (
      <div className="flex flex-col gap-3">
        <p className="type-body-sm break-keep text-muted-foreground">
          {installText}
        </p>
        {!installed && platform === "ios" && !iosChrome ? (
          <ShareDiagram />
        ) : null}
        {!installed && platform === "ios" ? (
          <p className="type-body-sm break-keep text-foreground">
            {copy.steps.install.iosLogin}
          </p>
        ) : null}
        {!installed && bip ? (
          <button
            type="button"
            onClick={() => {
              (window as InstallWindow).__lmBip = null;
              void bip.prompt().catch(() => undefined);
            }}
            className={cn(buttonClass("secondary", "sm"), "w-fit")}
          >
            <Download aria-hidden strokeWidth={1.75} />
            {copy.steps.install.androidAction}
          </button>
        ) : null}
      </div>
    ),
  });

  const loginText = signedIn ? copy.steps.login.done : copy.steps.login.body;
  steps.push({
    key: "login",
    title: copy.steps.login.title,
    status: signedIn ? "done" : installed && !inApp ? "current" : "next",
    summary: loginText,
    body: (
      <p className="type-body-sm break-keep text-muted-foreground">
        {loginText}
      </p>
    ),
  });

  return (
    <ol aria-label={copy.steps.label} className="mt-6 flex flex-col">
      {steps.map((s, i) => (
        <li
          key={s.key}
          aria-current={s.status === "current" ? "step" : undefined}
          className="la-step flex gap-4 border-t border-border py-5"
          style={{ animationDelay: `${i * 70}ms` }}
        >
          <StepMark n={i + 1} status={s.status} />
          <div className="flex min-w-0 flex-1 flex-col gap-2">
            <h2
              className={cn(
                "type-label break-keep",
                s.status === "next" && "text-muted-foreground",
              )}
            >
              <span className="sr-only">
                {copy.steps.stepNo(i + 1, steps.length)}
                {s.status === "done" ? `, ${copy.steps.done}` : ""}
                {s.status === "current" ? `, ${copy.steps.current}` : ""}{" "}
              </span>
              {s.title}
            </h2>
            {s.status === "next" ? (
              <p className="line-clamp-1 type-body-sm text-muted-foreground">
                {s.summary}
              </p>
            ) : (
              s.body
            )}
          </div>
        </li>
      ))}
    </ol>
  );
}
