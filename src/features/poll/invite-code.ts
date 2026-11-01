// 투표방 초대 코드 형식 (T7.7, AC-POLL-3). DB가 만든다(private.new_invite_code, 마이그레이션 20261101140000).
// 12자, 31글자 알파벳(숫자 2~9와 i, l, o를 뺀 소문자), 약 59비트라 추측할 수 없다.
// /poll/[code] 경로 값과 서버 액션 입력을 DB에 보내기 전에 이 형식으로 거른다(형식이 틀리면 조회하지 않는다).
import * as z from "zod";

export const INVITE_CODE_LENGTH = 12;
export const INVITE_CODE_ALPHABET = "23456789abcdefghjkmnpqrstuvwxyz";
export const INVITE_CODE_PATTERN = /^[2-9a-hjkmnp-z]{12}$/;

export const inviteCodeSchema = z
  .string()
  .trim()
  .toLowerCase()
  .regex(INVITE_CODE_PATTERN);

/** 경로나 붙여 넣은 값에서 코드를 꺼낸다. 형식이 틀리면 null */
export function parseInviteCode(raw: string | null | undefined): string | null {
  const r = inviteCodeSchema.safeParse(raw ?? "");
  return r.success ? r.data : null;
}
