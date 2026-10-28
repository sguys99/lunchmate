// 서버 전용: 시안 DESIGN.md 프런트매터에서 JS용 토큰을 읽는다 (T1.14).
// 클라이언트 컴포넌트에서 import하지 않는다(node:fs). 결과를 props로 내려준다.
//
// 파일 읽기 방식을 고른 이유: 프런트매터(정본)를 그대로 파싱하므로 `pnpm tokens`와 값이 어긋날 일이 없다.
// 런타임에 읽어도 Vercel 함수 번들에 문서가 포함되도록 next.config.ts의 outputFileTracingIncludes에
// docs/design/candidates/*.DESIGN.md를 넣었다. (design-lab은 프로덕션에서 꺼져 있어 실제로 읽힐 일은 거의 없다.)
import { readFileSync } from "node:fs";
import path from "node:path";
import { parseDesignDoc } from "@/lib/design/schema";
import {
  DESIGN_IDS,
  type DesignId,
  type DesignScreenTokens,
  type DesignTokensById,
} from "./types";

const cacheById = new Map<DesignId, DesignScreenTokens>();

/** 시안 하나의 JS용 토큰. 같은 프로세스에서는 한 번만 읽는다. */
export function getDesignTokens(id: DesignId): DesignScreenTokens {
  const hit = cacheById.get(id);
  if (hit) return hit;
  const file = path.join(
    process.cwd(),
    "docs/design/candidates",
    `${id}.DESIGN.md`,
  );
  const { tokens } = parseDesignDoc(readFileSync(file, "utf8"));
  const { id: metaId, name, concept, mood } = tokens.meta;
  const value: DesignScreenTokens = {
    meta: { id: metaId, name, concept, mood },
    motion: tokens.motion,
    layout: tokens.layout,
    illustration: tokens.illustration,
  };
  cacheById.set(id, value);
  return value;
}

/** 시안 3안 전부 (스위처용) */
export function getAllDesignTokens(): DesignTokensById {
  return Object.fromEntries(
    DESIGN_IDS.map((id) => [id, getDesignTokens(id)]),
  ) as Record<DesignId, DesignScreenTokens>;
}
