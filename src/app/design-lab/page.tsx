import Link from "next/link";
import { designLabCopy } from "@/copy/design-lab";
import { mapLabCopy } from "@/copy/design-lab-map";
import { onboardingLabCopy } from "@/copy/design-lab-onboarding";
import { feedbackLabCopy } from "@/copy/design-lab-feedback";
import { meLabCopy } from "@/copy/design-lab-me";
import { placeLabCopy } from "@/copy/design-lab-place";
import { reportLabCopy } from "@/copy/design-lab-report";
import { pollLabCopy } from "@/copy/design-lab-poll";
import { pollCreateLabCopy } from "@/copy/design-lab-poll-create";
import { partyLabCopy } from "@/copy/design-lab-party";
import { shareLabCopy } from "@/copy/design-lab-share";
import { appIconLabCopy } from "@/copy/design-lab-app-icon";
import { adminLabCopy } from "@/copy/design-lab-admin";
import { betaLabCopy } from "@/copy/design-lab-beta";
import { betaFeedbackLabCopy } from "@/copy/design-lab-beta-feedback";
import { swipeLabCopy } from "@/copy/design-lab-swipe";
import { tabBarLabCopy } from "@/copy/design-lab-tab-bar";
import { getScreenTokens } from "@/features/design-lab/system/tokens.server";
import {
  DESIGN_IDS,
  DESIGN_SCREEN_IDS,
} from "@/features/design-lab/system/types";

const copy = designLabCopy.index;
const linkClass =
  "text-sm font-medium underline underline-offset-4 hover:text-primary";

function Section({
  title,
  body,
  children,
}: {
  title: string;
  body?: string;
  children?: React.ReactNode;
}) {
  return (
    <section className="flex flex-col gap-3 rounded-lg border border-border p-5">
      <h2 className="text-base font-semibold">{title}</h2>
      {body ? <p className="text-sm text-muted-foreground">{body}</p> : null}
      {children}
    </section>
  );
}

