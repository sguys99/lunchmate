// @vitest-environment jsdom
// 열리지 않은 탭 안내 (5단계 마무리): 404나 자리 문구 대신 탭 제목 + 안내 + 오늘 추천으로 가는 버튼 하나.
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { commonCopy } from "@/copy/common";
import { meCopy } from "@/copy/me";
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
      // 하위 경로와 투표 탭에는 화면 설정이 없다
      expect(screen.queryByText(soonCopy.me.displayTitle)).toBeNull();
      expect(screen.queryByRole("checkbox")).toBeNull();
    },
  );

  it("me 루트(displaySettings): 안내 아래 화면 설정(테마 칩 3개, 모션 줄이기, 진동)", () => {
    render(<ComingSoon kind="me" displaySettings />);
    expect(
      screen.getByRole("heading", { level: 2, name: soonCopy.me.title }),
    ).toBeVisible();
    expect(screen.getByText(soonCopy.me.bodyWithDisplay)).toBeVisible();
    expect(screen.queryByText(soonCopy.me.body)).toBeNull();
    // 버튼은 여전히 하나(보조 버튼), 설정은 칩과 체크박스
    const links = screen.getAllByRole("link");
    expect(links).toHaveLength(1);
    expect(links[0]).toHaveAttribute("href", "/today");
    expect(
      screen.getByRole("heading", { level: 2, name: soonCopy.me.displayTitle }),
    ).toBeVisible();
    const group = screen.getByRole("group", { name: meCopy.display.theme });
    for (const label of Object.values(meCopy.display.themeOptions))
      expect(group).toHaveTextContent(label);
    expect(screen.getAllByRole("checkbox")).toHaveLength(2);
    // 안내(버튼 포함)가 설정보다 먼저 온다
    const order = links[0]!.compareDocumentPosition(group);
    expect(order & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  });
});
