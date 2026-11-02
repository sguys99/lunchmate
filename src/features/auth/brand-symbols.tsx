// 소셜 로그인 심볼 (T3.4, T4.6, T10.4a에서 각 사 공식 에셋으로 교체 2026-11-02). 출처 정리는 docs/research-notes.md "T10.4a 로그인 버튼 공식 에셋".
// 색은 DESIGN.md color.*.brand 토큰(Tailwind fill-brand-*)만 쓴다. 형태, 비율은 공식 에셋 그대로 두고 크기만 버튼 높이 48에 맞춘다.
// - 카카오: 말풍선 심볼 #000000. 경로는 카카오디벨로퍼스 [도구] > [리소스 다운로드] > [카카오 로그인] 완성형 SVG
//   (https://developers.kakao.com/tool/resource/login, login-complete-ko.svg)의 심볼 path를 좌표 그대로 옮겼다(viewBox만 심볼 영역으로).
//   디자인 가이드(https://developers.kakao.com/docs/latest/ko/kakaologin/design-guide): 심볼 형태, 비율, 색 변경 금지, 심볼 #000000.
//   크기는 완성형 에셋 비율(컨테이너 46 대 심볼 12.96)을 48에 맞춘 13.5px.
// - 네이버: N 로고 흰색. 가이드의 한글 버튼 애셋(Adobe Illustrator, NAVER_login_KR.ai)의 N 벡터 path를 20 단위 상자 그대로 옮겼다.
//   같은 에셋의 PNG(NAVER_login_KR.zip, https://developers.naver.com/inc/devcenter/downloads/bi/NAVER_login_KR.zip, H48 4배)와 대조해 일치. 가이드(https://developers.naver.com/docs/login/bi/bi.md): 완성형 로고 16px 이상,
//   왼쪽 정렬이면 로고 왼쪽 여백 20px, 로고 형태 변경 금지. 여기서는 공식 H48 에셋과 같은 18px.
// - 구글: 공식 "G"(2026 그라데이션 G). signin-assets.zip(https://developers.google.com/static/identity/images/signin-assets.zip)의
//   "Theme=Light, Show text=No, Shape=Square, Platform=Android+Web.svg"에서 배경과 테두리만 빼고 G 영역(20x20)을 96px PNG로 래스터화
//   (public/brand/google-g.png, 공식 @4x PNG와 평균 차이 1.3/255). G는 색 토큰으로 옮길 수 없는 그라데이션이라 이미지로 둔다.
//   가이드(https://developers.google.com/identity/branding-guidelines): G 색, 형태 변경 금지, 단색 G 금지, 라이트, 다크, 뉴트럴 면 위에만.
//   공식 Dark 에셋은 G를 #131314 면 위에 바로 둔다(흰 원 없음). 버튼 40 기준 G 20을 48 버튼에 맞춰 1.2배(24px).
import { cn } from "@/lib/utils";

export function KakaoSymbol({ className }: { className?: string }) {
  return (
    <svg
      aria-hidden
      viewBox="61.5225 16.5225 12.9555 12.9555"
      className={cn("size-[0.845rem] fill-brand-kakao-symbol", className)}
    >
      <path d="M68.001 16.5225C64.4222 16.5225 61.5225 19.0037 61.5225 22.0641C61.5225 24.0312 62.7219 25.7596 64.5292 26.7423L63.9181 29.2113C63.8954 29.285 63.9132 29.364 63.9619 29.4184C63.9975 29.457 64.0461 29.478 64.0931 29.478C64.1337 29.478 64.1742 29.464 64.2082 29.4341L66.834 27.5144C67.2117 27.5723 67.6007 27.6039 67.9994 27.6039C71.5767 27.6039 74.478 25.1226 74.478 22.0623C74.478 19.002 71.5783 16.5225 68.001 16.5225Z" />
    </svg>
  );
}

export function NaverSymbol({ className }: { className?: string }) {
  return (
    <svg
      aria-hidden
      viewBox="0 0 20 20"
      className={cn("size-[1.125rem] fill-brand-naver-foreground", className)}
    >
      <path d="M0 0H6.146L13.561 10.706V0H20V20H13.855L6.44 9.298V20H0Z" />
    </svg>
  );
}

/** 공식 G 이미지. 배경 이미지로 둬서 JS와 이미지 컴포넌트 없이 렌더한다(장식, 버튼 이름은 레이블이 맡음) */
export function GoogleSymbol({ className }: { className?: string }) {
  return (
    <span
      aria-hidden
      className={cn(
        "inline-block size-6 shrink-0 bg-[url(/brand/google-g.png)] bg-contain bg-center bg-no-repeat",
        className,
      )}
    />
  );
}

/** 버튼 밖 작은 표시(ProviderMark)용: 앱 배경(샌드) 위에서는 G를 흰 원 위에 둔다(가이드: 라이트, 다크, 뉴트럴 면 위에만) */
export function GoogleMark({ className }: { className?: string }) {
  return (
    <span
      aria-hidden
      className={cn(
        "inline-flex size-5 shrink-0 items-center justify-center rounded-full bg-brand-google-logo-surface",
        className,
      )}
    >
      <GoogleSymbol className="size-3.5" />
    </span>
  );
}
