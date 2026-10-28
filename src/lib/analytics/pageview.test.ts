import { describe, expect, it } from "vitest";
import { pageviewPath } from "./pageview";

describe("pageviewPath", () => {
  it.each([
    ["/", "/"],
    ["/today", "/today"],
    ["/poll", "/poll"],
    ["/poll/Ab3xK9pQz2", "/poll/[code]"],
    ["/poll/Ab3xK9pQz2/result", "/poll/[code]/result"],
    ["/map?lat=37.5&lng=127.0", "/map"],
    ["/today#card-2", "/today"],
    ["", "/"],
  ])("%s → %s", (input, expected) => {
    expect(pageviewPath(input)).toBe(expected);
  });
});
