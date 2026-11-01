// 공유 이미지 확인 화면 (T7.4 시안을 T7.14, T7.20 실제 구현으로 옮긴 뒤 남긴 것, D-17). 쿼리 규약은 ./params.ts 머리 주석.
// 쿼리는 요청 시점 값이라 Suspense 안에서 읽는다(cacheComponents). 테마는 시스템 설정을 따른다.
// a: 카카오톡 말풍선 모형과 서버 OG 원본(실제 PollOgArt). b: 실제 결과 공유 시트(ResultShareSheet, 브라우저 canvas).
import { Suspense } from "react";
import { shareLabCopy } from "@/copy/design-lab-share";
import { clientEnv } from "@/lib/env/client";
import { cn } from "@/lib/utils";
import { Skeleton } from "@/components/ui/skeleton";
import { DesignScope } from "@/features/design-lab/system/design-scope";
import { shareCopy } from "@/copy/share";
import {
  ogQuery,
  parseShareParams,
  type ShareParams,
  type ShareVariant,
} from "./params";
import { ResultShareDemo } from "./result-share-demo";
import { SourceImages } from "./source-images";

type SearchParams = Record<string, string | string[] | undefined>;

const t = shareLabCopy.page;
const k = shareCopy.meta;

function ogSrc(img: "invite" | "result", p: ShareParams) {
  return `/design-lab/share/og?${ogQuery(img, p)}`;
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
  const loading = p.state === "loading";
  const domain = new URL(
    clientEnv().NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000",
  ).host;
  const invite = {
    src: ogSrc("invite", p),
    alt: shareCopy.og.alt.invite(p.candidates, p.deadline),
  };
  const result = {
    src: ogSrc("result", p),
    alt: shareCopy.og.alt.result(p.voters, p.votes),
  };

  const chat = (
    <>
      <Sender>
        <FeedBubble
          {...invite}
          loading={loading}
          title={k.inviteTitle(p.title)}
          description={k.inviteDescription(p.candidates, p.deadline)}
          button={shareCopy.kakao.inviteButton}
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

        {variant === "a" ? (
          <>
            <section
              aria-labelledby="share-chat"
              className="flex flex-col gap-5"
            >
              <div className="flex flex-col gap-2">
                <h2 id="share-chat" className="type-heading">
                  {t.chatHeading}
                </h2>
                <p className="type-body-sm text-muted-foreground">
                  {t.chatBody}
                </p>
              </div>
              <div className="grid gap-6 desktop:grid-cols-2">
                <ChatPanel label={t.chatLight}>{chat}</ChatPanel>
                {/* .dark는 tokens.css가 아무 요소에나 거는 다크 범위 선택자 */}
                <ChatPanel label={t.chatDark} className="dark">
                  {chat}
                </ChatPanel>
              </div>
            </section>

            <section
              aria-labelledby="share-source"
              className="flex flex-col gap-5"
            >
              <div className="flex flex-col gap-2">
                <h2 id="share-source" className="type-heading">
                  {t.sourceHeading}
                </h2>
                <p className="type-body-sm text-muted-foreground">
                  {t.sourceBody}
                </p>
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
          </>
        ) : (
          <section
            aria-labelledby="share-result"
            className="flex max-w-[480px] flex-col gap-5"
          >
            <div className="flex flex-col gap-2">
              <h2 id="share-result" className="type-heading">
                {t.shareHeading}
              </h2>
              <p className="type-body-sm text-muted-foreground">
                {t.shareBody}
              </p>
            </div>
            <ResultShareDemo
              initialOpen={p.state !== "empty"}
              code="4vdvm3887pr7"
              title={p.title}
              kind={p.kind}
              placeId="1"
              placeName={p.state === "error" ? null : p.placeName}
              category={p.state === "error" ? null : p.category}
              votes={p.votes}
              voters={p.voters}
            />
          </section>
        )}
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
