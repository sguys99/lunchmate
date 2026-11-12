import { expect, test } from "vitest";
import { claimPollCreate, openPollCreate, usePollCreateIntent } from "./intent";

test("같은 요청은 한 번만 시작한다(자리가 다시 마운트돼도 방을 또 만들지 않음)", () => {
  openPollCreate({ entry: "home", kind: "lunch", places: [] });
  const n = usePollCreateIntent.getState().nonce;
  expect(claimPollCreate(n)).toBe(true);
  expect(claimPollCreate(n)).toBe(false);
  openPollCreate({ entry: "home", kind: "lunch", places: [] });
  expect(claimPollCreate(n + 1)).toBe(true);
});
