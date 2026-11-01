// 문의 이메일 (T8.6, MOD-07). 값은 환경변수 NEXT_PUBLIC_CONTACT_EMAIL 하나(.env.example, CLAUDE.md 12장).
// 서버 컴포넌트(문의 화면, 약관 문서)에서만 읽는다. clientEnv(홈 첫 번들)에 넣지 않아 홈 JS 예산에 영향이 없다.
// NEXT_PUBLIC_ 값은 빌드 때 인라인되므로 Vercel에서 값을 바꾸면 다시 배포해야 반영된다.
// 비었거나 이메일 모양이 아니면 null: 화면은 항목을 숨기지 않고 "문의 주소를 준비하고 있습니다"를 보인다.

/** 느슨한 모양 검사. 공백 없음, @ 하나, 도메인에 점. 실제 수신 여부는 검사하지 않는다 */
const EMAIL_SHAPE = /^[^\s@]+@[^\s@]+\.[^\s@.]+$/;

export function parseContactEmail(raw: string | undefined): string | null {
  const value = raw?.trim();
  if (!value || value.length > 254 || !EMAIL_SHAPE.test(value)) return null;
  return value;
}

export function contactEmail(): string | null {
  return parseContactEmail(process.env.NEXT_PUBLIC_CONTACT_EMAIL);
}

/** 메일 앱 열기 링크. 제목만 미리 채운다(본문은 비움: 기기와 화면 정보는 사용자가 직접 적는다) */
export function contactMailto(email: string, subject: string): string {
  return `mailto:${email}?subject=${encodeURIComponent(subject)}`;
}
