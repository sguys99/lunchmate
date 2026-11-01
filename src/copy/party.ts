// 회식 모드 문구 (T7.25~T7.28, /poll/party, D-16, DESIGN.md 5장 "회식 모드", copy-guide 4.8).
// 조건 질문, 완화 제안은 해요체, 저녁 고정 안내, 근거, 상태, 오류는 습니다체, 라벨과 버튼은 명사형 (tasks.md 2.2절).
import { formatPriceBand, formatShortWon } from "@/lib/format";

export const partyCopy = {
  metaTitle: "회식 모드",

  head: {
    back: "투표로 돌아가기",
    eyebrow: "회식 모드",
    title: "회식 후보 찾기",
    titleResultsCount: (n: number) => `회식 후보 ${n}곳`,
    /** PARTY-02 */
    fixed: "회식은 저녁 기준, 도보 15분 안에서 찾습니다.",
  },

  /** 조건 라벨 (PARTY-01) */
  fields: {
    headcount: "인원",
    budget: "1인 예산",
    room: "룸/단체석",
    alcohol: "주류",
    headcountUnit: "명",
    headcountDecrease: "한 명 빼기",
    headcountIncrease: "한 명 더하기",
    budgetValue: (krw: number) => formatShortWon(krw),
  },

  /** 첫 사용 질문 2개 (D-16 안건 1) */
  questions: {
    headcount: "몇 명이 가나요?",
    budget: "1인 예산은 얼마쯤인가요?",
    progress: (step: number, total: number) => `${total}단계 중 ${step}단계`,
    quickHeadcount: "자주 쓰는 인원",
    quickBudget: "자주 쓰는 예산",
    headcountChip: (n: number) => `${n}명`,
    next: "다음",
    prev: "이전 질문",
    find: "후보 찾기",
    roomYes: "필요",
    roomYesHint: "룸이나 단체석 제보가 있는 곳부터 보여 드립니다.",
    roomNo: "상관없음",
    alcoholYes: "술도 함께",
    alcoholYesHint: "카페, 분식, 샐러드집은 뺍니다.",
    alcoholNo: "술 없이",
  },

  /** 조건 문장 */
  summary: {
    label: "찾은 조건",
    headcount: (n: number) => `${n}명`,
    budget: (krw: number) => `1인 ${formatShortWon(krw)}`,
    room: "룸/단체석",
    roomOff: "자리 상관없음",
    alcohol: "주류",
    alcoholOff: "술 없이",
    editLabel: (field: string) => `${field} 바꾸기`,
    apply: "적용",
    close: "닫기",
    applied: "조건을 바꿔 다시 찾았습니다.",
  },

  /** 기준 위치 (D-16 안건 9). 현위치는 쓰지 않는다 */
  base: {
    label: "기준",
    office: (name: string) => `${name} 기준`,
    /** 지도에서 찍은 곳(기기 메모리에만, 저장하지 않음) */
    picked: "지도에서 찍은 곳",
    change: "바꾸기",
    changeLabel: "기준 위치 바꾸기",
    menuTitle: "기준 위치",
    manage: "사무실 관리",
    needTitle: "기준 위치가 없습니다",
    needBody: "회사 위치를 지도에 놓으면 근처 회식 후보를 찾아 드립니다.",
    needAction: "회사 위치 정하기",
  },

  candidate: {
    walk: "도보",
    walkUnit: "분",
    price: "1인",
    thumbs: "만족",
    thumbsUnit: "%",
    thumbsNone: "후기 적음",
    estimate: "추정",
    estimateLabel: "추정 가격",
    includeLabel: (name: string) => `${name} 투표에 넣기`,
    number: (n: number) => `${n}번`,
    showOnMap: "지도에서 보기",
    listLabel: "회식 후보",
  },

  /** 조건 충족 근거 (PARTY-03, PARTY-04) */
  evidence: {
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

  actions: {
    createPollCount: (n: number) => `${n}곳으로 투표 만들기`,
    createPollMin: "2곳 이상 골라 주세요.",
    naverMap: "네이버 지도에서 주변 식당 보기",
  },

  /** 콜드 스타트 (근거 대부분 추정이나 정보 없음) */
  cold: {
    title: "아직 제보가 적은 동네입니다",
    body: '"정보 없음"인 곳은 네이버 플레이스에서 확인해 주세요. 다녀온 뒤 남긴 태그가 다음 회식의 근거가 됩니다.',
  },

  /** 5곳 미만 */
  few: {
    title: (n: number) => `조건에 맞는 곳이 ${n}곳뿐입니다`,
    body: "1인 예산을 조금 올려볼까요?",
    alcoholBody: "주류 조건을 풀어볼까요?",
    action: "예산 바꾸기",
    /** 주류 조건 때문에 빠진 곳이 있을 때(alcoholBody와 짝) */
    alcoholAction: "주류 조건 바꾸기",
  },

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
    loadFailedTitle: "내 설정을 불러오지 못했습니다",
    loadFailedBody: "잠시 후 다시 시도해 주세요.",
    loadFailedAction: "다시 불러오기",
  },

  map: {
    office: "회사",
    region: "회식 후보 지도",
  },
} as const;
