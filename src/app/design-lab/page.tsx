import Link from "next/link";
import { designLabCopy } from "@/copy/design-lab";
import { onboardingLabCopy } from "@/copy/design-lab-onboarding";
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

      <Section
        title={onboardingLabCopy.index.title}
        body={onboardingLabCopy.index.body}
      >
        <Link href="/design-lab/onboarding/b" className={linkClass}>
          {copy.onboardingLink}
        </Link>
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
