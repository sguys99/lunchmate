// axe 접근성 검사 공통 헬퍼 (T2.17). WCAG 2.1 A, AA 규칙과 axe best-practice(heading 순서, h1 존재,
// 랜드마크 이름 중복 등)를 돌리고 위반 0을 기대한다. 대비처럼 axe가 판정하지 못한 incomplete는 실패로 보지 않는다
// (대비는 pnpm contrast가 토큰 단위로 따로 검증한다).
// 위반이 나오면 컴포넌트를 고친다. 의도적 예외는 disableRules에 규칙 id와 이유 주석을 함께 남기고 최소한으로만 쓴다.
import AxeBuilder from "@axe-core/playwright";
import { expect, type Page } from "@playwright/test";

export const AXE_TAGS = [
  "wcag2a",
  "wcag2aa",
  "wcag21a",
  "wcag21aa",
  "best-practice",
];

type AxeOptions = {
  /** 검사 범위를 좁힐 CSS 선택자. 기본은 문서 전체 */
  include?: string;
  /** 검사에서 뺄 선택자 (예: 서드파티 위젯) */
  exclude?: string[];
  /** 끌 규칙 id. 반드시 호출하는 곳에 이유를 주석으로 적는다 */
  disableRules?: string[];
};

/** 위반을 한 줄씩 읽기 좋게 요약한다(규칙, 영향도, 대상 선택자, 첫 실패 요약) */
function formatViolations(
  violations: Awaited<ReturnType<AxeBuilder["analyze"]>>["violations"],
) {
  return violations
    .flatMap((v) =>
      v.nodes.map(
        (n) =>
          `[${v.id}] (${v.impact ?? "?"}) ${n.target.join(" ")}\n    ${n.failureSummary?.split("\n").join("\n    ") ?? v.help}`,
      ),
    )
    .join("\n");
}

export async function expectNoA11yViolations(
  page: Page,
  options: AxeOptions = {},
) {
  let builder = new AxeBuilder({ page }).withTags(AXE_TAGS);
  if (options.include) builder = builder.include(options.include);
  for (const sel of options.exclude ?? []) builder = builder.exclude(sel);
  // Next dev 인디케이터와 개발 오버레이(shadow DOM)는 앱 화면이 아니다. 프로덕션에는 없다.
  builder = builder.exclude("nextjs-portal");
  if (options.disableRules?.length)
    builder = builder.disableRules(options.disableRules);

  const { violations } = await builder.analyze();
  expect(violations, formatViolations(violations)).toEqual([]);
}
