// 투표 링크 미리보기 이미지 (T7.14, POLL-04, POLL-09S, D-30 랜딩 B 구도). next/og ImageResponse(Satori)가 그린다.
// 랜딩 OG(D-29 B 큰 그릇)와 같은 틀: 왼쪽 위 기호 + 브랜드, 오른쪽 위 종류 라벨, 왼쪽 마루 부리 제목("제목," / 행동 유도 꼬리)과
// 숫자 한 줄(52), 오른쪽 큰 그릇 340. 초대, 결과 공개, 열 수 없는 방이 모두 같은 틀이다(결과는 득표 바 없이 숫자 두 칸).
// Satori 제약: 자식이 둘 이상인 div는 display flex, CSS 변수 없음(색은 생성 상수 sharePalette), 글꼴은 woff/ttf/otf만.
// 식당 이름과 카테고리는 받지 않는다(T0.16-4). 이미지는 늘 라이트 팔레트이고 올리브는 그릇 선 한 군데만 쓴다(DESIGN.md 5장 "공유 이미지").
// 공용 부품은 features/landing/og-art.tsx에서 가져온다. 그 파일이 이 파일의 글꼴 상수를 다시 내보내므로 서로 import하는 관계다.
// 그래서 이 파일은 모듈 최상위에서 공용 부품을 부르지 않는다(컴포넌트 안에서만 쓴다).
import type { ReactNode } from "react";
import { shareCopy } from "@/copy/share";
import {
  OgBigBowl,
  OgBrand,
  ogCol,
  ogRow,
  ogSerif,
} from "@/features/landing/og-art";
import { sharePalette as P } from "@/lib/design/share-palette.generated";
import type { OgImageKind, PollOg } from "./og-data";

export const OG_SIZE = { width: 1200, height: 600 } as const;
export const OG_SERIF = "MaruBuri";
export const OG_SANS = "Pretendard";

const c = shareCopy.og;

type Live = Extract<PollOg, { state: "open" | "closed" }>;

/** 행동 유도 꼬리. 문구 정본은 inviteHeadline, resultHeadline이고 제목 자리만 떼어 낸다("제목,"과 줄을 나눠 그린다) */
const tail = (f: (title: string) => string) => f("").replace(/^,\s*/, "");
export const OG_INVITE_TAIL = tail(c.inviteHeadline);
export const OG_RESULT_TAIL = tail(c.resultHeadline);

/** 숫자 줄 크기(D-30 안건 2) */
const FIG_SIZE = 52;
/** 왼쪽 글 칸 폭과 오른쪽 그릇 지름 */
const TEXT_WIDTH = 660;
const BOWL_SIZE = 340;

const sans = (size: number, color: string = P.mutedForeground) => ({
  fontFamily: OG_SANS,
  fontSize: size,
  color,
});

/** 제목 길이(글자 수)에 따라 한 단계씩 줄인다. 20자 제목도 두 줄 안에 든다 */
export function ogTitleSize(title: string): number {
  const n = [...title].length;
  if (n <= 8) return 76;
  if (n <= 12) return 66;
  return 56;
}

/** 오른쪽 위 라벨. 제목이 기본 문구로 바뀐 방(서버 글꼴 밖 글자)은 같은 말이 겹치므로 숨긴다(D-30 안건 3) */
export function ogLabel(og: Live, img: OgImageKind): string {
  if (og.title !== og.rawTitle) return "";
  return img === "result" && og.state === "closed"
    ? c.resultLabel[og.kind]
    : c.inviteLabel[og.kind];
}

function Frame({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div
      style={ogCol({
        width: "100%",
        height: "100%",
        background: P.background,
        // 글자는 좌우 88 안쪽(1.91:1로 자르는 서비스에서도 남는다, D-17 안건 2). 오른쪽은 그릇이라 72
        padding: "64px 72px 68px 88px",
      })}
    >
      <div
        style={ogRow({ justifyContent: "space-between", alignItems: "center" })}
      >
        <OgBrand />
        {label ? (
          <div style={{ ...sans(28), marginRight: 16 }}>{label}</div>
        ) : null}
      </div>
      <div
        style={ogRow({
          flex: 1,
          alignItems: "center",
          justifyContent: "space-between",
        })}
      >
        <div style={ogCol({ width: TEXT_WIDTH, gap: 36 })}>{children}</div>
        <OgBigBowl size={BOWL_SIZE} style={{ marginTop: 8 }} />
      </div>
    </div>
  );
}

