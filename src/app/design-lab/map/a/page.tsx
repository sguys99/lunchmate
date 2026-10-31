// /design-lab/map/a: 지도와 바텀시트 시안 A (T5.1). 쿼리는 features/design-lab/map/route.tsx 참고.
import type { Metadata } from "next";
import { mapLabCopy } from "@/copy/design-lab-map";
import { MapA } from "@/features/design-lab/map/a/map-a";
import { MapLabRoute } from "@/features/design-lab/map/route";

export const metadata: Metadata = {
  title: `${mapLabCopy.metaTitle} ${mapLabCopy.names.a}`,
};

export default function MapLabAPage(props: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  return <MapLabRoute searchParams={props.searchParams} Candidate={MapA} />;
}
