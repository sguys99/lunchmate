// OG 이미지와 결과 공유 이미지 시안 라우트 (T7.4). 쿼리 규약은 ./params.ts 머리 주석.
// 쿼리는 요청 시점 값이라 Suspense 안에서 읽는다(cacheComponents). 테마는 시스템 설정을 따른다.
// 1절 카카오톡 말풍선 모형 / 2절 서버 OG 원본과 안전 영역 / 3절 브라우저에서 만드는 결과 공유 이미지.
import { Suspense } from "react";
import { shareLabCopy } from "@/copy/design-lab-share";
import { clientEnv } from "@/lib/env/client";
import { cn } from "@/lib/utils";
import { Skeleton } from "@/components/ui/skeleton";
import { DesignScope } from "@/features/design-lab/system/design-scope";
import { loadSharePalette } from "./palette";
import {
  ogQuery,
  parseShareParams,
  type ShareParams,
  type ShareVariant,
} from "./params";
import { ShareStudio } from "./share-studio";
import { SourceImages } from "./source-images";

type SearchParams = Record<string, string | string[] | undefined>;

const t = shareLabCopy.page;
const k = shareLabCopy.kakao;

function ogSrc(
  variant: ShareVariant,
  img: "invite" | "result",
  p: ShareParams,
) {
  return `/design-lab/share/og?${ogQuery(variant, img, p)}`;
}

/** 카카오톡 피드 메시지 모형 (sendDefault feed: 이미지, 제목, 설명, 버튼). 색은 앱 토큰으로 흉내만 낸다 */
function FeedBubble({
  src,
  alt,
  title,
  description,
  button,
  domain,
  loading,
}: {
  src: string;
  alt: string;
  title: string;
  description: string;
  button?: string;
  domain?: string;
  loading: boolean;
}) {
  return (
    <div className="w-[260px] overflow-hidden rounded-lg bg-popover text-popover-foreground">
      {loading ? (
        <Skeleton className="h-[130px] w-[260px] rounded-none" />
      ) : (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={src}
          alt={alt}
          width={260}
          height={130}
          className="block h-[130px] w-[260px]"
        />
      )}
      <div className="flex flex-col gap-1 px-3.5 py-3">
        <p className="type-label font-semibold">{title}</p>
        <p className="type-caption font-normal text-muted-foreground">
          {description}
        </p>
        {domain ? (
          <p className="type-caption font-normal text-muted-foreground">
            {domain}
          </p>
        ) : null}
      </div>
      {button ? (
        <div className="border-t border-border py-3 text-center type-label">
          {button}
        </div>
      ) : null}
    </div>
  );
}

function ChatPanel({
  label,
  className,
  children,
}: {
  label: string;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <figure className="flex flex-col gap-2">
      <div
        className={cn(
          "flex flex-col gap-5 rounded-card bg-info-surface p-5 text-foreground in-[.dark]:bg-background [&.dark]:bg-background",
          className,
        )}
      >
        {children}
      </div>
      <figcaption className="type-caption text-muted-foreground">
        {label}
      </figcaption>
    </figure>
  );
}

function Sender({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex gap-2.5">
      <div aria-hidden className="size-9 shrink-0 rounded-full bg-border" />
      <div className="flex flex-col gap-1.5">
        <p className="type-caption text-muted-foreground">{t.bubbleSender}</p>
        {children}
      </div>
    </div>
  );
}

