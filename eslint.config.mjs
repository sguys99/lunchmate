import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";
import prettier from "eslint-config-prettier/flat";
import { plugin as lunchmate } from "./scripts/color-lint/no-hardcoded-color.mjs";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  {
    rules: { "@typescript-eslint/no-explicit-any": "error" },
  },
  // 하드코딩 색 금지 (T1.19, CLAUDE.md 6.3). CSS 파일은 scripts/check-css-colors.mjs가 같은 패턴으로 검사한다.
  // 제외: 토큰 파이프라인 자체(src/lib/design, oklch 문자열을 파싱하고 생성함)와 테스트 픽스처.
  {
    files: ["src/**/*.{ts,tsx}"],
    ignores: ["src/lib/design/**", "src/**/*.test.{ts,tsx}"],
    plugins: { lunchmate },
    rules: { "lunchmate/no-hardcoded-color": "error" },
  },
  // 포맷 규칙은 Prettier가 담당 (반드시 마지막 규칙 세트)
  prettier,
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
    // 에이전트 도구 폴더는 검사 대상이 아님
    ".claude/**",
  ]),
]);

export default eslintConfig;
