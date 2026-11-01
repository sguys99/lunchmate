// 투표 링크 미리보기 이미지 (T7.14, POLL-04, POLL-09S, D-17 A 한 줄 제목). next/og ImageResponse(Satori)가 그린다.
// Satori 제약: 자식이 둘 이상인 div는 display flex, CSS 변수 없음(색은 생성 상수 sharePalette), 글꼴은 woff/ttf/otf만.
// 식당 이름과 카테고리는 받지 않는다(T0.16-4). 이미지는 늘 라이트 팔레트이고 올리브는 한 군데만 쓴다(DESIGN.md 5장 "공유 이미지").
import type { CSSProperties, ReactNode } from "react";
import { shareCopy } from "@/copy/share";
import { appIconSvg, monoInk, svgDataUrl } from "@/features/pwa/icon-art";
import { sharePalette as P } from "@/lib/design/share-palette.generated";
import type { OgImageKind, PollOg } from "./og-data";

export const OG_SIZE = { width: 1200, height: 600 } as const;
export const OG_SERIF = "MaruBuri";
export const OG_SANS = "Pretendard";

const c = shareCopy.og;

const row = (s: CSSProperties = {}): CSSProperties => ({
  display: "flex",
  flexDirection: "row",
  ...s,
});
const col = (s: CSSProperties = {}): CSSProperties => ({
  display: "flex",
  flexDirection: "column",
  ...s,
});

const sans = (size: number, color: string = P.mutedForeground) => ({
  fontFamily: OG_SANS,
  fontSize: size,
  color,
});

function Frame({ children }: { children: ReactNode }) {
  return (
    <div
      style={col({
        width: "100%",
        height: "100%",
        background: P.background,
        // 좌우 88: 1.91:1로 자르는 서비스에서도 글자가 남는다(D-17 안건 2)
        padding: "64px 88px 68px",
        justifyContent: "space-between",
      })}
    >
      {children}
    </div>
  );
}

/** 왼쪽 위 기호(T8.2, D-18 안건 6): 앱 아이콘 그릇의 tiny 단계를 글자색 한 가지로. 올리브는 이미지마다 한 군데라 색을 쓰지 않는다 */
const BRAND_MARK = svgDataUrl(
  appIconSvg({ ink: monoInk(P.foreground), level: "tiny", size: 24 }),
);

function Top({ label }: { label: string }) {
  return (
    <div style={row({ justifyContent: "space-between", alignItems: "center" })}>
      <div style={row({ alignItems: "center", gap: 10 })}>
        {/* eslint-disable-next-line @next/next/no-img-element -- Satori(next/og)는 img만 그린다 */}
        <img src={BRAND_MARK} width={24} height={24} alt="" />
        <div style={{ ...sans(28, P.foreground), letterSpacing: "-0.01em" }}>
          {shareCopy.brand}
        </div>
      </div>
      <div style={sans(28)}>{label}</div>
    </div>
  );
}

function Headline({ children }: { children: ReactNode }) {
  return (
    <div
      style={{
        display: "block",
        fontFamily: OG_SERIF,
        fontWeight: 300,
        fontSize: 84,
        lineHeight: 1.22,
        letterSpacing: "-0.02em",
        color: P.foreground,
        wordBreak: "keep-all",
        lineClamp: 2,
        maxWidth: "100%",
      }}
    >
      {children}
    </div>
  );
}

/** 라벨 위, 숫자 + 단위 아래 (DESIGN.md 3장 숫자 표현) */
function Num({
  label,
  value,
  unit,
  size = 72,
}: {
  label: string;
  value: string;
  unit?: string;
  size?: number;
}) {
  return (
    <div style={col({ gap: 10 })}>
      <div style={sans(28)}>{label}</div>
      <div style={row({ alignItems: "baseline", gap: 6 })}>
        <div
          style={{
            ...sans(size, P.foreground),
            lineHeight: 1,
            letterSpacing: "-0.02em",
          }}
        >
          {value}
        </div>
        {unit ? <div style={sans(32)}>{unit}</div> : null}
      </div>
    </div>
  );
}

