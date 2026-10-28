// 카테고리 일러스트 (T2.8, DESIGN.md 6장). 서버 컴포넌트에서도 그대로 쓴다(훅 없음).
//
//   <CategoryIllustration slug="hansik" />                 카드 96px, 장식(aria-hidden)
//   <CategoryIllustration slug="pub" size={36} />          리스트 아이콘, 36px라서 자동으로 icon 변형
//   <CategoryIllustration slug="cafe" decorative={false} /> 혼자 뜻을 전할 때 role="img" + 카테고리 라벨
//
// 크기는 className이 아니라 size로 준다. 선 굵기가 size에 맞춰 계산되기 때문이다.
import { categoryLabel, type CategorySlug } from "@/features/place/categories";
import { DRAWINGS } from "./drawings";
import { Frame, type IllustrationVariant } from "./frame";

export type { IllustrationVariant } from "./frame";

/** 이 크기(px) 미만이면 variant를 주지 않아도 icon 변형을 쓴다. */
export const ICON_VARIANT_MAX_SIZE = 64;

export type CategoryIllustrationProps = {
  slug: CategorySlug;
  /** 표시 크기(px). 기본 96(추천 카드). 리스트 아이콘 32~40, 큰 카드 120~160. */
  size?: number;
  /** card: 잔선 포함, icon: 잔선을 빼고 선을 또렷하게. 기본은 size로 자동 결정. */
  variant?: IllustrationVariant;
  /** 기본 true. 옆에 카테고리 이름이 함께 보이면 장식으로 둔다. */
  decorative?: boolean;
  className?: string;
};

export function CategoryIllustration({
  slug,
  size = 96,
  variant,
  decorative = true,
  className,
}: CategoryIllustrationProps) {
  const v: IllustrationVariant =
    variant ?? (size < ICON_VARIANT_MAX_SIZE ? "icon" : "card");
  return (
    <Frame
      category={slug}
      size={size}
      variant={v}
      className={className}
      label={decorative ? undefined : categoryLabel(slug)}
    >
      {DRAWINGS[slug]({ detail: v === "card" })}
    </Frame>
  );
}
