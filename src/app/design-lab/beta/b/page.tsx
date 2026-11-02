// /design-lab/beta/b (T9.3 베타 환영 페이지 시안 B). 쿼리 규약은 features/design-lab/beta/params.ts 머리 주석.
// 플래그 차단은 design-lab/layout.tsx. 카카오톡 인앱 메뉴 그림(la-ring)은 auth.css.
import type { Metadata } from "next";
import "@/features/auth/auth.css";
import { betaLabCopy } from "@/copy/design-lab-beta";
import { BetaLabRoute } from "@/features/design-lab/beta/route";

export const metadata: Metadata = {
  title: betaLabCopy.names.b,
};

export default function Page(props: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  return <BetaLabRoute variant="b" searchParams={props.searchParams} />;
}
