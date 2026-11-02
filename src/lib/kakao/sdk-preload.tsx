// 카카오 SDK 스크립트 미리 받기 힌트 (AC-REC-4, T10.9). 서버 컴포넌트에서 렌더한다.
// - 홈은 하이드레이션 뒤 검색 모듈을 받고 나서야 SDK 스크립트를 넣는다(prefetchKakaoSearch). 3G 첫 방문에서는 그 사이
//   SDK 요청이 첫 로드 JS가 끝난 뒤로 밀려 카드가 늦었다. HTML 머리에 <link rel=preload as=script>를 두어 첫 로드 JS와
//   나란히 받게 한다. 로더(sdk-loader.ts)가 같은 주소로 <script>를 넣으면 브라우저가 미리 받은 응답을 그대로 쓴다.
// - 받는 스크립트, 시점이 앞당겨질 뿐 요청 대상과 횟수는 같다(홈은 진입하면 어차피 SDK를 받는다). 카카오 응답은 저장하지 않는다.
// 출처 (2026-11-02 확인): React DOM preload(href, { as: "script" }) 문서(react.dev/reference/react-dom/preload),
//   HTML preload 매칭 규칙(같은 URL, 같은 crossorigin 모드: 로더의 <script>는 crossorigin 없음, 힌트도 없음)
import { preload } from "react-dom";
import { clientEnv } from "@/lib/env/client";
import { buildKakaoSdkUrl } from "./sdk-loader";

export function KakaoSdkPreload() {
  const appKey = clientEnv().NEXT_PUBLIC_KAKAO_JS_KEY?.trim();
  if (appKey) preload(buildKakaoSdkUrl(appKey), { as: "script" });
  return null;
}
