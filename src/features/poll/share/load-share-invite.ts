// 초대 공유 모듈(share-invite.ts) 지연 로더 (T9.10, POLL-03).
// 공유 버튼이 보이는 화면(만들기 시트의 "만들었어요", 투표방)이 뜰 때 preloadShareInvite로 모듈과 카카오 SDK를 미리 받는다.
// 누를 때 peekShareInvite()로 받은 모듈을 await 없이 부르면 sendDefault와 navigator.share가 탭(사용자 활성화) 안에서 돈다.
// iOS는 탭 뒤 네트워크를 기다리면 활성화가 사라져 공유 창이나 앱 전환이 막힐 수 있다.
// 이 파일은 작게 유지한다(정적 import 대상). 무거운 코드는 share-invite.ts와 SDK 쪽에 둔다.
type ShareInviteModule = typeof import("./share-invite");

let mod: ShareInviteModule | undefined;
let pending: Promise<ShareInviteModule> | undefined;

export function loadShareInvite(): Promise<ShareInviteModule> {
  pending ??= import("./share-invite")
    .then((m) => (mod = m))
    .catch((e: unknown) => {
      pending = undefined;
      throw e;
    });
  return pending;
}

/** 이미 받은 모듈. 없으면 undefined */
export function peekShareInvite(): ShareInviteModule | undefined {
  return mod;
}

/** 공유 화면이 뜰 때 부른다. kakao면 카카오 SDK도 받아 초기화한다. 실패는 삼키고 누를 때 다시 시도한다 */
export function preloadShareInvite(options: { kakao: boolean }): void {
  loadShareInvite()
    .then((m) => {
      if (options.kakao) m.preloadKakaoShare();
    })
    .catch(() => undefined);
}
