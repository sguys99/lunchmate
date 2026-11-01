// 쓰기 오류와 한도 안내 문구 (T6.17 금칙어, T6.18 하루 한도, T8.5 정지 계정, MOD-04, MOD-05, DEAL-04, PLACE-07, D-13 안건 12, 13).
// 후기, 신고, 제보, 할인, 웨이팅, 닉네임 저장이 같은 문구를 쓴다. 상태 안내와 오류는 습니다체(tasks.md 2.2절).
// 오류 문구는 다음 행동을 안내한다. 걸린 낱말은 알리지 않는다(D-13 안건 13).
// 한도 숫자는 DB private.daily_quota_max와 같다(값을 바꾸면 함께 고친다).
import type { LimitBucket, WriteErrorCode } from "@/lib/supabase/db-errors";

export const DAILY_LIMITS: Readonly<Record<LimitBucket, number>> = {
  reviews: 20,
  reports: 30,
  deals: 10,
  visits: 20,
};

type Message = { readonly title: string; readonly body: string };

export const moderationCopy = {
  /** 금칙어 거절 (D-13 안건 13). 한 줄 후기, 할인 내용, 신고 기타 글, 닉네임 */
  banned: "쓸 수 없는 표현이 있습니다. 표현을 바꿔 다시 보내 주세요.",
  bannedNickname: "쓸 수 없는 표현이 있습니다. 다른 이름으로 바꿔 주세요.",

  /** 하루 한도 (D-13 안건 12: 열 때와 보낼 때 모두 알림) */
  limits: {
    reviews: {
      title: "오늘은 후기를 더 남길 수 없습니다",
      body: "후기는 하루 20건까지입니다. 내일 다시 남겨 주세요.",
    },
    reports: {
      title: "오늘은 신고를 더 남길 수 없습니다",
      body: "신고와 제보는 하루 30건까지입니다. 급한 문제는 나 탭의 문의하기로 알려 주세요.",
    },
    deals: {
      title: "오늘은 할인 제보를 더 남길 수 없습니다",
      body: "할인 제보는 하루 10건까지입니다. 내일 다시 알려 주세요. 이미 있는 정보에는 아직 해요를 누를 수 있습니다.",
    },
    visits: {
      title: "오늘은 방문 기록을 더 남길 수 없습니다",
      body: "방문 기록은 하루 20건까지입니다. 내일 다시 남겨 주세요.",
    },
  } satisfies Record<LimitBucket, Message>,
  /** 열 때 미리 알림: 남은 수 */
  remaining: (n: number) => `오늘 ${n}건 더 남길 수 있습니다.`,

  /** 웨이팅 30분 1회 (PLACE-07) */
  cooldown: (time: string) => `${time}부터 다시 알릴 수 있습니다.`,

  errors: {
    invalid: {
      title: "보낼 수 없는 값이 있습니다",
      body: "입력한 내용을 확인하고 다시 보내 주세요.",
    },
    unauthenticated: {
      title: "로그인이 필요합니다",
      body: "로그인하면 바로 이어서 남길 수 있습니다.",
    },
    banned: {
      title: "쓸 수 없는 표현이 있습니다",
      body: "표현을 바꿔 다시 보내 주세요.",
    },
    duplicate: {
      title: "이미 남긴 내용입니다",
      body: "같은 내용은 한 번만 남길 수 있습니다.",
    },
    too_old: {
      title: "14일이 지난 방문입니다",
      body: "방문 후 14일까지만 답할 수 있습니다. 기록은 그대로 남습니다.",
    },
    not_found: {
      title: "기록을 찾지 못했습니다",
      body: "이미 지웠을 수 있습니다. 화면을 새로 고쳐 주세요.",
    },
    own_target: {
      title: "내가 쓴 글은 신고할 수 없습니다",
      body: "고치거나 지우려면 내 후기에서 바꿔 주세요.",
    },
    unavailable: {
      title: "이미 내려간 정보입니다",
      body: "화면을 새로 고치면 지금 정보를 볼 수 있습니다.",
    },
    undo_expired: {
      title: "되돌릴 수 있는 시간이 지났습니다",
      body: "제보는 30분 동안 보이고 그 뒤 자동으로 내려갑니다.",
    },
    suspended: {
      title: "이용이 제한된 계정입니다",
      body: "지금은 후기, 신고, 제보, 투표를 남길 수 없습니다. 기간이 끝나면 다시 쓸 수 있고, 궁금한 점은 나 탭의 문의하기로 보내 주세요.",
    },
    save: {
      title: "보내지 못했습니다",
      body: "입력한 내용은 그대로 두었습니다. 다시 보내 주세요.",
    },
  } satisfies Record<Exclude<WriteErrorCode, "limit" | "cooldown">, Message>,
  retry: "다시 보내기",
} as const;
