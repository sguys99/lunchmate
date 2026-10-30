"use client";
// 소셜 로그인 버튼 3종 (T3.4, DESIGN.md 5장 "소셜 로그인 버튼").
// - 색과 심볼은 각 사 가이드 그대로(토큰 brand-*), 높이 48, 라운드 12px(카카오 가이드), 심볼 왼쪽, 레이블 가운데.
//   레이블 서체는 카카오 가이드("OS별 기본 시스템 서체")를 따라 system-ui.
//   font-[system-ui]는 cn(tailwind-merge)이 굵기 클래스로 읽어 font-medium과 겹친다며 지운다. 그래서 family-name 힌트를 붙인다(T3.5).
// - 브랜드 버튼은 포인트 컬러(primary) 개수에 세지 않는다. 화면의 primary는 "추천 체험" 하나뿐이다.
// - 시안 동작: 누르면 "연결하는 중" 상태가 0.7초 이어진 뒤 토스트. ?state=error면 오류 토스트(다음 행동 안내).
// - 오프라인이면 모두 aria-disabled. 카카오톡 인앱이면(AUTH-04) 구글만 막고 외부 브라우저 안내를 붙인다.
import { useState } from "react";
import { focusRing } from "@/components/ui/interaction";
import { toast } from "@/components/ui/lazy-toaster";
import { landingLabCopy } from "@/copy/design-lab-landing";
import { cn } from "@/lib/utils";
import {
  BRAND_PROVIDERS,
  BrandLoginButton,
  type BrandProvider,
} from "@/features/auth/brand-button";
import type { LandingEnv } from "./use-landing-env";

const copy = landingLabCopy.common;

type Provider = BrandProvider;

export function SocialLogin({
  env,
  className,
}: {
  env: LandingEnv;
  className?: string;
}) {
  const [pending, setPending] = useState<Provider | null>(null);

  function start(id: Provider) {
    if (pending) return;
    setPending(id);
    window.setTimeout(() => {
      setPending(null);
      if (env.state === "error") {
        void toast.error(copy.loginError, { description: copy.loginErrorBody });
      } else {
        void toast(copy.labToast);
      }
    }, 700);
  }

  return (
    <div className={cn("flex flex-col gap-2.5", className)}>
      <ul aria-label={copy.loginGroupLabel} className="flex flex-col gap-2.5">
        {BRAND_PROVIDERS.map((p) => {
          const blocked =
            env.offline || (env.inApp && p.id === "google") || pending !== null;
          const busy = pending === p.id;
          return (
            <li key={p.id}>
              <BrandLoginButton
                provider={p.id}
                blocked={blocked}
                busy={busy}
                onPress={() => start(p.id)}
                describedBy={
                  env.inApp && p.id === "google"
                    ? "landing-inapp-note"
                    : undefined
                }
              />
            </li>
          );
        })}
      </ul>
      {env.inApp ? (
        <div
          id="landing-inapp-note"
          className="flex flex-col items-start gap-1 pt-1"
        >
          <p className="type-caption break-keep text-muted-foreground">
            {copy.inappGoogle}
          </p>
          <button
            type="button"
            className={cn(
              "-ml-0.5 h-11 type-caption text-foreground underline decoration-muted-foreground underline-offset-3",
              focusRing,
            )}
          >
            {copy.inappOpen}
          </button>
        </div>
      ) : null}
    </div>
  );
}