async function Screen({
  variant,
  searchParams,
}: {
  variant: ShareVariant;
  searchParams: Promise<SearchParams>;
}) {
  const p = parseShareParams(await searchParams);
  const palette = await loadSharePalette();
  const loading = p.state === "loading";
  const domain = new URL(
    clientEnv().NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000",
  ).host;
  const invite = {
    src: ogSrc(variant, "invite", p),
    alt: shareLabCopy.og.alt.invite(p.candidates, p.deadline),
  };
  const result = {
    src: ogSrc(variant, "result", p),
    alt: shareLabCopy.og.alt.result(p.voters, p.votes),
  };

  const chat = (
    <>
      <Sender>
        <FeedBubble
          {...invite}
          loading={loading}
          title={k.inviteTitle(p.title)}
          description={k.inviteDescription(p.candidates, p.deadline)}
          button={k.inviteButton}
        />
      </Sender>
      <Sender>
        <FeedBubble
          {...result}
          loading={loading}
          title={k.resultTitle(p.title)}
          description={k.resultDescription(p.voters, p.votes)}
          domain={domain}
        />
      </Sender>
    </>
  );

  const s = shareLabCopy.shareImage;
  const og = shareLabCopy.og;
  const cat = palette.category[p.category];

  return (
    <DesignScope className="min-h-dvh flex-1 bg-background text-foreground">
      <main className="mx-auto flex w-full max-w-[1120px] flex-col gap-14 px-6 py-10 desktop:px-10">
        <header className="flex max-w-[640px] flex-col gap-3">
          <p className="type-caption text-muted-foreground">{t.eyebrow}</p>
          <h1 className="type-title">{shareLabCopy.names[variant]}</h1>
          <p className="type-body-sm text-muted-foreground">
            {shareLabCopy.intents[variant]}
          </p>
        </header>

        <section aria-labelledby="share-chat" className="flex flex-col gap-5">
          <div className="flex flex-col gap-2">
            <h2 id="share-chat" className="type-heading">
              {t.chatHeading}
            </h2>
            <p className="type-body-sm text-muted-foreground">{t.chatBody}</p>
          </div>
          <div className="grid gap-6 desktop:grid-cols-2">
            <ChatPanel label={t.chatLight}>{chat}</ChatPanel>
            {/* .dark는 tokens.css가 아무 요소에나 거는 다크 범위 선택자 */}
            <ChatPanel label={t.chatDark} className="dark">
              {chat}
            </ChatPanel>
          </div>
        </section>

        <section aria-labelledby="share-source" className="flex flex-col gap-5">
          <div className="flex flex-col gap-2">
            <h2 id="share-source" className="type-heading">
              {t.sourceHeading}
            </h2>
            <p className="type-body-sm text-muted-foreground">{t.sourceBody}</p>
          </div>
          <SourceImages
            loading={loading}
            initialSafe={p.safe}
            images={[
              { ...invite, caption: t.inviteCaption },
              { ...result, caption: t.resultCaption },
            ]}
          />
        </section>

        <section
          aria-labelledby="share-result"
          className="flex max-w-[480px] flex-col gap-5"
        >
          <div className="flex flex-col gap-2">
            <h2 id="share-result" className="type-heading">
              {t.shareHeading}
            </h2>
            <p className="type-body-sm text-muted-foreground">{t.shareBody}</p>
          </div>
          <ShareStudio
            state={p.state}
            palette={{
              background: palette.background,
              card: palette.card,
              foreground: palette.foreground,
              mutedForeground: palette.mutedForeground,
              border: palette.border,
              primary: palette.primary,
              track: palette.track,
              catSurface: cat.surface,
              catInk: cat.ink,
            }}
            data={{
              variant,
              kind: p.kind,
              title: p.title,
              placeName: p.placeName,
              category: p.category,
              voters: p.voters,
              votes: p.votes,
              dateLabel: p.dateLabel,
              texts: {
                brand: shareLabCopy.brand,
                celebrate: s.celebrate[p.kind],
                votesOf: s.votesOf(p.voters, p.votes),
                resultCaption: og.ticketResult[p.kind],
                final: s.ticketFinal,
                votersLabel: og.labels.voters,
                topLabel: og.labels.top,
                unitVote: og.units.vote,
                unitPerson: og.units.person,
              },
            }}
          />
        </section>
      </main>
    </DesignScope>
  );
}

export function ShareLabRoute(props: {
  variant: ShareVariant;
  searchParams: Promise<SearchParams>;
}) {
  return (
    <Suspense>
      <Screen {...props} />
    </Suspense>
  );
}
