// 첫 로그인 닉네임 금칙어 대체 (T6.17 후속, MOD-04).
// 카카오, 구글 첫 닉네임은 가입 트리거(handle_new_user)가 제공자 프로필 이름으로 바로 채워서 TS 금칙어 필터를 거치지 않는다.
// 트리거는 SQL이라 금칙어 목록(src/lib/moderation, TS 정규화 규칙)을 쓸 수 없으므로, 세션 교환 직후 /auth/callback에서
// 저장된 닉네임을 검사하고 걸리면 중립 닉네임으로 바꾼다(complete-sign-in.ts). 사용자는 나 탭 계정에서 다시 정한다.
// 이 파일은 server-only를 import하지 않는다(단위 테스트). 금칙어 판정 함수는 라우트가 주입한다.
import { authCopy } from "@/copy/auth";

/** 0~1 난수. 기본은 crypto(예측 어려움), 테스트는 고정값을 넣는다 */
export type Random = () => number;

const cryptoRandom: Random = () => {
  const buf = new Uint32Array(1);
  crypto.getRandomValues(buf);
  return (buf[0] ?? 0) / 0x1_0000_0000;
};

/** "점심손님 4821"처럼 접두 + 숫자 4자리(1000~9999). 20자 이하, 앞뒤 공백 없음(profiles_nickname_len) */
export function neutralNickname(random: Random = cryptoRandom): string {
  const n = 1000 + Math.floor(random() * 9000);
  return `${authCopy.neutralNicknamePrefix} ${Math.min(n, 9999)}`;
}
