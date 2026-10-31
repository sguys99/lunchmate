// /design-lab/map/c: 지도와 바텀시트 시안 C (T5.1). 쿼리는 features/design-lab/map/route.tsx 참고.
import type { Metadata } from "next";
import { mapLabCopy } from "@/copy/design-lab-map";
import { MapC } from "@/features/design-lab/map/c/map-c";
import { MapLabRoute } from "@/features/design-lab/map/route";

export const metadata: Metadata = {
  title: `${mapLabCopy.metaTitle} ${mapLabCopy.names.c}`,
};

export default function MapLabCPage(props: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  return <MapLabRoute searchParams={props.searchParams} Candidate={MapC} />;
}
