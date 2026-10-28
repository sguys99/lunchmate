import type { CSSProperties, ReactNode } from "react";
import type { CategorySlug } from "@/features/place/categories";
import { AsianC } from "./asian";
import { BunsikC } from "./bunsik";
import { CafeC } from "./cafe";
import { FastfoodC } from "./fastfood";
import { GogiC } from "./gogi";
import { GukbapC } from "./gukbap";
import { HansikC } from "./hansik";
import { IlsikC } from "./ilsik";
import { JungsikC } from "./jungsik";
import { PubC } from "./pub";
import { SaladC } from "./salad";
import { YangsikC } from "./yangsik";

// 시안 C "Clay Grid" 카테고리 일러스트 (docs/design/candidates/c.DESIGN.md 6절).
// 64x64 플랫, 외곽선 없음. 한 카테고리 = 한 색상(hue)의 네 톤.
const SHAPES: Record<CategorySlug, () => ReactNode> = {
  hansik: HansikC,
  jungsik: JungsikC,
  ilsik: IlsikC,
  yangsik: YangsikC,
  bunsik: BunsikC,
  gukbap: GukbapC,
  gogi: GogiC,
  asian: AsianC,
  fastfood: FastfoodC,
  salad: SaladC,
  cafe: CafeC,
  pub: PubC,
};

function tones(category: CategorySlug): CSSProperties {
  const ink = `var(--cat-${category}-ink)`;
  const surface = `var(--cat-${category}-surface)`;
  return {
    "--ic-k": ink,
    "--ic-m": `color-mix(in oklch, ${ink} 55%, ${surface})`,
    "--ic-l": `color-mix(in oklch, ${ink} 22%, ${surface})`,
    "--ic-s": surface,
  } as CSSProperties;
}

export function IllustrationC({
  category,
  className,
}: {
  category: CategorySlug;
  className?: string;
}) {
  const Shape = SHAPES[category];
  return (
    <svg
      viewBox="0 0 64 64"
      className={className}
      style={tones(category)}
      aria-hidden="true"
      focusable="false"
    >
      <rect width="64" height="64" rx="7" fill="var(--ic-s)" />
      <Shape />
    </svg>
  );
}
