// @vitest-environment jsdom
// AC-ONB-3 흐름 단위 테스트: 현위치, 검색 좌표는 저장 요청에 들어가지 않고 직접 놓은 핀만 저장된다 (T4.16, T0.18).
import { act, renderHook, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { EMPTY_AVOID, PREF_DEFAULTS } from "./constants";
import { mapMoveTarget } from "./pin";
import type { FinishOnboardingRequest } from "./request";
import { useOnboarding, type OnboardingDeps } from "./use-onboarding";

const CURRENT = { lat: 37.4979, lng: 127.0276 };
const SEARCH = { lat: 37.5013, lng: 127.0396 };
const TAP = { lat: 37.5021, lng: 127.0411 };

function setup(over: Partial<OnboardingDeps> = {}) {
  const submit = vi.fn(async (req: FinishOnboardingRequest) => ({
    ok: true as const,
    location: req.next,
  }));
  const deps: OnboardingDeps = {
    submit,
    locate: vi.fn(async () => ({
      ok: true as const,
      target: mapMoveTarget(CURRENT, "current-location"),
    })),
    readPermission: vi.fn(async () => "prompt" as const),
    navigate: vi.fn(),
    stepCompleted: vi.fn(),
    ...over,
  };
  const mover = vi.fn();
  const hook = renderHook(() =>
    useOnboarding({
      next: "/today",
      initialPrefs: { ...PREF_DEFAULTS },
      initialAvoid: EMPTY_AVOID,
      deps,
    }),
  );
  act(() => hook.result.current.registerMover(mover));
  return { hook, deps, submit, mover };
}

describe("useOnboarding 좌표 경로 (AC-ONB-3)", () => {
  it("현위치는 지도만 옮기고 핀을 만들지 않는다. 저장 버튼은 꺼진 채다", async () => {
    const { hook, mover, submit } = setup();
    await act(() => hook.result.current.locate());
    expect(mover).toHaveBeenCalledWith(CURRENT);
    expect(hook.result.current.canSave).toBe(false);
    act(() => hook.result.current.saveOffice());
    expect(hook.result.current.step).toBe(1);
    expect(submit).not.toHaveBeenCalled();
  });

  it("검색 이동 뒤에도 핀이 비고, 놓은 핀 좌표만 저장 요청에 들어간다", async () => {
    const { hook, mover, submit, deps } = setup();
    await act(() => hook.result.current.locate());
    act(() =>
      hook.result.current.placePin({ kind: "map-tap", position: SEARCH }),
    );
    // 검색으로 지도를 옮기면 이미 놓은 핀도 비운다
    act(() =>
      hook.result.current.chooseSearchResult(
        "소담빌딩",
        mapMoveTarget(SEARCH, "search"),
      ),
    );
    expect(mover).toHaveBeenLastCalledWith(SEARCH);
    expect(hook.result.current.canSave).toBe(false);

    act(() => hook.result.current.placePin({ kind: "map-tap", position: TAP }));
    act(() => hook.result.current.saveOffice());
    expect(hook.result.current.step).toBe(2);
    await act(async () => hook.result.current.finishNow());

    expect(submit).toHaveBeenCalledTimes(1);
    const req = submit.mock.calls[0]![0];
    expect(req.office).toEqual(TAP);
    const body = JSON.stringify(req);
    expect(body).not.toContain(String(CURRENT.lat));
    expect(body).not.toContain(String(SEARCH.lat));
    expect(body).not.toContain("소담빌딩");
    expect(deps.navigate).toHaveBeenCalledWith("/today");
  });

  it("2, 3단계에서는 핀을 바꿀 수 없다", () => {
    const { hook } = setup();
    act(() => hook.result.current.placePin({ kind: "map-tap", position: TAP }));
    act(() => hook.result.current.saveOffice());
    act(() =>
      hook.result.current.placePin({ kind: "map-tap", position: SEARCH }),
    );
    expect(hook.result.current.office.pin).toEqual(TAP);
  });

  it("권한 거부면 현위치 버튼을 숨긴다(AC-ONB-2)", async () => {
    const { hook } = setup({
      locate: vi.fn(async () => ({
        ok: false as const,
        reason: "denied" as const,
      })),
    });
    await act(() => hook.result.current.locate());
    expect(hook.result.current.locateHidden).toBe(true);
  });

  it("처음부터 권한이 거부되어 있으면 숨긴 채 시작한다", async () => {
    const { hook } = setup({
      readPermission: vi.fn(async () => "denied" as const),
    });
    await waitFor(() => expect(hook.result.current.locateHidden).toBe(true));
  });
});

describe("건너뛰기와 단축 (ONB-04)", () => {
  it("2단계 건너뛰기는 시작 값으로 되돌리고 3단계로, 3단계 건너뛰기는 저장", async () => {
    const { hook, submit, deps } = setup();
    act(() => hook.result.current.placePin({ kind: "map-tap", position: TAP }));
    act(() => hook.result.current.saveOffice());
    act(() => hook.result.current.setWalk(20));
    act(() => hook.result.current.skip());
    expect(hook.result.current.step).toBe(3);
    expect(hook.result.current.prefs.walk).toBe(10);
    act(() => hook.result.current.setFoods(["회"]));
    await act(async () => hook.result.current.skip());
    expect(submit.mock.calls[0]![0].avoid).toEqual(EMPTY_AVOID);
    expect(deps.stepCompleted).toHaveBeenCalledWith(2, true);
    expect(deps.stepCompleted).toHaveBeenCalledWith(3, true);
  });

  it("저장 실패면 값을 그대로 두고 오류를 보여 준다", async () => {
    const { hook } = setup({
      submit: vi.fn(async () => ({
        ok: false as const,
        error: "save" as const,
      })),
    });
    act(() => hook.result.current.placePin({ kind: "map-tap", position: TAP }));
    act(() => hook.result.current.saveOffice());
    act(() => hook.result.current.setLunch(12_000));
    await act(async () => hook.result.current.finishNow());
    expect(hook.result.current.saveError).toBe(true);
    expect(hook.result.current.finishing).toBe(false);
    expect(hook.result.current.prefs.lunch).toBe(12_000);
  });

  it("직접 입력은 중복과 10개 상한을 막는다", () => {
    const { hook } = setup();
    let r = "";
    act(() => {
      r = hook.result.current.addCustom(" 고수 ");
    });
    expect(r).toBe("added");
    act(() => {
      r = hook.result.current.addCustom("고수");
    });
    expect(r).toBe("duplicate");
    for (let i = 0; i < 9; i++)
      act(() => {
        hook.result.current.addCustom(`음식${i}`);
      });
    act(() => {
      r = hook.result.current.addCustom("하나 더");
    });
    expect(r).toBe("limit");
  });
});
