// 서버 시작 시 환경변수를 한 번 검증한다. 잘못된 값이면 서버가 뜨지 않는다.
export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    const { validateAllEnv } = await import("@/lib/env/server");
    validateAllEnv();
  }
}