export default function DesignLabPage() {
  const { name } = getScreenTokens().meta;
  return (
    <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-6 bg-background p-6 text-foreground">
      <header className="flex flex-col gap-2">
        <h1 className="text-2xl font-bold tracking-tight">
          {designLabCopy.title}
        </h1>
        <p className="text-muted-foreground">{designLabCopy.description}</p>
      </header>

      <Section title={copy.homeTitle} body={copy.homeBody}>
        <Link href="/design-lab/home/d1" className={linkClass}>
          {copy.homeLink}
        </Link>
      </Section>

      {/* 8단계 시안(T8.1): 게이트 뒤 고른 안만 남긴다 */}
      <Section title={copy.g8Title} body={copy.g8Body}>
        <div className="flex flex-wrap gap-4">
          {Object.entries(appIconLabCopy.names).map(([id, name]) => (
            <Link
              key={id}
              href={`/design-lab/app-icon/${id}`}
              className={linkClass}
            >
              {name}
            </Link>
          ))}
        </div>
      </Section>

      {/* 8단계 관리자 시안(T8.5a): 게이트 뒤 고른 안만 남긴다 */}
      <Section title={adminLabCopy.index.title} body={adminLabCopy.index.body}>
        <div className="flex flex-wrap gap-4">
          {Object.entries(adminLabCopy.names).map(([id, name]) => (
            <Link
              key={id}
              href={`/design-lab/admin/${id}`}
              className={linkClass}
            >
              {name}
            </Link>
          ))}
        </div>
      </Section>

      {/* 9단계 시안(T9.3, T9.4, T9.14, T9.15): 게이트 뒤 고른 안만 남긴다 */}
      {(
        [
          ["beta", betaLabCopy],
          ["beta-feedback", betaFeedbackLabCopy],
          ["swipe", swipeLabCopy],
          ["tab-bar", tabBarLabCopy],
        ] as const
      ).map(([route, labCopy]) => (
        <Section
          key={route}
          title={labCopy.index.title}
          body={labCopy.index.body}
        >
          <div className="flex flex-wrap gap-4">
            {Object.entries(labCopy.names).map(([id, name]) => (
              <Link
                key={id}
                href={`/design-lab/${route}/${id}`}
                className={linkClass}
              >
                {name}
              </Link>
            ))}
          </div>
        </Section>
      ))}

      {/* 7단계 시안(T7.1~T7.4): 게이트 T7.5 뒤 고른 안만 남긴다(D-14~D-17) */}
      <Section title={copy.g7Title} body={copy.g7Body}>
        {(
          [
            ["poll", pollLabCopy.names],
            ["poll-create", pollCreateLabCopy.names],
            ["party", partyLabCopy.names],
            ["share", shareLabCopy.names],
          ] as const
        ).map(([route, names]) => (
          <div key={route} className="flex flex-wrap gap-4">
            {/* 각 시안 문구의 names에 남은 안만 링크한다(미선택 안을 지우면 함께 빠진다) */}
            {Object.entries(names).map(([id, name]) => (
              <Link
                key={id}
                href={`/design-lab/${route}/${id}`}
                className={linkClass}
              >
                {name}
              </Link>
            ))}
          </div>
        ))}
      </Section>

      {/* 6단계 시안(T6.4): 고른 안만 남기고 나머지는 지웠다(캡처와 비교 문서만 남김, D-11~D-13) */}
      {(
        [
          ["feedback", "b", feedbackLabCopy.names.b, feedbackLabCopy],
          ["me", "a", meLabCopy.names.a, meLabCopy],
          ["report", "c", reportLabCopy.names.c, reportLabCopy],
        ] as const
      ).map(([route, id, name, lab]) => (
        <Section key={route} title={lab.index.title} body={lab.index.body}>
          <div className="flex flex-wrap gap-4">
            <Link href={`/design-lab/${route}/${id}`} className={linkClass}>
              {name}
            </Link>
          </div>
        </Section>
      ))}

      <Section title={placeLabCopy.index.title} body={placeLabCopy.index.body}>
        <div className="flex flex-wrap gap-4">
          <Link href="/design-lab/place/c" className={linkClass}>
            {placeLabCopy.names.c}
          </Link>
          <Link href="/design-lab/place/live" className={linkClass}>
            {placeLabCopy.names.live}
          </Link>
        </div>
      </Section>

      <Section
        title={onboardingLabCopy.index.title}
        body={onboardingLabCopy.index.body}
      >
        <Link href="/design-lab/onboarding/b" className={linkClass}>
          {copy.onboardingLink}
        </Link>
      </Section>

      <Section title={mapLabCopy.index.title} body={mapLabCopy.index.body}>
        <div className="flex flex-wrap gap-4">
          <Link href="/design-lab/map/b" className={linkClass}>
            {mapLabCopy.names.b}
          </Link>
        </div>
      </Section>

      <Section title={copy.authTitle} body={copy.authBody}>
        <div className="flex flex-wrap gap-4">
          {(["b", "a", "sheet"] as const).map((id) => (
            <Link
              key={id}
              href={`/design-lab/auth/${id}`}
              className={linkClass}
            >
              {copy.authLinks[id]}
            </Link>
          ))}
        </div>
      </Section>

      <Section title={copy.systemTitle} body={copy.switcherBody}>
        <Link href="/design-lab/system" className={linkClass}>
          {copy.switcherLink}
        </Link>
      </Section>

      <Section title={copy.tokensLink} body={copy.tokensBody}>
        <Link href="/design-lab/system/tokens" className={linkClass}>
          {copy.tokensLink}
        </Link>
      </Section>

      <Section title={copy.screensTitle} body={copy.screensBody}>
        <ul className="flex flex-col gap-2">
          {DESIGN_IDS.map((id) => (
            <li key={id} className="flex flex-wrap items-baseline gap-x-4">
              <span className="min-w-48 text-sm">
                {copy.designLabel(id.toUpperCase(), name)}
              </span>
              {DESIGN_SCREEN_IDS.map((screen) => (
                <Link
                  key={screen}
                  href={`/design-lab/system/${id}/${screen}`}
                  className={linkClass}
                >
                  {designLabCopy.switcher.screens[screen]}
                </Link>
              ))}
            </li>
          ))}
        </ul>
      </Section>

      <Section title={copy.galleryTitle} body={copy.galleryBody}>
        <Link href="/design-lab/components" className={linkClass}>
          {copy.galleryLink}
        </Link>
      </Section>

      <Section title={copy.landingTitle} body={copy.landingBody}>
        <Link href="/design-lab/landing/b" className={linkClass}>
          {copy.landingLink}
        </Link>
      </Section>

      <Section title={copy.pocTitle} body={copy.pocBody}>
        <Link href="/design-lab/poc" className={linkClass}>
          {copy.pocLink}
        </Link>
      </Section>

      <Section title={copy.illustrationsTitle} body={copy.illustrationsBody}>
        <Link href="/design-lab/illustrations" className={linkClass}>
          {copy.illustrationsLink}
        </Link>
      </Section>

      <Section title={copy.archiveTitle} body={copy.archiveBody} />

      <Section title={copy.toolsTitle}>
        <Link href="/design-lab/map-smoke" className={linkClass}>
          {copy.mapSmoke}
        </Link>
      </Section>
    </main>
  );
}
