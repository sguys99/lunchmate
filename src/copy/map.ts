// 지도 화면 문구 (T0.34 스모크, T5.26~T5.32 지도 탭, PRD MAP-01~06). 컴포넌트 안에 문장을 직접 쓰지 않는다 (CLAUDE.md 4장).
// 문체 (tasks.md 2.2절): 상태, 결과, 설명, 오류는 습니다체, 제안과 질문은 해요체. 버튼, 칩, 라벨은 명사형.
// 상태 title은 지금 상태를 말하는 짧은 습니다체 문장(마침표 없음), body는 다음에 할 일만 말한다(common.ts 규칙).
import { commonCopy } from "./common";

export const mapCopy = {
  mapLabel: "식당 지도",
  loadingLabel: "지도를 불러오는 중입니다",
  retry: commonCopy.actions.retry,
  error: {
    keyMissing: {
      title: "지도 키가 설정되지 않았습니다",
      body: "NEXT_PUBLIC_NAVER_MAP_CLIENT_ID를 .env.local과 배포 환경에 등록한 뒤 개발 서버를 다시 시작해 주세요.",
    },
    auth: {
      title: "지도 인증에 실패했습니다",
      body: "네이버 클라우드 콘솔의 Web 서비스 URL에 현재 주소가 등록되어 있는지 확인해 주세요.",
    },
    load: {
      title: "지도를 불러오지 못했습니다",
      body: "네트워크 연결을 확인한 뒤 다시 시도해 주세요.",
    },
  },
  smoke: {
    title: "지도 스모크",
    description:
      "MapProvider 네이버 구현체로 빈 지도를 띄워 보는 내부용 화면입니다. 기본 중심은 서울시청 근처이며 현위치는 쓰지 않습니다.",
  },

  /* ---------- 지도 탭 (T5.26~T5.32) ---------- */

  metaTitle: "지도",
  /** 화면 제목(보조 기술용 h1) */
  screenTitle: "주변 식당 지도",
  mapRole: "지도",
  mapKeysHint:
    "방향키로 지도를 움직입니다. 식당은 목록에서도 고를 수 있습니다.",

  /** 기준 위치 칩 (MAP-01). 바꾸기는 오늘 탭 칩에서 */
  base: {
    here: "현위치",
    area: "이 지역",
    /** 칩 앞에 보조 기술로만 읽는 말 */
    prefix: "기준 위치",
  },
  /** 목록 머리의 개수. 카카오 상한(15건 x 3페이지)에 닿으면 "45곳 이상" */
  count: (minutes: number, n: number, capped: boolean) =>
    capped ? `도보 ${minutes}분 안 ${n}곳 이상` : `도보 ${minutes}분 안 ${n}곳`,
  countFiltered: (n: number) => `조건에 맞는 ${n}곳`,
  /** 기피 음식, 다시 안 갈 곳이라 지도에서 뺀 수(2026-10-31 결정). 누르면 나 탭 설정 */
  hidden: {
    short: (n: number) => `${n}곳 숨김`,
    linkLabel: (n: number) =>
      `기피 음식과 다시 안 갈 곳 ${n}곳을 숨겼습니다. 나 탭 설정에서 바꿀 수 있습니다.`,
    guestLabel: (n: number) => `기피 음식 ${n}곳을 숨겼습니다.`,
  },
  sortHint: "가까운 순",

  /** 필터 (MAP-03) */
  filters: {
    label: "식당 거르기",
    category: "카테고리",
    categoryAll: "전체",
    categoryGroup: "카테고리 고르기",
    cheap: "1만 원 이하",
    near: "도보 5분 안",
    top: "👍 상위",
    favorites: "즐겨찾기",
    topHint: "후기 3건 이상인 곳 중 👍 80% 이상입니다.",
  },

  /** 지도 조작 (MAP-05) */
  research: "이 지역에서 다시 찾기",
  researched: (n: number) => `이 지역 식당 ${n}곳을 찾았습니다.`,
  backToBase: "기준 위치로 돌아가기",
  backedToBase: "기준 위치 주변 식당으로 돌아왔습니다.",
  myLocation: "현위치로 지도 옮기기",
  myLocationDone: "지도를 현위치로 옮겼습니다. 기준 위치는 그대로입니다.",
  myLocationFailed: "현위치를 찾지 못했습니다. 위치 권한을 확인해 주세요.",
  markerLabel: (name: string, category: string, walk: number) =>
    `${name}, ${category}, 도보 약 ${walk}분`,
  clusterLabel: (n: number) => `식당 ${n}곳이 모인 곳, 눌러서 펼치기`,
  clusterUnit: "곳",
  clusterOpened: (n: number) => `식당 ${n}곳을 펼쳤습니다.`,
  officeMarker: "기준 위치",
  selected: (name: string) => `${name}, 선택됨`,

  numbers: {
    walk: "도보",
    walkUnit: "분",
    estimate: "추정",
    thumbs: "👍",
    thumbsUnit: "%",
  },

  /** 시트 (MAP-04) */
  sheet: {
    label: "주변 식당",
    snapAnnounce: {
      half: "시트를 반쯤 열었습니다.",
      full: "시트를 끝까지 열었습니다.",
    },
    raise: "시트 올리기",
    lower: "시트 내리기",
    back: "목록으로",
  },

  states: {
    loading: "지도와 주변 식당을 불러오는 중입니다",
    locating: "현위치를 찾는 중입니다",
    empty: {
      title: (minutes: number) => `도보 ${minutes}분 안에 식당이 없습니다`,
      body: (minutes: number) => `${minutes}분까지 넓혀 볼까요?`,
      bodyMax: "지도를 옮긴 뒤 이 지역에서 다시 찾아 주세요.",
      action: (minutes: number) => `${minutes}분까지 넓히기`,
      filteredTitle: "고른 조건에 맞는 식당이 없습니다",
      filteredBody: "필터를 하나 풀어 볼까요?",
      filteredAction: "필터 모두 풀기",
    },
    mapError: {
      title: "지도를 불러오지 못해 목록으로 보여 드립니다",
      body: "식당 정보는 그대로 볼 수 있습니다. 잠시 뒤 지도를 다시 불러와 주세요.",
      retry: "지도 다시 불러오기",
      pane: "지도를 불러오지 못했습니다",
    },
    kakaoError: {
      title: "식당 정보를 불러오지 못했습니다",
      // 재시도 1회가 끝난 뒤 보이는 화면이라 자동 재시도를 약속하지 않는다 (PRD 12장)
      body: "잠시 후 다시 시도해 주세요.",
      action: commonCopy.actions.retry,
      naverLink: "네이버 지도에서 주변 식당 보기",
      naverQuery: "음식점",
    },
    offline: {
      title: "인터넷에 연결되어 있지 않습니다",
      body: "연결되면 주변 식당을 다시 찾습니다.",
      stale: "오프라인이라 먼저 받은 목록을 보여 드립니다.",
    },
    needLocation: {
      title: "기준 위치를 알 수 없습니다",
      denied:
        "위치 권한을 허용하면 현위치 주변을 보여 드립니다. 회사 위치를 저장해 둘까요?",
      unavailable: "현위치를 찾지 못했습니다. 회사 위치를 저장해 둘까요?",
      retry: "현위치 다시 찾기",
      addOffice: "회사 위치 추가",
      saveOffice: "회사 위치 저장",
    },
    loadFailed: {
      title: "설정을 불러오지 못했습니다",
      body: "잠시 후 다시 시도해 주세요.",
    },
  },
} as const;
