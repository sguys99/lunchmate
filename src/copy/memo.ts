// 식당 메모 문구 (T10.15, D-32, D-33 시안 B 이름표 시트). 상세 이름표, 작은 시트, 홈 카드 배지, 나 탭 즐겨찾기,
// 카카오 장애 때 이름 대체와 홈 "즐겨찾기에서 고르기".
// 문체: 상태, 정책, 오류, 결과, 설명은 습니다체. 버튼, 라벨은 명사형(비율 제외). Em dash, 중간점 금지.
// 자리표시자는 장소명이 아닌 일반 예시다(카카오 장소명 미리 채우기 금지, CLAUDE.md 7장).
import { MEMO_DAILY, MEMO_PLACES_MAX } from "@/features/memo/model";
import { moderationCopy } from "./moderation";
import { placeCopy } from "./place";

export const memoCopy = {
  label: "내 메모",
  add: "메모 남기기",
  /** 이름표 알약의 스크린 리더 이름 */
  addLabel: (name: string) => `${name} 메모 남기기`,
  editLabel: (name: string) => `${name} 메모 고치기`,
  tagLabel: (memo: string, name: string) =>
    `내 메모 ${memo}, ${name} 메모 고치기`,
  /** 장애 때 이름표 상자 안 고치기 */
  edit: "고치기",
  /** 이름을 모를 때 알약 이름에 쓰는 말 */
  thisPlace: "이 식당",

  sheet: {
    title: "내 메모",
    body: "나만 보는 메모입니다. 이 식당이 다시 추천되거나 즐겨찾기에서 볼 때 함께 보입니다.",
    privacy: "나만 볼 수 있습니다.",
    inputLabel: "내 메모",
    placeholder: "예: 깍두기가 맛있는 곳",
    count: (n: number, max: number) => `${n}/${max}`,
    countLabel: (n: number, max: number) => `${max}자 가운데 ${n}자`,
    save: "저장",
    saving: "저장하는 중",
    retry: "다시 저장",
    remove: "메모 지우기",
    close: "닫기",
    loading: "메모 칸을 불러오는 중입니다.",
    loadFailed: "메모 칸을 불러오지 못했습니다.",
    loadFailedBody: "연결을 확인하고 다시 눌러 주세요.",
  },

  result: {
    saved: "메모를 저장했습니다.",
    removed: "메모를 지웠습니다.",
  },

  errors: {
    tooLong: (max: number) => `${max}자까지 쓸 수 있습니다.`,
    save: "메모를 저장하지 못했습니다. 쓴 내용은 그대로 있으니 다시 저장해 주세요.",
    invalid: "메모에 쓸 수 없는 글자가 있습니다. 고친 뒤 다시 저장해 주세요.",
    banned: moderationCopy.banned,
    daily: `오늘은 메모를 ${MEMO_DAILY}번 저장했습니다. 내일 다시 고칠 수 있습니다.`,
    limit: `메모는 ${MEMO_PLACES_MAX}곳까지 남길 수 있습니다. 쓰지 않는 메모를 지워 주세요.`,
    suspended: "이용이 제한된 계정이라 지금은 메모를 저장할 수 없습니다.",
    unauthenticated: "로그인이 풀렸습니다. 다시 로그인한 뒤 저장해 주세요.",
    disabled: "지금은 메모를 저장할 수 없습니다.",
  },

  states: {
    loading: "메모를 불러오는 중입니다.",
    offline: "연결되면 메모를 고칠 수 있습니다.",
  },

  /** 카카오 장애나 이름 확인 실패 때 이름 자리 대체 */
  fallback: {
    note: "카카오에서 이름을 불러오지 못해 내 메모로 보여 드립니다.",
  },

  /** 오늘(홈) 카카오 오류 카드 아래 "즐겨찾기에서 고르기" (PRD 12장 보조 동작, D-33 안건 4) */
  pick: {
    title: "즐겨찾기에서 고르기",
    note: "메모를 남긴 즐겨찾기만 보입니다. 누르면 카카오맵에서 엽니다.",
    open: placeCopy.openKakaoMap,
    openLabel: (memo: string) => `${memo}, ${placeCopy.openKakaoMap}`,
  },
} as const;
