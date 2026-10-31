// @vitest-environment jsdom
// 열리지 않은 탭 안내 (5단계 마무리): 404나 자리 문구 대신 탭 제목 + 안내 + 오늘 추천으로 가는 버튼 하나.
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { commonCopy } from "@/copy/common";
import { soonCopy } from "@/copy/soon";
import { ComingSoon } from "./coming-soon";

afterEach(cleanup);

describe("ComingSoon", () => {
  it.each(["poll", "me"] as const)(
    "%s: 탭 제목(h1), 안내(h2), 오늘 추천 링크",
    (kind) => {
      render(<ComingSoon kind={kind} />);
      expect(
        screen.getByRole("heading", { level: 1, name: commonCopy.tabs[kind] }),
      ).toBeVisible();
      expect(
        screen.getByRole("heading", { level: 2, name: soonCopy[kind].title }),
      ).toBeVisible();
      expect(screen.getByText(soonCopy[kind].body)).toBeVisible();
      const links = screen.getAllByRole("link");
      expect(links).toHaveLength(1);
      expect(links[0]).toHaveAttribute("href", "/today");
      expect(links[0]).toHaveTextContent(soonCopy.toToday);
    },
  );
});
