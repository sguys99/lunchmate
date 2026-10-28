import react from "@vitejs/plugin-react";
import { defineConfig } from "vitest/config";

export default defineConfig({
  plugins: [react()],
  // tsconfig의 paths(@/*)를 Vite 내장 옵션으로 해석
  resolve: { tsconfigPaths: true },
  test: {
    // 기본은 node(순수 함수 위주). 컴포넌트 테스트는 파일 상단에 `// @vitest-environment jsdom`
    environment: "node",
    include: ["src/**/*.test.{ts,tsx}"],
    exclude: ["node_modules", "e2e", ".next"],
    setupFiles: ["./vitest.setup.ts"],
  },
});
