"use client";
// 베타 환영 시안 A: 기기별 단계 목록 (T9.3).
// - 기기를 알아보고 "지금 할 일"만 펼친 세로 단계 목록. 카카오톡이면 1 외부 브라우저 → 2 홈 화면 → 3 로그인.
// - 지금 단계만 그림과 설명을 펼치고, 다음 단계는 제목 한 줄. "다른 기기 보기"로 다른 기기 방법을 접어 둔다.
// - 주 버튼(올리브) 하나는 화면 아래: 카카오톡이면 외부 브라우저로 열기, 그 밖은 로그인하고 시작.
// - 데스크톱(1024 이상): 왼쪽 단계 칸 + 오른쪽 "휴대폰에서도 열어 두세요" 칸.
// - 첫 등장: 단계 줄이 70ms 간격으로 8px 떠오름(CSS, la-step). 접기는 grid-rows base.
import { MessageSquareText } from "lucide-react";
import { useId, useState } from "react";
import { BottomZone, Wordmark } from "@/features/auth/auth-parts";
import { cn } from "@/lib/utils";
import { isKakao, type BetaDevice, type BetaParams, type InstallTarget } from "../params";
import {
  BetaSkeleton,
  betaCopy as copy,
  Collapsible,
  deviceLine,
  DevicePicker,
  ExternalButton,
  InstallBody,
  InstallDiagram,
  LoginButton,
  MeDiagram,
  OfflineLine,
  OpenFailedBlock,
  StepMark,
  textLink,
  useBetaLab,
  type BetaLab,
} from "../shared";

type Step = {
  key: string;
  title: string;
  status: "done" | "current" | "next";
  body: React.ReactNode;
  /** 다음 단계일 때 보이는 한 줄 */
  summary: string;
};

function targetToDevice(t: InstallTarget): BetaDevice {
  return t;
}

export function BetaA({ p }: { p: BetaParams }) {
  const lab = useBetaLab(p);
  const [others, setOthers] = useState(p.others);
  const [override, setOverride] = useState<InstallTarget | null>(null);
  const othersId = useId();

  const view = lab.view;
  const device: BetaDevice | null =
    view.kind === "guide" ? (override ? targetToDevice(override) : view.device) : null;

  return (
    <div className="@container/screen flex min-h-dvh flex-1 flex-col bg-background">
      <div className="flex min-h-dvh flex-1 flex-col desktop:grid desktop:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
        <div className="flex min-h-dvh flex-col">
          <header className="flex h-16 shrink-0 items-center px-(--lm-layout-gutter) desktop:px-16">
            <Wordmark />
          </header>
          <main className="mx-auto flex w-full max-w-(--lm-layout-max-width) flex-1 flex-col px-(--lm-layout-gutter) pt-4 desktop:max-w-[28rem] desktop:px-0 desktop:pt-12">
            {view.kind === "loading" ? (
              <BetaSkeleton />
            ) : (
              <>
                <Intro />
                {view.kind === "pick" ? (
                  <section className="mt-8 flex flex-col gap-4 border-t border-border pt-6">
                    <p className="flex flex-col gap-1">
                      <span className="type-label">{copy.states.empty.title}</span>
                      <span className="type-body-sm break-keep text-muted-foreground">
                        {copy.states.empty.body}
                      </span>
                    </p>
                    <DevicePicker value={lab.picked} onChange={lab.setPicked} />
                  </section>
                ) : device ? (
                  <>
                    <div className="mt-6 flex flex-wrap items-center justify-between gap-x-4">
                      <p className="type-caption text-muted-foreground">
                        {deviceLine(device)}
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
                        value={override}
                        onChange={setOverride}
                        className="pt-3 pb-1"
                      />
                    </Collapsible>
                    <Steps device={device} lab={lab} openFailed={view.openFailed} />
                    <FeedbackNote />
                  </>
                ) : null}
              </>
            )}

            <BottomZone>
              {lab.offline ? <OfflineLine /> : null}
              {view.kind === "guide" && device && isKakao(device) && !view.openFailed ? (
                <>
                  <ExternalButton lab={lab} variant="primary" />
                  <LoginButton offline={lab.offline} variant="ghost" label={copy.cta.stayInApp} />
                </>
              ) : (
                <LoginButton offline={lab.offline || view.kind === "loading"} />
              )}
            </BottomZone>
          </main>
        </div>

        <aside className="hidden desktop:flex desktop:flex-col desktop:justify-center desktop:gap-6 desktop:border-l desktop:border-border desktop:bg-card desktop:px-16">
          <div className="flex max-w-[22rem] flex-col gap-2">
            <h2 className="type-heading break-keep">{copy.desktopAside.title}</h2>
            <p className="type-body-sm break-keep text-muted-foreground">
              {copy.desktopAside.body}
            </p>
          </div>
          <MeDiagram className="max-w-[22rem]" />
          <p className="max-w-[22rem] type-caption break-keep text-muted-foreground">
            {copy.feedback.short}
          </p>
        </aside>
      </div>
    </div>
  );
}

function Intro() {
  return (
    <div className="flex flex-col gap-3">
      <p className="type-caption text-muted-foreground">{copy.eyebrow}</p>
      <h1 className="type-title font-heading break-keep">{copy.tagline}</h1>
      <p className="type-body break-keep text-muted-foreground">{copy.lead}</p>
    </div>
  );
}

function Steps({
  device,
  lab,
  openFailed,
}: {
  device: BetaDevice;
  lab: BetaLab;
  openFailed: boolean;
}) {
  const kakao = isKakao(device);
  const target: InstallTarget =
    device === "kakao-ios" ? "ios" : device === "kakao-android" ? "android" : device;
  const installed = device === "app" || device === "desktop";
  const steps: Step[] = [];
  if (kakao) {
    steps.push({
      key: "external",
      title: copy.steps.external.title,
      status: "current",
      summary: "",
      body: openFailed ? (
        <OpenFailedBlock />
      ) : (
        <div className="flex flex-col gap-3">
          <p className="type-body-sm break-keep text-muted-foreground">
            {copy.steps.external.body(device === "kakao-ios" ? "ios" : "android")}
          </p>
          <InstallDiagram device={device} />
        </div>
      ),
    });
  }
  steps.push({
    key: "install",
    title: copy.steps.install.title,
    status: kakao ? "next" : installed ? "done" : "current",
    summary:
      target === "ios"
        ? copy.steps.install.ios
        : target === "android"
          ? copy.steps.install.android
          : copy.steps.install.desktop,
    body: (
      <div className="flex flex-col gap-3">
        <InstallBody target={target} />
        {!kakao && !installed ? <InstallDiagram device={device} /> : null}
      </div>
    ),
  });
  steps.push({
    key: "login",
    title: copy.steps.login.title,
    status: installed ? "current" : "next",
    summary: copy.steps.login.body,
    body: (
      <p className="type-body-sm break-keep text-muted-foreground">
        {copy.steps.login.body}
      </p>
    ),
  });
  void lab;
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

function FeedbackNote() {
  return (
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
  );
}
