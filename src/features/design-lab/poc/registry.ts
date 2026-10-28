// /design-lab/poc 목록 (T2.13). PoC를 더하면 여기에 한 줄을 더한다. 제목과 설명은 각 PoC 문구 파일이 정본이다.
import { designLabPocCopy } from "@/copy/design-lab-poc";
import { pocLandingCopy } from "@/copy/design-lab-poc-landing";
import { pocNumbersCopy } from "@/copy/design-lab-poc-numbers";

export type PocEntry = {
  slug: string;
  title: string;
  description: string;
  /** 쓰는 라이브러리 (표시용 라벨) */
  libs: string;
};

export const POC_ENTRIES: readonly PocEntry[] = [
  {
    slug: "swipe-stack",
    ...pick(designLabPocCopy.swipe),
    libs: "Motion drag (domMax)",
  },
  {
    slug: "bottom-sheet",
    ...pick(designLabPocCopy.sheet),
    libs: "Base UI Drawer",
  },
  { slug: "shuffle", ...pick(designLabPocCopy.shuffle), libs: "Motion" },
  {
    slug: "celebrate",
    ...pick(designLabPocCopy.celebrate),
    libs: "canvas-confetti",
  },
  { slug: "number-flow", ...pick(pocNumbersCopy), libs: "NumberFlow" },
  { slug: "landing", ...pick(pocLandingCopy), libs: "Motion" },
];

function pick(c: { title: string; description: string }) {
  return { title: c.title, description: c.description };
}
