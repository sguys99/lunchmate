/**
 * DESIGN.md 프런트매터 → JS 토큰 모듈 변환 (T2.11). 순수 함수만 둔다(파일 IO는 scripts/build-tokens.ts).
 *
 * CSS 변수로는 넘길 수 없는 값(Motion의 spring, cubic-bezier 배열)을 클라이언트 번들에서 쓰도록
 * TS 상수 파일로 만든다. 브라우저는 DESIGN.md를 읽을 수 없고(node:fs), 값을 손으로 옮기면 정본과 어긋나므로
 * `pnpm tokens`가 tokens.css와 함께 이 파일을 만든다. 출력은 Prettier가 한 번 더 정리한다.
 *
 * Node type stripping으로도 읽히도록 erasable 문법만 쓰고, schema에서는 타입만 가져온다.
 */
import type { DesignFrontmatter } from "./schema";

/** 생성 경로 (저장소 루트 기준). */
export const MOTION_TOKENS_OUT = "src/lib/motion/tokens.generated.ts";

function metaLine(tokens: DesignFrontmatter): string {
  const { id, name, status } = tokens.meta;
  return `${id} "${name}" (${status})`;
}

/** 확정본 motion 토큰 → src/lib/motion/tokens.generated.ts 전체. 키 순서는 zod 스키마 순서라 결정적이다. */
export function motionTokensFile(tokens: DesignFrontmatter): string {
  const header = [
    "/*",
    " * 생성물, 직접 수정 금지. 원본: DESIGN.md (루트) 프런트매터 motion",
    " * 다시 만들기: pnpm tokens (scripts/build-tokens.ts, 변환: src/lib/design/to-ts.ts)",
    ` * ${metaLine(tokens)}`,
    " * 단위: duration, stagger는 ms. easing은 cubic-bezier(x1, y1, x2, y2).",
    " */",
  ].join("\n");
  return [
    header,
    'import type { DesignFrontmatter } from "@/lib/design/schema";',
    "",
    `export const motionTokens: DesignFrontmatter["motion"] = ${JSON.stringify(tokens.motion)};`,
    "",
  ].join("\n");
}
