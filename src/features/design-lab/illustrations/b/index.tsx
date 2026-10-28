// 시안 B "Quiet Stone" 카테고리 선화 일러스트 (T1.5). 장식이므로 모두 aria-hidden.
import type { CategorySlug } from "@/features/place/categories";
import {
  Asian,
  Bunsik,
  Cafe,
  Fastfood,
  Gogi,
  Gukbap,
  Hansik,
  Ilsik,
  Jungsik,
  Pub,
  Salad,
  Yangsik,
} from "./drawings";

const DRAWINGS = {
  hansik: Hansik,
  jungsik: Jungsik,
  ilsik: Ilsik,
  yangsik: Yangsik,
  bunsik: Bunsik,
  gukbap: Gukbap,
  gogi: Gogi,
  asian: Asian,
  fastfood: Fastfood,
  salad: Salad,
  cafe: Cafe,
  pub: Pub,
} satisfies Record<
  CategorySlug,
  (props: { className?: string }) => React.ReactNode
>;

export function IllustrationB({
  category,
  className,
}: {
  category: CategorySlug;
  className?: string;
}) {
  const Drawing = DRAWINGS[category];
  return <Drawing className={className} />;
}
