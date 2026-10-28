// 환경변수 진입점. 클라이언트에서도 안전한 값만 재수출한다.
// 서버 전용 값(비밀키)은 일부러 여기서 내보내지 않는다. 필요하면 서버 코드에서
// `import { serverEnv } from "@/lib/env/server"` 로 직접 가져온다(클라이언트에서 가져오면 빌드 실패).
export { clientEnv, type ClientEnv } from "./env/client";
export { siteUrl, absoluteUrl } from "./env/site";
