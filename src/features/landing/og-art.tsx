// 랜딩 링크 미리보기 이미지 (T10.11, PRD APP-04, D-29 B 큰 그릇). next/og ImageResponse(Satori)가 그린다.
// 1200 x 600(카카오 2:1), 늘 라이트 팔레트, 색은 생성 상수 sharePalette(하드코딩 색 0), 글자는 좌우 88 안쪽(1.91:1 자르기),
// 왼쪽 위 단색 그릇 기호 + 브랜드 글자, 왼쪽 마루 부리 Light 84 제목 세 줄, 오른쪽 앱 아이콘 그릇(D-18 A) 420.
// 올리브는 그릇 선 한 군데(제목 밑 선 없음). 제목은 copy-guide 4.13 "랜딩 OG". 식당 이름과 카테고리는 없다.
// 투표 OG도 같은 방향으로 맞출 수 있게 부품(OgBrand, OgBigBowl, ogRow, ogCol, ogSerif)을 내보낸다.
import type { CSSProperties } from "react";
import { landingOgCopy } from "@/copy/landing-og";
import { siteCopy } from "@/copy/common";
import {
  appIconSvg,
  bowlMarkup,
  monoInk,
  sandInk,
  svgDataUrl,
} from "@/features/pwa/icon-art";
import { sharePalette as P } from "@/lib/design/share-palette.generated";

export { OG_SANS, OG_SERIF, OG_SIZE } from "@/features/poll/share/og-art";
import { OG_SANS, OG_SERIF } from "@/features/poll/share/og-art";

// ── 공용 부품 ─────────────────────────────────────────────────────────────

export const ogRow = (s: CSSProperties = {}): CSSProperties => ({
  display: "flex",
  flexDirection: "row",
  ...s,
});

export const ogCol = (s: CSSProperties = {}): CSSProperties => ({
  display: "flex",
  flexDirection: "column",
  ...s,
});

/** 마루 부리 Light 제목 글자 */
export const ogSerif = (size: number): CSSProperties => ({
  fontFamily: OG_SERIF,
  fontWeight: 300,
  fontSize: size,
  lineHeight: 1.18,
  letterSpacing: "-0.02em",
  color: P.foreground,
  wordBreak: "keep-all",
});

const BRAND_MARK = svgDataUrl(
  appIconSvg({ ink: monoInk(P.foreground), level: "tiny", size: 24 }),
);

/** 왼쪽 위 단색 그릇 기호 24 + "런치메이트"(D-18 안건 6) */
export function OgBrand() {
  return (
    <div style={ogRow({ alignItems: "center", gap: 10 })}>
      {/* eslint-disable-next-line @next/next/no-img-element -- Satori(next/og)는 img만 그린다 */}
      <img src={BRAND_MARK} width={24} height={24} alt="" />
      <div
        style={{
          fontFamily: OG_SANS,
          fontSize: 28,
          color: P.foreground,
          letterSpacing: "-0.01em",
        }}
      >
        {siteCopy.name}
      </div>
    </div>
  );
}

/** 큰 그릇: 앱 아이콘 D-18 A 문법(짙은 샌드 원 + 옅은 원 + 올리브 선 그릇 + 김 세 줄). 올리브는 이 그릇 선 한 군데 */
const BIG_BOWL = svgDataUrl(
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><circle cx="50" cy="50" r="50" fill="${P.track}"/>${bowlMarkup(sandInk(P), "full")}</svg>`,
);

/** 장식 그림이라 alt는 비운다(이미지 전체 alt가 뜻을 전한다) */
export function OgBigBowl({
  size = 420,
  style,
}: {
  size?: number;
  style?: CSSProperties;
}) {
  return (
    // eslint-disable-next-line @next/next/no-img-element -- Satori(next/og)는 img만 그린다
    <img src={BIG_BOWL} width={size} height={size} alt="" style={style} />
  );
}

// ── 랜딩 OG ───────────────────────────────────────────────────────────────

/**
 * 제목 세 줄: "오늘 뭐 먹지," / "10초 안에" / "정합니다".
 * 쉼표 뒤에서 한 번, 둘째 덩이의 마지막 띄어쓰기에서 한 번 나눈다(오른쪽 그릇 자리 때문에 세 줄, D-29 안건 2).
 */
export const OG_TITLE_LINES: string[] = (() => {
  const [first = "", second = ""] = landingOgCopy.headline.split(/(?<=,)\s+/);
  const i = second.lastIndexOf(" ");
  return i < 0
    ? [first, second]
    : [first, second.slice(0, i), second.slice(i + 1)];
})();

export function LandingOgArt() {
  return (
    <div
      style={ogCol({
        width: "100%",
        height: "100%",
        background: P.background,
        padding: "64px 72px 68px 88px",
      })}
    >
      <OgBrand />
      <div
        style={ogRow({
          flex: 1,
          alignItems: "center",
          justifyContent: "space-between",
        })}
      >
        <div style={ogCol({ ...ogSerif(84), marginTop: 8 })}>
          {OG_TITLE_LINES.map((line) => (
            <div key={line}>{line}</div>
          ))}
        </div>
        <OgBigBowl style={{ marginTop: -30 }} />
      </div>
    </div>
  );
}

/** 이미지 안 모든 글(KS X 1001 검사용) */
export const LANDING_OG_TEXTS: string[] = [siteCopy.name, ...OG_TITLE_LINES];
