// /design-lab/map/b: 지도와 바텀시트 시안 B (T5.1). 쿼리는 features/design-lab/map/route.tsx 참고.
import type { Metadata } from "next";
import { mapLabCopy } from "@/copy/design-lab-map";
import { MapB } from "@/features/design-lab/map/b/map-b";
import { MapLabRoute } from "@/features/design-lab/map/route";

export const metadata: Metadata = {
  title: `${mapLabCopy.metaTitle} ${mapLabCopy.names.b}`,
};

export default function MapLabBPage(props: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  return <MapLabRoute searchParams={props.searchParams} Candidate={MapB} />;
}
