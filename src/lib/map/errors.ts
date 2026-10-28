// 지도 공급자 공통 오류. 화면은 종류만 보고 안내 문구를 고른다.

export class MapKeyMissingError extends Error {
  constructor(message = "지도 키가 설정되어 있지 않습니다.") {
    super(message);
    this.name = "MapKeyMissingError";
  }
}

export class MapAuthError extends Error {
  constructor(message = "지도 인증에 실패했습니다.") {
    super(message);
    this.name = "MapAuthError";
  }
}

export class MapLoadError extends Error {
  constructor(message = "지도 스크립트를 불러오지 못했습니다.") {
    super(message);
    this.name = "MapLoadError";
  }
}

export type MapErrorKind = "keyMissing" | "auth" | "load";

export function classifyMapError(error: unknown): MapErrorKind {
  if (error instanceof MapKeyMissingError) return "keyMissing";
  if (error instanceof MapAuthError) return "auth";
  return "load";
}
