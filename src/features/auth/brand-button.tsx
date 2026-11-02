// 소셜 로그인 브랜드 버튼 한 개 (T3.4 랜딩, T4.2 시안, T4.6에서 실제 로그인 화면용으로 옮김, T10.4a 공식 가이드 재확인 2026-11-02).
// DESIGN.md 5장 "소셜 로그인 버튼": 색과 심볼은 각 사 가이드 그대로(토큰 brand-*, 심볼은 brand-symbols.tsx 공식 에셋), 높이 48, 라운드 12px(카카오 가이드 값),
// 심볼 왼쪽, 레이블 버튼 가운데. 심볼 칸은 왼쪽 17px의 24px 칸(가운데 x=29)이라 네이버 N(18px)의 왼쪽 여백이 가이드 값 20px이 된다.
// 레이블 서체는 카카오 가이드("OS별 기본 시스템 서체")를 따라 system-ui(font-[family-name:system-ui], T3.5).
// 레이블은 각 사 가이드 문구: 카카오 완성형 "카카오 로그인", 네이버 공식 에셋 "네이버 로그인", 구글 권장 문구 "Sign in with Google"의 한국어 "Google 계정으로 로그인".
// 출처: docs/research-notes.md "T10.4a 로그인 버튼 공식 에셋"
//   https://developers.kakao.com/docs/latest/ko/kakaologin/design-guide
//   https://developers.naver.com/docs/login/bi/bi.md
//   https://developers.google.com/identity/branding-guidelines (모두 2026-11-02 확인)
// 브랜드 버튼은 포인트 컬러(primary) 개수에 세지 않는다.
// 훅이 없어 서버, 클라이언트 어디서든 렌더할 수 있다. onPress를 넘기는 쪽은 클라이언트 컴포넌트여야 한다.
import type { ReactNode } from "react";
import { focusRing, pressMotion } from "@/components/ui/interaction";
import { authCopy } from "@/copy/auth";
import { cn } from "@/lib/utils";
import { GoogleSymbol, KakaoSymbol, NaverSymbol } from "./brand-symbols";
import type { LoginProvider } from "./providers";

export type BrandProvider = LoginProvider;

export const BRAND_PROVIDERS: readonly {
  id: BrandProvider;
  label: string;
  symbol: ReactNode;
  className: string;
}[] = [
  {
    id: "kakao",
    label: authCopy.providers.kakao,
    symbol: <KakaoSymbol />,
    className: "bg-brand-kakao text-brand-kakao-foreground",
  },
  {
    id: "naver",
    label: authCopy.providers.naver,
    symbol: <NaverSymbol />,
    className: "bg-brand-naver text-brand-naver-foreground",
  },
  {
    id: "google",
    label: authCopy.providers.google,
    symbol: <GoogleSymbol />,
    className:
      "border border-brand-google-border bg-brand-google text-brand-google-foreground",
  },
];

/**
 * 브랜드 버튼 한 개. 높이 48, 라운드 12, 심볼 왼쪽, 레이블 가운데.
 * blocked면 aria-disabled + 흐림(초점은 받음), busy면 aria-busy + 스크린 리더용 "연결하는 중".
 * type="submit"이면 폼 값으로 name="provider", value=제공자를 보낸다(/auth/sign-in). blocked면 제출을 막는다.
 */
export function BrandLoginButton({
  provider,
  blocked = false,
  busy = false,
  onPress,
  describedBy,
  type = "button",
  className,
}: {
  provider: BrandProvider;
  blocked?: boolean;
  busy?: boolean;
  onPress?: () => void;
  describedBy?: string;
  type?: "button" | "submit";
  className?: string;
}) {
  const p = BRAND_PROVIDERS.find((x) => x.id === provider)!;
  return (
    <button
      type={type}
      name={type === "submit" ? "provider" : undefined}
      value={type === "submit" ? p.id : undefined}
      data-provider={p.id}
      aria-disabled={blocked || undefined}
      aria-busy={busy || undefined}
      aria-describedby={describedBy}
      onClick={
        onPress || type === "submit"
          ? (e) => {
              if (blocked) {
                e.preventDefault();
                return;
              }
              onPress?.();
            }
          : undefined
      }
      className={cn(
        "relative flex h-12 w-full items-center justify-center rounded-md px-12 font-[family-name:system-ui] text-[0.9375rem] leading-none font-medium",
        focusRing,
        pressMotion,
        p.className,
        blocked && !busy && "cursor-not-allowed opacity-45",
        busy && "opacity-80",
        className,
      )}
    >
      <span className="absolute top-1/2 left-[1.0625rem] flex size-6 -translate-y-1/2 items-center justify-center">
        {p.symbol}
      </span>
      {/* 이름은 보이는 레이블 그대로(음성 입력으로 "카카오 로그인"을 말해 누를 수 있게, axe label-content-name-mismatch, T3.5) */}
      <span>{p.label}</span>
      {busy ? <span className="sr-only">{authCopy.pending}</span> : null}
    </button>
  );
}
