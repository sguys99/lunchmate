// 네이버 프로필 1회 동기화 (T4.7, PRD AUTH-01N, research-notes T0.14 권장 설계 4번).
// 네이버 OIDC id_token에는 sub만 있어 가입 트리거(handle_new_user)가 닉네임과 사진을 채우지 못한다.
// 그래서 /auth/callback에서 provider_token(네이버 접근 토큰)으로 프로필 API를 한 번 부르고 닉네임과 사진만 쓴다.
//
// 지키는 것
// - 토큰은 Authorization 헤더로만 보낸다. 저장, 로깅, 오류 메시지 포함 모두 하지 않는다.
// - 이 함수는 어떤 경우에도 throw하지 않는다. 실패하면 null을 돌려주고 로그인은 그대로 진행한다(온보딩에서 닉네임 입력).
// - 응답 값은 DB 제약(profiles_nickname_len, profiles_avatar_url_host)과 같은 규칙으로 걸러서 넘긴다.
//   이름, 이메일 등 다른 필드는 읽지 않는다.
//
// 출처: 네이버 회원 프로필 조회 API https://developers.naver.com/docs/login/profile/profile.md
// (GET https://openapi.naver.com/v1/nid/me, Authorization: Bearer, 응답 { resultcode: "00", message, response: { nickname, profile_image, ... } })

export const NAVER_PROFILE_URL = "https://openapi.naver.com/v1/nid/me";
export const NAVER_PROFILE_TIMEOUT_MS = 4000;

export type ProfilePatch = { nickname?: string; avatar_url?: string };

/** DB의 profiles_nickname_len과 같은 규칙: 앞뒤 공백 제거, 20자 자르고 다시 공백 제거, 비면 없음 */
export function cleanNickname(raw: unknown): string | undefined {
  if (typeof raw !== "string") return undefined;
  const v = Array.from(raw.trim()).slice(0, 20).join("").trim();
  return v.length > 0 ? v : undefined;
}

const AVATAR_HOST =
  /^https:\/\/([a-z0-9-]+\.)*(kakaocdn\.net|pstatic\.net|googleusercontent\.com)\//;

/** DB의 profiles_avatar_url_host와 같은 규칙: http는 https로, 허용 CDN만, 1024자 이하 */
export function cleanAvatarUrl(raw: unknown): string | undefined {
  if (typeof raw !== "string") return undefined;
  const v = raw.trim().replace(/^http:\/\//, "https://");
  if (v.length > 1024 || !AVATAR_HOST.test(v)) return undefined;
  return v;
}

type FetchLike = (
  input: string,
  init: {
    headers: Record<string, string>;
    signal: AbortSignal;
    cache: "no-store";
  },
) => Promise<{ ok: boolean; json: () => Promise<unknown> }>;

/** 네이버 프로필 API를 한 번 부른다. 성공하면 쓸 값만, 아니면 null. 절대 throw하지 않고 토큰을 남기지 않는다 */
export async function fetchNaverProfile(
  accessToken: string,
  fetchImpl: FetchLike = fetch as unknown as FetchLike,
  timeoutMs: number = NAVER_PROFILE_TIMEOUT_MS,
): Promise<ProfilePatch | null> {
  if (!accessToken) return null;
  try {
    const res = await fetchImpl(NAVER_PROFILE_URL, {
      headers: { Authorization: `Bearer ${accessToken}` },
      signal: AbortSignal.timeout(timeoutMs),
      cache: "no-store",
    });
    if (!res.ok) return null;
    const body: unknown = await res.json();
    if (!body || typeof body !== "object") return null;
    const { resultcode, response } = body as {
      resultcode?: unknown;
      response?: unknown;
    };
    if (resultcode !== "00" || !response || typeof response !== "object") {
      return null;
    }
    const r = response as { nickname?: unknown; profile_image?: unknown };
    const patch: ProfilePatch = {};
    const nickname = cleanNickname(r.nickname);
    const avatar = cleanAvatarUrl(r.profile_image);
    if (nickname) patch.nickname = nickname;
    if (avatar) patch.avatar_url = avatar;
    return Object.keys(patch).length > 0 ? patch : null;
  } catch {
    // 네트워크 오류, 시간 초과, JSON 오류. 오류 객체에 요청 정보가 담길 수 있어 남기지 않는다.
    return null;
  }
}