function VLine() {
  return (
    <div
      style={{ width: 2, height: 96, margin: "0 44px", background: P.border }}
    />
  );
}

function Invite({ og }: { og: Extract<PollOg, { state: "open" | "closed" }> }) {
  // 날짜가 붙은 마감(회식, 다른 날)은 한 단계 작게
  const long = og.deadline.length > 5;
  return (
    <Frame>
      <Top label={c.inviteLabel[og.kind]} />
      <div style={col({ gap: 28 })}>
        <Headline>{c.inviteHeadline(og.title)}</Headline>
        <div
          style={{
            width: 64,
            height: 4,
            borderRadius: 2,
            background: P.primary,
          }}
        />
      </div>
      <div style={row({ alignItems: "flex-end" })}>
        <Num
          label={c.labels.candidates}
          value={String(og.candidateCount)}
          unit={c.units.place}
        />
        <VLine />
        <Num
          label={c.labels.deadline}
          value={og.deadline}
          size={long ? 56 : 72}
        />
      </div>
    </Frame>
  );
}

function Result({ og }: { og: Extract<PollOg, { state: "open" | "closed" }> }) {
  const counted = og.voters !== null && og.topVotes !== null && og.voters > 0;
  return (
    <Frame>
      <Top label={c.resultLabel[og.kind]} />
      <div style={col({ gap: 28 })}>
        <Headline>{c.resultHeadline(og.title)}</Headline>
        {/* 숫자가 없으면(마이그레이션 적용 전) 초대처럼 짧은 올리브 선으로 올리브 한 군데를 지킨다 */}
        {counted ? null : (
          <div
            style={{
              width: 64,
              height: 4,
              borderRadius: 2,
              background: P.primary,
            }}
          />
        )}
      </div>
      {counted ? (
        <div style={row({ alignItems: "flex-end" })}>
          <Num
            label={c.labels.voters}
            value={String(og.voters)}
            unit={c.units.person}
          />
          <VLine />
          <Num
            label={c.labels.top}
            value={String(og.topVotes)}
            unit={c.units.vote}
          />
          <div
            style={row({
              flex: 1,
              marginLeft: 56,
              marginBottom: 22,
              height: 12,
              borderRadius: 6,
              background: P.track,
            })}
          >
            <div
              style={{
                width: `${Math.round(((og.topVotes ?? 0) / (og.voters ?? 1)) * 100)}%`,
                height: 12,
                borderRadius: 6,
                background: P.primary,
              }}
            />
          </div>
        </div>
      ) : (
        <div style={{ height: 96 }} />
      )}
    </Frame>
  );
}

function Unavailable() {
  return (
    <Frame>
      <Top label="" />
      <div style={col({ gap: 20 })}>
        <Headline>{c.unavailableHeadline}</Headline>
        <div style={sans(32)}>{c.unavailableBody}</div>
      </div>
      <div style={{ height: 96 }} />
    </Frame>
  );
}

export function PollOgArt({ og, img }: { og: PollOg; img: OgImageKind }) {
  if (og.state === "unavailable") return <Unavailable />;
  // 아직 결과가 없는 방의 결과 링크는 초대 그림을 쓴다
  if (img === "result" && og.state === "closed") return <Result og={og} />;
  return <Invite og={og} />;
}

export function pollOgAlt(og: PollOg, img: OgImageKind): string {
  if (og.state === "unavailable") return c.alt.unavailable;
  if (img === "result" && og.state === "closed") {
    return og.voters !== null && og.topVotes !== null
      ? c.alt.result(og.voters, og.topVotes)
      : c.alt.resultNoCount;
  }
  return c.alt.invite(og.candidateCount, og.deadline);
}
