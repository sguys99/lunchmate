// 로그인 유도 시트를 부르는 행동 (T4.13, AUTH-07: 저장, 후기, 투표). 문구는 authCopy.prompt.reasons[trigger].
export const LOGIN_TRIGGERS = ["poll", "save", "review"] as const;
export type LoginTrigger = (typeof LOGIN_TRIGGERS)[number];

/** 지금 화면 경로를 로그인 복귀 경로로(해시는 서버로 가지 않으므로 뺀다). 검사는 /auth/sign-in이 다시 한다 */
export function currentPathForNext(loc: { pathname: string; search: string }) {
  return `${loc.pathname}${loc.search}`;
}
