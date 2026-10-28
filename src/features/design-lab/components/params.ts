// 컴포넌트 갤러리 보기 설정 <-> URL 쿼리 (T2.10).
// 시각 회귀(T2.16)와 axe 검사(T2.17)가 상태를 고정할 수 있게 쿼리로 둔다. 기본값인 키는 쿼리에서 뺀다.
//   ?theme=system|light|dark   테마 강제(<html> .light/.dark). 기본 system
//   ?motion=system|reduce      MotionProvider preference + CSS 전환과 애니메이션 끄기. 기본 system
//   ?static=1                  결정적 렌더: 모든 애니메이션과 전환 정지, 캐럿 숨김. motion=reduce를 함께 뜻한다
import type { DesignStateSearchParams } from "@/features/design-lab/mock";

export const GALLERY_THEMES = ["system", "light", "dark"] as const;
export const GALLERY_MOTIONS = ["system", "reduce"] as const;

export type GalleryTheme = (typeof GALLERY_THEMES)[number];
export type GalleryMotion = (typeof GALLERY_MOTIONS)[number];

export type GalleryOptions = {
  theme: GalleryTheme;
  motion: GalleryMotion;
  still: boolean;
};

export const DEFAULT_GALLERY_OPTIONS: GalleryOptions = {
  theme: "system",
  motion: "system",
  still: false,
};

function readParam(params: DesignStateSearchParams, key: string) {
  if (!params) return undefined;
  const raw = params instanceof URLSearchParams ? params.get(key) : params[key];
  const first = typeof raw === "string" ? raw : raw?.[0];
  return first?.trim().toLowerCase();
}

function pick<T extends string>(
  options: readonly T[],
  value: string | undefined,
  fallback: T,
): T {
  return value !== undefined && (options as readonly string[]).includes(value)
    ? (value as T)
    : fallback;
}

/** 쿼리 해석. 모르는 값은 기본값으로. static은 1, true만 켠다 */
export function parseGalleryOptions(
  params: DesignStateSearchParams,
): GalleryOptions {
  const d = DEFAULT_GALLERY_OPTIONS;
  const still = readParam(params, "static");
  return {
    theme: pick(GALLERY_THEMES, readParam(params, "theme"), d.theme),
    motion: pick(GALLERY_MOTIONS, readParam(params, "motion"), d.motion),
    still: still === "1" || still === "true",
  };
}

/** 설정 → 쿼리 문자열(앞의 ? 없음). 기본값인 키는 뺀다 */
export function serializeGalleryOptions(options: GalleryOptions): string {
  const params = new URLSearchParams();
  if (options.theme !== "system") params.set("theme", options.theme);
  if (options.motion !== "system") params.set("motion", options.motion);
  if (options.still) params.set("static", "1");
  return params.toString();
}

/**
 * 실제로 적용할 모션 단계. static이면 motion 값과 무관하게 정지.
 * - system: OS 설정을 따름(CSS motion-reduce:, MotionConfig "user")
 * - reduce: 앱 설정 "줄이기"와 같음
 * - static: reduce + 무한 반복 애니메이션까지 정지(스켈레톤 호흡 등)
 */
export function effectiveMotion(
  options: GalleryOptions,
): "system" | "reduce" | "static" {
  if (options.still) return "static";
  return options.motion;
}
