// 시안 A "Terracotta Table" 카테고리 일러스트 (T1.4).
// 손맛 있는 채색: 살짝 어긋난 외곽, 2~3톤 면, 하이라이트 한두 개, 포인트 컬러 한 점.
// 색은 토큰 변수만 쓴다(--cat-<slug>-surface/ink, --card, --primary 등). 장식이므로 aria-hidden.
import type { CSSProperties, ReactElement } from "react";
import type { CategorySlug } from "@/features/place/categories";
import { cn } from "@/lib/utils";
import { AsianArt } from "./asian";
import { BunsikArt } from "./bunsik";
import { CafeArt } from "./cafe";
import { FastfoodArt } from "./fastfood";
import { GogiArt } from "./gogi";
import { GukbapArt } from "./gukbap";
import { HansikArt } from "./hansik";
import "./illustration-a.css";
import { s } from "./cls";
import { IlsikArt } from "./ilsik";
import { JungsikArt } from "./jungsik";
import { PubArt } from "./pub";
import { SaladArt } from "./salad";
import { YangsikArt } from "./yangsik";

const ART: Record<CategorySlug, () => ReactElement> = {
  hansik: HansikArt,
  jungsik: JungsikArt,
  ilsik: IlsikArt,
  yangsik: YangsikArt,
  bunsik: BunsikArt,
  gukbap: GukbapArt,
  gogi: GogiArt,
  asian: AsianArt,
  fastfood: FastfoodArt,
  salad: SaladArt,
  cafe: CafeArt,
  pub: PubArt,
};

/** 가로 16:10 (viewBox 160x100). 영역을 꽉 채우도록 slice로 맞춘다. */
export function IllustrationA({
  category,
  className,
}: {
  category: CategorySlug;
  className?: string;
}) {
  const Art = ART[category];
  const vars = {
    "--il-s": `var(--cat-${category}-surface)`,
    "--il-i": `var(--cat-${category}-ink)`,
  } as CSSProperties;
  return (
    <svg
      viewBox="0 0 160 100"
      preserveAspectRatio="xMidYMid slice"
      aria-hidden="true"
      focusable="false"
      className={cn(s.root, className)}
      style={vars}
    >
      <rect className={s.bg} width={160} height={100} />
      <g transform="translate(80 56) scale(1.08) translate(-80 -56)">
        <Art />
      </g>
    </svg>
  );
}
