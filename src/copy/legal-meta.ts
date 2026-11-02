// 약관 3종 검색과 링크 미리보기 설명 (T10.11, PRD APP-04). 랜딩 제목과 설명은 landing.ts meta(copy-guide 4.13, 4.14)에 있다.
// 약관 파일 규칙대로 습니다체 100%(lint:copy가 legal 접두 파일로 본다), 금지 문자 없음. 시행일은 legal.ts의 값을 그대로 쓴다.

export const legalMetaCopy = {
  /** 약관 3종의 <meta name="description">. 제목은 legalCopy.<문서>.metaTitle */
  legal: {
    service: (effective: string) =>
      `런치메이트 이용약관입니다. ${effective}부터 시행합니다.`,
    privacy: (effective: string) =>
      `런치메이트가 어떤 개인정보를 왜 처리하고 언제 지우는지 안내합니다. ${effective}부터 시행합니다.`,
    location: (effective: string) =>
      `런치메이트가 위치 정보를 어디에 어떻게 쓰는지 안내합니다. ${effective}부터 시행합니다.`,
  },
} as const;
