// /design-lab/components 컴포넌트 갤러리 (T2.5 초안, T2.10 완성). 상위 design-lab/layout.tsx가 플래그로 막는다.
// T2.16 시각 회귀와 T2.17 axe 검사의 기준 페이지. 쿼리 ?theme=, ?motion=, ?static=1로 상태를 고정한다(params.ts).
// 쿼리는 서버에서 읽어 첫 렌더부터 같은 상태로 그린다. 요청 시점 값이라 Suspense 안에서 읽는다(cacheComponents).
import type { Metadata } from "next";
import { Suspense } from "react";
import { designLabComponentsCopy as copy } from "@/copy/design-lab-components";
import { ComponentsGallery } from "@/features/design-lab/components/gallery";
import {
  parseGalleryOptions,
  serializeGalleryOptions,
} from "@/features/design-lab/components/params";

export const metadata: Metadata = { title: copy.metaTitle };

type SearchParams = Record<string, string | string[] | undefined>;

async function GalleryRoute({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const initial = parseGalleryOptions(await searchParams);
  return (
    <ComponentsGallery
      key={serializeGalleryOptions(initial)}
      initial={initial}
    />
  );
}

export default function DesignLabComponentsPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  return (
    <Suspense>
      <GalleryRoute searchParams={searchParams} />
    </Suspense>
  );
}
