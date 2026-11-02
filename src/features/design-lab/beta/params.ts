// 베타 환영 페이지 시안 쿼리 (T9.3): /design-lab/beta/<a|b|c>?...
//   state=ready|loading|empty|error|offline   4상태 (pnpm shots --states 규약)
//     loading  기기 확인 전 단계 자리 스켈레톤
//     empty    기기를 알아보지 못함: 기기 고르기 칩 3개(아이폰, 안드로이드, 컴퓨터)
//     error    외부 브라우저 열기 실패(카카오톡): 메뉴 그림 + 링크 복사
//     offline  설치 방법은 보이고 로그인 버튼은 aria-disabled
//   device=kakao-ios|kakao-android|ios|android|desktop|app   목업 기기. 기본 kakao-ios(초대 링크를 처음 여는 곳)
//     app: 홈 화면 앱(standalone)으로 연 경우(설치 단계 끝)
//   card=1|2|3      B안 처음 보이는 카드
//   open=install|feedback|none   C안 처음 펼친 묶음(기본 install)
//   others=on       A안 "다른 기기 보기"를 펼친 채로
import { parseDesignState, type DesignState } from "@/features/design-lab/mock";

export const BETA_DEVICES = [
  "kakao-ios",
  "kakao-android",
  "ios",
  "android",
  "desktop",
  "app",
] as const;
export type BetaDevice = (typeof BETA_DEVICES)[number];

/** 설치 방법을 보여 줄 기기 (카카오톡 인앱은 OS 쪽 방법을 함께 보인다) */
export type InstallTarget = "ios" | "android" | "desktop" | "app";

export type BetaParams = {
  state: DesignState;
  device: BetaDevice;
  card: 1 | 2 | 3;
  open: "install" | "feedback" | "none";
  others: boolean;
};

type Raw = Readonly<Record<string, string | readonly string[] | undefined>>;

function first(raw: Raw, key: string): string | undefined {
  const v = raw[key];
  const s = typeof v === "string" ? v : v?.[0];
  return s?.trim().toLowerCase();
}

export function parseBetaParams(raw: Raw): BetaParams {
  const device = first(raw, "device");
  const card = Number(first(raw, "card"));
  const open = first(raw, "open");
  return {
    state: parseDesignState(raw),
    device:
      device && (BETA_DEVICES as readonly string[]).includes(device)
        ? (device as BetaDevice)
        : "kakao-ios",
    card: card === 2 || card === 3 ? card : 1,
    open: open === "feedback" || open === "none" ? open : "install",
    others: first(raw, "others") === "on",
  };
}

export function isKakao(d: BetaDevice): d is "kakao-ios" | "kakao-android" {
  return d === "kakao-ios" || d === "kakao-android";
}

export function installTarget(d: BetaDevice): InstallTarget {
  if (d === "kakao-ios") return "ios";
  if (d === "kakao-android") return "android";
  return d;
}

/** 로그인 주소. 내부 경로만(오픈 리다이렉트 방지, CLAUDE.md 13장). /login이 next를 다시 검사한다 */
export const BETA_LOGIN_HREF = "/login?next=%2Ftoday";
