"use client";
// 베타 환영 시안 C: 초대장 (T9.3).
// - 마루 부리 큰 제목과 짧은 편지 두 단락이 주인공. 서명 아래 접는 묶음 두 개(홈 화면에 두는 방법 / 의견 보내는 방법).
//   설치 묶음은 처음부터 펼쳐 두고(기기 감지), 묶음 안에서 다른 기기를 고를 수 있다.
// - 카카오톡이면 편지 위 헤어라인 안내 한 줄 + 외부 브라우저로 열기(보조 버튼). 주 버튼은 늘 로그인하고 시작(올리브 하나).
//   A와 달리 "카카오톡 안에서 바로 로그인"도 막지 않는 쪽이다(안건 2).
// - 데스크톱: 가운데 편지 한 장(카드 면, 1px 선), 최대 36rem.
// - 모션: 편지가 한 번 8px 떠오름(la-step), 묶음 접기 grid-rows base, 화살표 회전 base.
import { ChevronDown } from "lucide-react";
import { useId, useState, type ReactNode } from "react";
import { focusRing } from "@/components/ui/interaction";
import { Wordmark } from "@/features/auth/auth-parts";
import { cn } from "@/lib/utils";
import { isKakao, type BetaParams, type InstallTarget } from "../params";
import {
  BetaSkeleton,
  betaCopy as copy,
  Collapsible,
  deviceLine,
  DevicePicker,
  ExternalButton,
  InstallBody,
  InstallDiagram,
  installTarget,
  LoginButton,
  MeDiagram,
  OfflineLine,
  OpenFailedBlock,
  useBetaLab,
} from "../shared";

export function BetaC({ p }: { p: BetaParams }) {
  const lab = useBetaLab(p);
  const [open, setOpen] = useState<"install" | "feedback" | "none">(p.open);
  const [override, setOverride] = useState<InstallTarget | null>(null);
  const view = lab.view;
  const device = view.kind === "guide" ? view.device : null;
  const kakao = device !== null && isKakao(device);
  const target: InstallTarget | null =
    override ?? (device ? installTarget(device) : lab.picked);

  return (
    <div className="@container/screen flex min-h-dvh flex-1 flex-col bg-background desktop:bg-muted">
      <div className="mx-auto flex w-full max-w-(--lm-layout-max-width) flex-1 flex-col desktop:my-12 desktop:max-w-[36rem] desktop:flex-none desktop:rounded-card desktop:border desktop:border-border desktop:bg-background desktop:px-12 desktop:py-10">
        <header className="flex h-16 shrink-0 items-center justify-between px-(--lm-layout-gutter) desktop:h-auto desktop:px-0">
          <Wordmark />
          <span className="type-caption text-muted-foreground">{copy.letter.date}</span>
        </header>

        <main className="flex flex-1 flex-col px-(--lm-layout-gutter) desktop:px-0">
          {view.kind === "loading" ? (
            <BetaSkeleton className="pt-6" />
          ) : (
            <>
              {kakao && !(view.kind === "guide" && view.openFailed) ? (
                <section className="mt-2 flex flex-col gap-3 border-y border-border py-4">
                  <p className="type-body-sm break-keep">{copy.letter.inAppNotice}</p>
                  <ExternalButton lab={lab} variant="secondary" />
                </section>
              ) : null}
              {view.kind === "guide" && view.openFailed ? (
                <OpenFailedBlock className="mt-2" />
              ) : null}

              <article className="la-step flex flex-col gap-5 pt-8 desktop:pt-10">
                <p className="type-caption text-muted-foreground">{copy.eyebrow}</p>
                <h1 className="type-display font-heading break-keep">{copy.letter.title}</h1>
                {copy.letter.paragraphs.map((t) => (
                  <p key={t} className="type-body break-keep">
                    {t}
                  </p>
                ))}
                <p className="self-end font-heading type-body text-muted-foreground">
                  {copy.letter.sign}
                </p>
              </article>

              <div className="mt-8 flex flex-col border-t border-border">
                <Section
                  title={copy.letter.installSection}
                  open={open === "install"}
                  onToggle={() => setOpen((o) => (o === "install" ? "none" : "install"))}
                >
                  <div className="flex flex-col gap-4 pb-5">
                    {view.kind === "pick" ? (
                      <p className="flex flex-col gap-1">
                        <span className="type-label">{copy.states.empty.title}</span>
                        <span className="type-body-sm break-keep text-muted-foreground">
                          {copy.states.empty.body}
                        </span>
                      </p>
                    ) : device ? (
                      <p className="type-caption text-muted-foreground">{deviceLine(device)}</p>
                    ) : null}
                    <DevicePicker value={target} onChange={setOverride} />
                    {target ? (
                      <>
                        {override === null && device ? (
                          <InstallDiagram device={device} />
                        ) : target === "ios" ? (
                          <InstallDiagram device="ios" />
                        ) : null}
                        <InstallBody target={target} />
                      </>
                    ) : null}
                  </div>
                </Section>
                <Section
                  title={copy.letter.feedbackSection}
                  open={open === "feedback"}
                  onToggle={() => setOpen((o) => (o === "feedback" ? "none" : "feedback"))}
                >
                  <div className="flex flex-col gap-4 pb-5">
                    <p className="type-body-sm break-keep text-muted-foreground">
                      {copy.feedback.body}
                    </p>
                    <MeDiagram />
                  </div>
                </Section>
              </div>
            </>
          )}

          <div className="sticky bottom-0 -mx-(--lm-layout-gutter) mt-auto flex flex-col gap-3 bg-background px-(--lm-layout-gutter) pt-4 pb-[calc(1.5rem+env(safe-area-inset-bottom,0px))] desktop:static desktop:mx-0 desktop:px-0 desktop:pt-8 desktop:pb-0">
            {lab.offline ? <OfflineLine /> : null}
            <LoginButton offline={lab.offline || view.kind === "loading"} />
          </div>
        </main>
      </div>
    </div>
  );
}

function Section({
  title,
  open,
  onToggle,
  children,
}: {
  title: string;
  open: boolean;
  onToggle: () => void;
  children: ReactNode;
}) {
  const id = useId();
  return (
    <section className="border-b border-border">
      <h2>
        <button
          type="button"
          aria-expanded={open}
          aria-controls={id}
          onClick={onToggle}
          className={cn(
            "flex min-h-14 w-full items-center justify-between gap-4 text-left type-label",
            focusRing,
          )}
        >
          {title}
          <ChevronDown
            aria-hidden
            className={cn(
              "size-5 shrink-0 text-muted-foreground transition-transform duration-(--lm-duration-base) ease-standard motion-reduce:transition-none",
              open && "rotate-180",
            )}
            strokeWidth={1.5}
          />
        </button>
      </h2>
      <Collapsible open={open} id={id}>
        {children}
      </Collapsible>
    </section>
  );
}
