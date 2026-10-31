// 식당 상세 시안 쿼리 (T5.2): /design-lab/place/c?... (D-10 C안)
//   state=ready|loading|empty|error|offline  4상태 (pnpm shots --states 규약)
//   fail=fetch|name   state=error일 때 오류 종류. fetch: 카카오 실패(재시도 + 네이버 지도), name: 이름 해석 실패(T5.12a)
//   from=map|home     모바일 컨테이너. map: 지도 바텀시트를 끝까지 연 상태, home: 홈 카드 "상세"에서 연 화면
//   data=full|sparse  sparse: 표본이 적은 식당(추정 가격, 후기 1건)
//   snap=half|full    C안 시트 높이(from=map일 때만)
//   poll=on           "투표에 추가" 보이기(기본은 pollEntry 플래그처럼 숨김, 7단계 전)
import { parseDesignState, type DesignState } from "@/features/design-lab/mock";

export type PlaceFrom = "map" | "home";

export type PlaceParams = {
  state: DesignState;
  fail: "fetch" | "name";
  from: PlaceFrom | null;
  data: "full" | "sparse";
  snap: "half" | "full";
  poll: boolean;
};

type Raw = Readonly<Record<string, string | readonly string[] | undefined>>;

function first(raw: Raw, key: string): string | undefined {
  const v = raw[key];
  const s = typeof v === "string" ? v : v?.[0];
  return s?.trim().toLowerCase();
}

export function parsePlaceParams(raw: Raw): PlaceParams {
  const from = first(raw, "from");
  return {
    state: parseDesignState(raw),
    fail: first(raw, "fail") === "name" ? "name" : "fetch",
    from: from === "map" || from === "home" ? from : null,
    data: first(raw, "data") === "sparse" ? "sparse" : "full",
    snap: first(raw, "snap") === "full" ? "full" : "half",
    poll: first(raw, "poll") === "on",
  };
}
