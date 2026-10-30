"use client";
// 소셜 로그인 브랜드 버튼 한 개 (T3.4에서 social-login.tsx 안에 있던 것을 T4.2 로그인 시안과 함께 쓰려고 나눔).
// DESIGN.md 5장 "소셜 로그인 버튼": 색과 심볼은 각 사 가이드 그대로(토큰 brand-*), 높이 48, 라운드 12px, 심볼 왼쪽, 레이블 가운데.
// 레이블 서체는 카카오 가이드("OS별 기본 시스템 서체")를 따라 system-ui(font-[family-name:system-ui], T3.5).
// 브랜드 버튼은 포인트 컬러(primary) 개수에 세지 않는다.
import type { ReactNode } from "react";
import { focusRing, pressMotion } from "@/components/ui/interaction";
import { landingLabCopy } from "@/copy/design-lab-landing";
import { cn } from "@/lib/utils";
import { GoogleSymbol, KakaoSymbol, NaverSymbol } from "./brand-symbols";

const copy = landingLabCopy.common;

export type BrandProvider = "kakao" | "naver" | "google";
type Provider = BrandProvider;

export const BRAND_PROVIDERS: readonly {
  id: Provider;
  label: string;
  symbol: ReactNode;
  className: string;
}[] = [
  {
    id: "kakao",
    label: copy.kakao,
    symbol: <KakaoSymbol />,
    className: "bg-brand-kakao text-brand-kakao-foreground",
  },
  {
    id: "naver",
    label: copy.naver,
    symbol: <NaverSymbol />,
    className: "bg-brand-naver text-brand-naver-foreground",
  },
  {
    id: "google",
    label: copy.google,
    symbol: <GoogleSymbol />,
    className:
      "border border-brand-google-border bg-brand-google text-brand-google-foreground",
  },
];

/**
 * 브랜드 버튼 한 개 (랜딩 B와 로그인 시안 T4.2가 함께 쓴다). 높이 48, 라운드 12, 심볼 왼쪽, 레이블 가운데.
 * blocked면 aria-disabled + 흐림, busy면 aria-busy + 스크린 리더용 "연결하는 중".
 */
export function BrandLoginButton({
  provider,
  blocked = false,
  busy = false,
  onPress,
  describedBy,
  className,
}: {
  provider: Provider;
  blocked?: boolean;
  busy?: boolean;
  onPress?: () => void;
  describedBy?: string;
  className?: string;
}) {
  const p = BRAND_PROVIDERS.find((x) => x.id === provider)!;
  return (
    <button
      type="button"
      data-provider={p.id}
      aria-disabled={blocked || undefined}
      aria-busy={busy || undefined}
      aria-describedby={describedBy}
      onClick={() => {
        if (!blocked) onPress?.();
      }}
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
      <span className="absolute top-1/2 left-4 flex size-6 -translate-y-1/2 items-center justify-center">
        {p.symbol}
      </span>
      {/* 이름은 보이는 레이블 그대로(음성 입력으로 "카카오 로그인"을 말해 누를 수 있게, axe label-content-name-mismatch, T3.5) */}
      <span>{p.label}</span>
      {busy ? <span className="sr-only">{copy.pending}</span> : null}
    </button>
  );
}