/** "제목," 한 덩이(두 줄까지) + 꼬리 한 줄 */
function Headline({ title, tail }: { title: string; tail: string }) {
  return (
    <div style={ogCol(ogSerif(ogTitleSize(title)))}>
      <div style={{ display: "block", lineClamp: 2 }}>{`${title},`}</div>
      <div>{tail}</div>
    </div>
  );
}

type Fig = { label: string; value: string; unit?: string };

/** 라벨 + 값 + 단위를 같은 기준선에 (DESIGN.md 3장 숫자 표현) */
function FigInline({ f }: { f: Fig }) {
  const small = Math.round(FIG_SIZE * 0.6);
  return (
    <div style={ogRow({ alignItems: "baseline", gap: 12 })}>
      <div style={sans(small)}>{f.label}</div>
      <div style={ogRow({ alignItems: "baseline", gap: 4 })}>
        <div
          style={{
            ...sans(FIG_SIZE, P.foreground),
            lineHeight: 1,
            letterSpacing: "-0.02em",
          }}
        >
          {f.value}
        </div>
        {f.unit ? <div style={sans(small)}>{f.unit}</div> : null}
      </div>
    </div>
  );
}

function FigRow({ figs }: { figs: [Fig, Fig] }) {
  return (
    <div style={ogRow({ alignItems: "center" })}>
      <FigInline f={figs[0]} />
      <div
        style={{
          width: 2,
          height: Math.round(FIG_SIZE * 0.9),
          margin: "0 28px",
          background: P.border,
        }}
      />
      <FigInline f={figs[1]} />
    </div>
  );
}

function Invite({ og }: { og: Live }) {
  return (
    <Frame label={ogLabel(og, "invite")}>
      <Headline title={og.title} tail={OG_INVITE_TAIL} />
      <FigRow
        figs={[
          {
            label: c.labels.candidates,
            value: String(og.candidateCount),
            unit: c.units.place,
          },
          { label: c.labels.deadline, value: og.deadline },
        ]}
      />
    </Frame>
  );
}

function Result({ og }: { og: Live }) {
  // 숫자가 없으면(마이그레이션 적용 전) 숫자 줄 없이 제목만
  const counted = og.voters !== null && og.topVotes !== null;
  return (
    <Frame label={ogLabel(og, "result")}>
      <Headline title={og.title} tail={OG_RESULT_TAIL} />
      {counted ? (
        <FigRow
          figs={[
            {
              label: c.labels.voters,
              value: String(og.voters),
              unit: c.units.person,
            },
            {
              label: c.labels.top,
              value: String(og.topVotes),
              unit: c.units.vote,
            },
          ]}
        />
      ) : null}
    </Frame>
  );
}

function Unavailable() {
  return (
    <Frame label="">
      <div style={ogCol(ogSerif(66))}>{c.unavailableHeadline}</div>
      <div style={{ ...sans(32), lineHeight: 1.4 }}>{c.unavailableBody}</div>
    </Frame>
  );
}

export function PollOgArt({ og, img }: { og: PollOg; img: OgImageKind }) {
  if (og.state === "unavailable") return <Unavailable />;
  // 아직 결과가 없는 방의 결과 링크는 초대 그림을 쓴다
  if (img === "result" && og.state === "closed") return <Result og={og} />;
  return <Invite og={og} />;
}

/** 이미지 안 고정 글(KS X 1001 검사용). 제목은 사용자 입력이라 isOgDrawable이 런타임에 막는다 */
export const POLL_OG_FIXED_TEXTS: string[] = [
  OG_INVITE_TAIL,
  OG_RESULT_TAIL,
  c.unavailableHeadline,
  c.unavailableBody,
  ...Object.values(c.inviteLabel),
  ...Object.values(c.resultLabel),
  ...Object.values(c.labels),
  ...Object.values(c.units),
];

export function pollOgAlt(og: PollOg, img: OgImageKind): string {
  if (og.state === "unavailable") return c.alt.unavailable;
  if (img === "result" && og.state === "closed") {
    return og.voters !== null && og.topVotes !== null
      ? c.alt.result(og.voters, og.topVotes)
      : c.alt.resultNoCount;
  }
  return c.alt.invite(og.candidateCount, og.deadline);
}
