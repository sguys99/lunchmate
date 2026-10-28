// @vitest-environment jsdom
/**
 * 축소 모드 훅 (T2.12): OS prefers-reduced-motion과 앱 설정(preference) 둘 중 하나라도 줄이면 즉시 프리셋.
 */
import { renderHook } from "@testing-library/react";
import type { ReactNode } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import {
  MotionPreferenceProvider,
  MotionProvider,
  motionPresets,
  reducedMotionPresets,
  useMotionPreset,
  useMotionReduced,
  type MotionPreference,
} from "./index";

// Motion은 OS 설정 감지를 프로세스에서 한 번만 초기화해 테스트마다 matchMedia를 바꿀 수 없다.
// useReducedMotion만 바꿔 끼워 OS 값을 직접 정한다.
const system = vi.hoisted(() => ({ reduce: false as boolean | null }));
vi.mock("motion/react", async (importOriginal) => ({
  ...(await importOriginal<typeof import("motion/react")>()),
  useReducedMotion: () => system.reduce,
}));

function mockSystemReduce(reduce: boolean | null) {
  system.reduce = reduce;
}

function wrapper(preference?: MotionPreference) {
  return function Wrapper({ children }: { children: ReactNode }) {
    return <MotionProvider preference={preference}>{children}</MotionProvider>;
  };
}

afterEach(() => {
  system.reduce = false;
});

describe("useMotionPreset", () => {
  it("기본(OS 줄이기 꺼짐): 원래 프리셋", () => {
    mockSystemReduce(false);
    const { result } = renderHook(() => useMotionPreset("enter"), {
      wrapper: wrapper(),
    });
    expect(result.current).toBe(motionPresets.enter);
  });

  it("앱 설정 reduce: OS와 무관하게 즉시 프리셋", () => {
    mockSystemReduce(false);
    const { result } = renderHook(() => useMotionPreset("spring-card"), {
      wrapper: wrapper("reduce"),
    });
    expect(result.current).toBe(reducedMotionPresets["spring-card"]);
  });

  it("OS prefers-reduced-motion: reduce면 즉시 프리셋", () => {
    mockSystemReduce(true);
    const { result } = renderHook(() => useMotionReduced(), {
      wrapper: wrapper("system"),
    });
    expect(result.current).toBe(true);
  });

  it("OS 값을 아직 모를 때(null, 서버 렌더): 줄이지 않음", () => {
    mockSystemReduce(null);
    const { result } = renderHook(() => useMotionReduced(), {
      wrapper: wrapper(),
    });
    expect(result.current).toBe(false);
  });
});

describe("MotionPreferenceProvider (T2.22)", () => {
  it("(app) 레이아웃의 앱 설정을 안쪽 MotionProvider가 preference 없이도 잇는다", () => {
    const { result } = renderHook(() => useMotionReduced(), {
      wrapper: ({ children }: { children: ReactNode }) => (
        <MotionPreferenceProvider preference="reduce">
          <MotionProvider>{children}</MotionProvider>
        </MotionPreferenceProvider>
      ),
    });
    expect(result.current).toBe(true);
  });

  it("안쪽 MotionProvider가 preference를 주면 그 값이 우선한다", () => {
    const { result } = renderHook(() => useMotionReduced(), {
      wrapper: ({ children }: { children: ReactNode }) => (
        <MotionPreferenceProvider preference="reduce">
          <MotionProvider preference="system">{children}</MotionProvider>
        </MotionPreferenceProvider>
      ),
    });
    expect(result.current).toBe(false);
  });
});
