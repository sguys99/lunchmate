// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  FIRST_VISIT_MAX_WAIT_MS,
  WEB_FONTS_HREF,
  WEB_FONTS_INIT_SCRIPT,
  WEB_FONTS_LINK_ID,
  WEB_FONTS_STORAGE_KEY,
  WEB_FONTS_VERSION,
} from "./web-fonts";

const run = () => new Function(WEB_FONTS_INIT_SCRIPT)();
const link = () =>
  document.getElementById(WEB_FONTS_LINK_ID) as HTMLLinkElement | null;

function setReadyState(state: DocumentReadyState) {
  Object.defineProperty(document, "readyState", {
    configurable: true,
    get: () => state,
  });
}

describe("WEB_FONTS_INIT_SCRIPT", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    localStorage.clear();
    document.head.innerHTML = "";
    document.body.innerHTML = "";
    // jsdom에는 requestIdleCallback이 없다. setTimeout 대체 경로를 쓴다
  });
  afterEach(() => {
    vi.useRealTimers();
    setReadyState("complete");
  });

  it("재방문(표시 있음)은 바로 렌더링 차단 링크를 붙인다", () => {
    localStorage.setItem(WEB_FONTS_STORAGE_KEY, WEB_FONTS_VERSION);
    setReadyState("loading");
    run();
    const l = link();
    expect(l?.getAttribute("href")).toBe(WEB_FONTS_HREF);
    expect(l?.rel).toBe("stylesheet");
    expect(l?.getAttribute("blocking")).toBe("render");
  });

  it("다른 버전 표시는 첫 방문으로 본다", () => {
    localStorage.setItem(WEB_FONTS_STORAGE_KEY, "v0");
    setReadyState("loading");
    run();
    expect(link()).toBeNull();
  });

  it("첫 방문은 load 전에 링크를 붙이지 않고, load 뒤 유휴 시간에 붙인다(차단 없음)", () => {
    setReadyState("loading");
    run();
    expect(link()).toBeNull();
    window.dispatchEvent(new Event("load"));
    vi.advanceTimersByTime(150);
    expect(link()?.getAttribute("blocking")).toBeNull();
  });

  it("첫 방문은 로딩 영역이 남아 있는 동안 기다린다", () => {
    setReadyState("complete");
    document.body.innerHTML = '<div data-slot="loading-region"></div>';
    run();
    vi.advanceTimersByTime(2000);
    expect(link()).toBeNull();
    document.body.innerHTML = "<article><h2>카드</h2></article>";
    vi.advanceTimersByTime(400);
    expect(link()).not.toBeNull();
  });

  it("로딩 영역이 끝나지 않아도 최대 대기 뒤에는 붙인다", () => {
    setReadyState("complete");
    document.body.innerHTML = '<div data-slot="loading-region"></div>';
    run();
    vi.advanceTimersByTime(FIRST_VISIT_MAX_WAIT_MS + 500);
    expect(link()).not.toBeNull();
  });

  it("글꼴 목록을 받으면 표시를 남긴다", async () => {
    setReadyState("complete");
    Object.defineProperty(document, "fonts", {
      configurable: true,
      value: { ready: Promise.resolve() },
    });
    run();
    vi.advanceTimersByTime(150);
    link()!.onload!(new Event("load"));
    vi.advanceTimersByTime(20);
    await vi.waitFor(() =>
      expect(localStorage.getItem(WEB_FONTS_STORAGE_KEY)).toBe(
        WEB_FONTS_VERSION,
      ),
    );
  });

  it("저장소를 못 읽어도 오류 없이 첫 방문으로 동작한다", () => {
    const spy = vi
      .spyOn(Storage.prototype, "getItem")
      .mockImplementation(() => {
        throw new Error("blocked");
      });
    setReadyState("complete");
    expect(() => run()).not.toThrow();
    vi.advanceTimersByTime(150);
    expect(link()?.getAttribute("blocking")).toBeNull();
    spy.mockRestore();
  });

  it("두 번 실행해도 링크는 하나", () => {
    localStorage.setItem(WEB_FONTS_STORAGE_KEY, WEB_FONTS_VERSION);
    run();
    run();
    expect(document.querySelectorAll(`#${WEB_FONTS_LINK_ID}`)).toHaveLength(1);
  });
});
