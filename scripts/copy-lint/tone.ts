/**
 * 해요체/습니다체 비율 리포트 자리 (T2.3에서 구현).
 * 규칙: docs/tasks.md 2.2절. 도메인 문구 파일(src/copy/<도메인>.ts) 단위로
 * 해요체 25~40%를 허용 범위로 본다. 명사형(버튼, 탭, 칩, 라벨)과 약관은 비율에서 제외.
 */

export type Tone = "haeyo" | "hamnida" | "noun" | "unknown";

export type ToneReport = {
  file: string;
  haeyo: number;
  hamnida: number;
  /** 비율에서 제외된 명사형 문구 수 */
  excluded: number;
  /** haeyo / (haeyo + hamnida), 대상 문장이 없으면 null */
  haeyoRatio: number | null;
  /** 25~40% 범위 안이면 true */
  withinRange: boolean | null;
};

export const HAEYO_RATIO_RANGE = { min: 0.25, max: 0.4 } as const;

/** 문장 하나의 문체를 판정한다. */
export function classifyTone(sentence: string): Tone {
  // TODO(T2.3): 종결 어미 판정 (…요/…세요/…까요 → haeyo, …니다/…니까 → hamnida, 서술어 없음 → noun)
  void sentence;
  return "unknown";
}

/** 한 파일의 문구 목록으로 비율 리포트를 만든다. */
export function buildToneReport(
  file: string,
  texts: readonly string[],
): ToneReport {
  // TODO(T2.3): texts를 문장 단위로 나눠 classifyTone 집계
  void texts;
  return {
    file,
    haeyo: 0,
    hamnida: 0,
    excluded: 0,
    haeyoRatio: null,
    withinRange: null,
  };
}
