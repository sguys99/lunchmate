// 서버 OG 이미지 그림 (T7.4 시안). next/og ImageResponse(Satori)가 그린다.
// Satori 제약: 자식이 둘 이상인 div는 display flex, CSS 변수 없음(색은 palette.ts 16진 값), 글꼴은 woff/ttf/otf만.
// 식당 이름과 카테고리는 받지 않는다(T0.16-4, POLL-04). 서버에서 카카오를 부르지 않는다.
import type { CSSProperties, ReactNode } from "react";
import { shareLabCopy } from "@/copy/design-lab-share";
import type { SharePalette } from "./palette";
import type { OgImageKind, ShareParams, ShareVariant } from "./params";

export const OG_SIZE = { width: 1200, height: 600 } as const;

const c = shareLabCopy.og;
const SERIF = "MaruBuri";
const SANS = "Pretendard";

type Art = {
  p: ShareParams;
  palette: SharePalette;
};

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

function Brand({
  palette,
  size = 28,
}: {
  palette: SharePalette;
  size?: number;
}) {
  return (
    <div
      style={{
        fontFamily: SANS,
        fontSize: size,
        color: palette.foreground,
        letterSpacing: "-0.01em",
      }}
    >
      {shareLabCopy.brand}
    </div>
  );
}

function Headline({
  palette,
  children,
  size,
}: {
  palette: SharePalette;
  children: ReactNode;
  size: number;
}) {
  return (
    <div
      style={{
        display: "block",
        fontFamily: SERIF,
        fontWeight: 300,
        fontSize: size,
        lineHeight: 1.22,
        letterSpacing: "-0.02em",
        color: palette.foreground,
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
  palette,
  label,
  value,
  unit,
  size = 72,
}: {
  palette: SharePalette;
  label: string;
  value: string;
  unit?: string;
  size?: number;
}) {
  return (
    <div style={col({ gap: 10 })}>
      <div
        style={{
          fontFamily: SANS,
          fontSize: 28,
          color: palette.mutedForeground,
        }}
      >
        {label}
      </div>
      <div style={row({ alignItems: "baseline", gap: 6 })}>
        <div
          style={{
            fontFamily: SANS,
            fontSize: size,
            lineHeight: 1,
            letterSpacing: "-0.02em",
            color: palette.foreground,
          }}
        >
          {value}
        </div>
        {unit ? (
          <div
            style={{
              fontFamily: SANS,
              fontSize: 32,
              color: palette.mutedForeground,
            }}
          >
            {unit}
          </div>
        ) : null}
      </div>
    </div>
  );
}

function VLine({
  palette,
  height = 96,
}: {
  palette: SharePalette;
  height?: number;
}) {
  return (
    <div
      style={{ width: 2, height, margin: "0 44px", background: palette.border }}
    />
  );
}

/* ---------------- A 한 줄 제목 ---------------- */

function ArtA({ p, palette, img }: Art & { img: OgImageKind }) {
  const invite = img === "invite";
  return (
    <div
      style={col({
        width: "100%",
        height: "100%",
        background: palette.background,
        padding: "64px 88px 68px",
        justifyContent: "space-between",
      })}
    >
      <div
        style={row({ justifyContent: "space-between", alignItems: "center" })}
      >
        <Brand palette={palette} />
        <div
          style={{
            fontFamily: SANS,
            fontSize: 28,
            color: palette.mutedForeground,
          }}
        >
          {invite ? c.ticketInvite[p.kind] : c.ticketResult[p.kind]}
        </div>
      </div>
      <div style={col({ gap: 28 })}>
        <Headline palette={palette} size={84}>
          {invite ? c.inviteHeadline(p.title) : c.resultHeadline(p.title)}
        </Headline>
        {invite ? (
          <div
            style={{
              width: 64,
              height: 4,
              borderRadius: 2,
              background: palette.primary,
            }}
          />
        ) : null}
      </div>
      {invite ? (
        <div style={row({ alignItems: "flex-end" })}>
          <Num
            palette={palette}
            label={c.labels.candidates}
            value={String(p.candidates)}
            unit={c.units.place}
          />
          <VLine palette={palette} />
          <Num palette={palette} label={c.labels.deadline} value={p.deadline} />
        </div>
      ) : (
        <div style={row({ alignItems: "flex-end" })}>
          <Num
            palette={palette}
            label={c.labels.voters}
            value={String(p.voters)}
            unit={c.units.person}
          />
          <VLine palette={palette} />
          <Num
            palette={palette}
            label={c.labels.top}
            value={String(p.votes)}
            unit={c.units.vote}
          />
          <div
            style={row({
              flex: 1,
              marginLeft: 56,
              marginBottom: 22,
              height: 12,
              borderRadius: 6,
              background: palette.track,
            })}
          >
            <div
              style={{
                width: `${Math.round((p.votes / p.voters) * 100)}%`,
                height: 12,
                borderRadius: 6,
                background: palette.primary,
              }}
            />
          </div>
        </div>
      )}
    </div>
  );
}

/* ---------------- B 돌 한 줄 ---------------- */

function Stones({
  palette,
  count,
  winner,
}: {
  palette: SharePalette;
  count: number;
  winner: number | null;
}) {
  const size = count >= 5 ? 92 : 108;
  return (
    <div style={row({ gap: 20, alignItems: "flex-end" })}>
      {Array.from({ length: count }, (_, i) => {
        const won = winner === i;
        return (
          <div key={i} style={col({ alignItems: "center", gap: 14 })}>
            <div
              style={row({
                width: size,
                height: size,
                borderRadius: size,
                background: palette.muted,
                border: `${won ? 4 : 2}px solid ${won ? palette.primary : palette.border}`,
                alignItems: "center",
                justifyContent: "center",
                fontFamily: SANS,
                fontSize: 34,
                color: won ? palette.primary : palette.mutedForeground,
              })}
            >
              {String(i + 1)}
            </div>
            <div
              style={{
                fontFamily: SANS,
                fontSize: 26,
                height: 30,
                color: palette.foreground,
              }}
            >
              {won ? c.labels.top : ""}
            </div>
          </div>
        );
      })}
    </div>
  );
}

function ArtB({ p, palette, img }: Art & { img: OgImageKind }) {
  const invite = img === "invite";
  return (
    <div
      style={col({
        width: "100%",
        height: "100%",
        background: palette.background,
        padding: "64px 88px 56px",
        justifyContent: "space-between",
      })}
    >
      <div style={col({ gap: 22 })}>
        <Brand palette={palette} />
        <Headline palette={palette} size={76}>
          {invite ? p.title : c.resultHeadline(p.title)}
        </Headline>
        <div
          style={{
            fontFamily: SANS,
            fontSize: 32,
            color: palette.mutedForeground,
          }}
        >
          {invite ? c.inviteSub(p.candidates) : c.resultSub(p.voters, p.votes)}
        </div>
      </div>
      <div
        style={row({ justifyContent: "space-between", alignItems: "flex-end" })}
      >
        <Stones
          palette={palette}
          count={p.candidates}
          winner={invite ? null : 0}
        />
        {invite ? (
          <div
            style={col({ alignItems: "flex-end", gap: 10, paddingBottom: 44 })}
          >
            <div
              style={{
                fontFamily: SANS,
                fontSize: 28,
                color: palette.mutedForeground,
              }}
            >
              {c.labels.deadline}
            </div>
            <div
              style={{
                fontFamily: SANS,
                fontSize: 64,
                lineHeight: 1,
                color: palette.foreground,
              }}
            >
              {p.deadline}
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}

/* ---------------- C 식권 ---------------- */

function Notch({
  palette,
  side,
}: {
  palette: SharePalette;
  side: "top" | "bottom";
}) {
  return (
    <div
      style={{
        position: "absolute",
        left: -15,
        [side]: 20,
        width: 28,
        height: 28,
        borderRadius: 28,
        background: palette.background,
        border: `2px solid ${palette.border}`,
      }}
    />
  );
}

function ArtC({ p, palette, img }: Art & { img: OgImageKind }) {
  const invite = img === "invite";
  return (
    <div
      style={row({
        width: "100%",
        height: "100%",
        background: palette.background,
        padding: "64px 72px",
      })}
    >
      <div
        style={row({
          flex: 1,
          background: palette.card,
          border: `2px solid ${palette.border}`,
          borderRadius: 32,
        })}
      >
        <div
          style={col({
            flex: 1,
            padding: "52px 56px",
            justifyContent: "space-between",
          })}
        >
          <div
            style={row({
              justifyContent: "space-between",
              alignItems: "center",
            })}
          >
            <div
              style={{
                fontFamily: SANS,
                fontSize: 28,
                color: palette.mutedForeground,
              }}
            >
              {invite ? c.ticketInvite[p.kind] : c.ticketResult[p.kind]}
            </div>
          </div>
          <Headline palette={palette} size={68}>
            {invite ? p.title : c.resultHeadline(p.title)}
          </Headline>
          <div style={row({ alignItems: "baseline", gap: 8 })}>
            <div
              style={{
                fontFamily: SANS,
                fontSize: 30,
                color: palette.mutedForeground,
              }}
            >
              {invite ? c.labels.candidates : c.labels.voters}
            </div>
            <div
              style={{
                fontFamily: SANS,
                fontSize: 40,
                color: palette.foreground,
              }}
            >
              {invite ? String(p.candidates) : String(p.voters)}
            </div>
            <div
              style={{
                fontFamily: SANS,
                fontSize: 30,
                color: palette.mutedForeground,
              }}
            >
              {invite ? c.units.place : c.units.person}
            </div>
          </div>
        </div>
        <div
          style={col({
            position: "relative",
            width: 316,
            borderLeft: `3px dashed ${palette.border}`,
            padding: "52px 44px",
            justifyContent: "space-between",
          })}
        >
          <Notch palette={palette} side="top" />
          <Notch palette={palette} side="bottom" />
          <div
            style={{
              fontFamily: SANS,
              fontSize: 28,
              color: palette.mutedForeground,
            }}
          >
            {invite ? c.labels.deadline : c.labels.top}
          </div>
          <div style={row({ alignItems: "baseline", gap: 6 })}>
            <div
              style={{
                fontFamily: SANS,
                fontSize: invite ? 88 : 112,
                lineHeight: 1,
                letterSpacing: "-0.03em",
                color: palette.primary,
              }}
            >
              {invite ? p.deadline : String(p.votes)}
            </div>
            {invite ? null : (
              <div
                style={{
                  fontFamily: SANS,
                  fontSize: 36,
                  color: palette.mutedForeground,
                }}
              >
                {c.units.vote}
              </div>
            )}
          </div>
          <Brand palette={palette} size={26} />
        </div>
      </div>
    </div>
  );
}

export function OgArt(
  props: Art & { variant: ShareVariant; img: OgImageKind },
) {
  const { variant, ...rest } = props;
  if (variant === "b") return <ArtB {...rest} />;
  if (variant === "c") return <ArtC {...rest} />;
  return <ArtA {...rest} />;
}
