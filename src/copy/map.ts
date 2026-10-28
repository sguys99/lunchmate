// 지도 화면 문구. 컴포넌트 안에 문장을 직접 쓰지 않는다 (CLAUDE.md 4장).
export const mapCopy = {
  mapLabel: "식당 지도",
  loadingLabel: "지도를 불러오는 중입니다",
  retry: "다시 시도",
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
} as const;
