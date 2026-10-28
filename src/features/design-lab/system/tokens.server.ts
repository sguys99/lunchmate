// 서버 전용: 확정 DESIGN.md(루트) 프런트매터에서 JS용 토큰을 읽는다 (T1.14, T1.20).
// 클라이언트 컴포넌트에서 import하지 않는다(node:fs). 결과를 props로 내려준다.
//
// G1 확정(D-01) 후 디자인 랩 화면은 시안 문서(docs/design/candidates/) 대신 루트 DESIGN.md를 읽는다.
// CSS 변수도 src/styles/tokens.css(:root, 루트 DESIGN.md 생성물)를 그대로 쓰므로, DESIGN.md를 고치고
// `pnpm tokens`를 실행하면 디자인 랩 화면이 따라 바뀐다(T1.21).
// 런타임에 읽어도 Vercel 함수 번들에 문서가 포함되도록 next.config.ts의 outputFileTracingIncludes에 DESIGN.md를 넣었다.
import { readFileSync } from "node:fs";
import path from "node:path";
import { parseDesignDoc, type DesignFrontmatter } from "@/lib/design/schema";
import type { DesignScreenTokens } from "./types";

let docCache: DesignFrontmatter | undefined;
let tokenCache: DesignScreenTokens | undefined;

/** 확정 DESIGN.md 프런트매터 전체 (견본표 페이지용). 같은 프로세스에서는 한 번만 읽는다. */
export function getFinalFrontmatter(): DesignFrontmatter {
  if (docCache) return docCache;
  const file = path.join(process.cwd(), "DESIGN.md");
  docCache = parseDesignDoc(readFileSync(file, "utf8")).tokens;
  return docCache;
}

/** 화면 컴포넌트용 JS 토큰 (motion, layout, illustration). */
export function getScreenTokens(): DesignScreenTokens {
  if (tokenCache) return tokenCache;
  const tokens = getFinalFrontmatter();
  const { id, name, concept, mood } = tokens.meta;
  tokenCache = {
    meta: { id, name, concept, mood },
    motion: tokens.motion,
    layout: tokens.layout,
    illustration: tokens.illustration,
  };
  return tokenCache;
}
