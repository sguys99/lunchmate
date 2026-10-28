// 페이지뷰로 보낼 경로를 만든다 (T2.20 후속).
// 쿼리스트링은 버리고 경로만 보낸다(좌표, 검색어가 섞일 자리를 없앤다).
// 초대 코드처럼 비밀에 가까운 동적 세그먼트는 패턴 이름으로 바꾼다. 초대 코드는 보유자만 투표방을 조회하는 열쇠라
// 분석 도구에 남으면 안 된다(CLAUDE.md 7장).

const SECRET_SEGMENTS: ReadonlyArray<readonly [prefix: string, label: string]> = [
  ["poll", "[code]"],
];

export function pageviewPath(pathname: string): string {
  const path = pathname.split(/[?#]/)[0] || "/";
  const parts = path.split("/");
  for (let i = 1; i < parts.length - 1; i++) {
    const rule = SECRET_SEGMENTS.find(([prefix]) => prefix === parts[i]);
    if (rule && parts[i + 1]) {
      parts[i + 1] = rule[1];
      i++;
    }
  }
  return parts.join("/");
}
