// 회식 모드 시안 문구 (T7.3, /design-lab/party/<a|b|c>). PARTY-01~05, copy-guide 4.8, 4.2, 4.3, 4.4.
// 조건 질문, 완화 제안은 해요체, 저녁 고정 안내, 근거, 상태, 오류는 습니다체, 라벨과 버튼은 명사형 (tasks.md 2.2절).
// 시안을 고른 뒤(T7.5) 실제 화면(T7.25~T7.28)으로 옮길 때 src/copy/party.ts로 정리한다.
import { formatPriceBand, formatShortWon } from "@/lib/format";

export const partyLabCopy = {
  names: {
    a: "시안 A 조건 한 장",
    b: "시안 B 한 질문씩, 나란히 비교",
    c: "시안 C 결과 먼저",
  },
  index: {
    title: "회식 모드 시안 (T7.3)",
    body: "조건 입력과 후보 5곳, 근거 표시를 세 가지 흐름으로 비교합니다. 쿼리로 단계와 상태를 바꿔 볼 수 있습니다.",
  },

  head: {
    back: "투표로 돌아가기",
    eyebrow: "회식 모드",
    title: "회식 후보 찾기",
    titleResults: "회식 후보 5곳",
    titleResultsCount: (n: number) => `회식 후보 ${n}곳`,
    /** PARTY-02, copy-guide 4.8 */
    fixed: "회식은 저녁 기준, 도보 15분 안에서 찾습니다.",
  },

  /** 조건 라벨 (PARTY-01, copy-guide 4.8) */
  fields: {
    headcount: "인원",
    budget: "1인 예산",
    room: "룸/단체석",
    alcohol: "주류",
    anchor: "기준 위치",
    anchorValue: "회사",
    anchorChange: "바꾸기",
    anchorChangeLabel: "기준 위치 바꾸기",
    conditions: "조건",
    conditionsHint: "고른 조건은 근거가 있는 곳부터 보여 드립니다.",
    headcountUnit: "명",
    headcountDecrease: "한 명 빼기",
    headcountIncrease: "한 명 더하기",
    headcountValue: (n: number) => `${n}명`,
    budgetValue: (krw: number) => formatShortWon(krw),
    budgetRange: "1만~10만 원",
  },

  /** B 한 질문씩 (copy-guide 4.8 "몇 명이 가나요?") */
  questions: {
    headcount: "몇 명이 가나요?",
    budget: "1인 예산은 얼마인가요?",
    room: "룸이나 단체석이 필요한가요?",
    alcohol: "술도 함께하나요?",
    progress: (step: number, total: number) => `${total}단계 중 ${step}단계`,
    roomYes: "필요해요",
    roomYesHint: "룸이나 단체석 제보가 있는 곳부터 보여 드립니다.",
    roomNo: "상관없어요",
    alcoholYes: "마셔요",
    alcoholYesHint: "카페, 분식, 샐러드집은 뺍니다.",
    alcoholNo: "안 마셔요",
    budgetFine: "더 정확하게",
    next: "다음",
    prev: "이전 질문",
    find: "후보 찾기",
    quickHeadcount: "자주 쓰는 인원",
    quickBudget: "자주 쓰는 예산",
  },

  /** 조건 요약 줄 */
  summary: {
    label: "찾은 조건",
    change: "조건 바꾸기",
    changeShort: "바꾸기",
    headcount: (n: number) => `${n}명`,
    budget: (krw: number) => `1인 ${formatShortWon(krw)}`,
    room: "룸/단체석",
    roomOff: "자리 상관없음",
    alcohol: "주류",
    alcoholOff: "술 없이",
    editLabel: (field: string) => `${field} 바꾸기`,
    apply: "적용",
    close: "닫기",
  },

  /** 후보 행 */
  candidate: {
    walk: "도보",
    walkUnit: "분",
    price: "1인",
    thumbs: "만족",
    thumbsUnit: "%",
    thumbsNone: "후기 적음",
    estimate: "추정",
    estimateLabel: "추정 가격",
    pin: (n: number) => `지도 ${n}번`,
    rowLabel: (n: number, name: string) => `${n}번 후보 ${name}`,
    include: "투표에 넣기",
    includeLabel: (name: string) => `${name} 투표에 넣기`,
    showOnMap: (name: string) => `${name} 지도에서 보기`,
    detail: "근거 자세히",
    detailLabel: (name: string) => `${name} 근거 자세히`,
  },

  /** 조건 충족 근거 (PARTY-03, PARTY-04, copy-guide 4.8) */
  evidence: {
    /** 앞에 "1인 예산" 라벨이 붙어 "1인"을 뺀다(copy-guide 4.8 "1인 3.2만 원대 제보") */
    budgetReport: (krw: number, n: number) =>
      `${formatPriceBand(krw)} 제보 ${n}건`,
    budgetEstimate: (krw: number) => `${formatPriceBand(krw)}, 카테고리 추정`,
    roomReport: (n: number) => `룸 있음 제보 ${n}건`,
    groupReport: (n: number) => `단체석 제보 ${n}건`,
    alcoholPub: "술집",
    alcoholLikely: (category: string) => `${category}, 저녁 주류 흔함`,
    unknown: "정보 없음",
    checkNaver: "네이버 플레이스에서 확인",
    checkNaverLabel: (name: string) => `${name} 네이버 플레이스에서 확인`,
    met: "충족",
    estimated: "추정",
    missing: "정보 없음",
    legendTitle: "표시 뜻",
    legendMet: "제보로 확인",
    legendEstimate: "카테고리로 추정",
    legendUnknown: "정보 없음",
  },

  /** B 비교표 */
  matrix: {
    caption: "후보별 조건 근거",
    place: "후보",
    budget: "예산",
    room: "자리",
    alcohol: "주류",
    expandHint: "줄을 누르면 근거를 펼칩니다.",
  },

  /** 행동 */
  actions: {
    find: "후보 찾기",
    findCount: (n: number) => `후보 ${n}곳 찾기`,
    createPoll: "이 후보로 투표 만들기",
    createPollCount: (n: number) => `${n}곳으로 투표 만들기`,
    createPollMin: "2곳 이상 골라 주세요",
    naverMap: "네이버 지도에서 주변 식당 보기",
    createdNotice: "투표 만들기는 투표 시안(T7.2)에서 이어집니다.",
  },

  /** 콜드 스타트 안내 (근거 대부분 정보 없음) */
  cold: {
    title: "아직 제보가 적은 동네입니다",
    body: "정보 없음은 네이버 플레이스에서 확인해 주세요. 다녀온 뒤 남긴 태그가 다음 회식의 근거가 됩니다.",
  },

  /** 5곳 미만 (copy-guide 4.2 "회식 후보 부족") */
  few: {
    title: (n: number) => `조건에 맞는 곳이 ${n}곳뿐입니다`,
    body: "1인 예산을 조금 올려볼까요?",
    action: "예산 바꾸기",
    roomBody: "룸/단체석 조건을 풀면 3곳이 더 있습니다.",
    roomAction: "룸/단체석 조건 풀기",
  },

  /** 4상태 */
  states: {
    loading: "회식 후보를 찾는 중입니다",
    emptyTitle: "도보 15분 안에 조건에 맞는 곳이 없습니다",
    emptyBody: "1인 예산을 조금 올려볼까요?",
    emptyAction: "예산 바꾸기",
    errorTitle: "식당 정보를 불러오지 못했습니다",
    errorBody: "잠시 후 다시 시도해 주세요.",
    errorAction: "다시 시도",
    offlineTitle: "인터넷에 연결되어 있지 않습니다",
    offlineBody: "연결되면 회식 후보를 찾아 드립니다.",
    offlineFormLine: "연결되면 후보를 찾을 수 있습니다.",
  },

  map: {
    office: "회사",
    radius: "도보 15분",
    region: "회식 후보 지도",
    pinLabel: (n: number, name: string) => `${n} ${name}`,
  },

  /** 시안 안내(스크린 리더) */
  lab: {
    retried: "다시 찾았습니다.",
    applied: "조건을 바꿔 다시 찾았습니다.",
  },
} as const;
