// @vitest-environment jsdom
import { useQueryClient } from "@tanstack/react-query";
import { cleanup, render } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { getQueryClient } from "./client";
import { QueryProvider } from "./provider";

afterEach(cleanup);

describe("QueryProvider (T2.19)", () => {
  it("브라우저에서는 탭당 하나의 클라이언트를 다시 쓴다", () => {
    expect(getQueryClient()).toBe(getQueryClient());
  });

  it("자식에게 브라우저 싱글턴 클라이언트를 준다", () => {
    let seen: unknown;
    function Probe() {
      seen = useQueryClient();
      return null;
    }
    render(
      <QueryProvider>
        <Probe />
      </QueryProvider>,
    );
    expect(seen).toBe(getQueryClient());
  });
});
