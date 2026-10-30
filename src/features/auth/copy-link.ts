// 링크 복사 (T4.10 인앱 안내). Clipboard API가 막힌 인앱 웹뷰가 있어 숨은 textarea + execCommand로 한 번 더 시도한다.
// 둘 다 안 되면 false: 화면이 주소를 선택 가능한 글자로 보여 준다(길게 눌러 복사).
export async function copyText(text: string): Promise<boolean> {
  try {
    if (navigator.clipboard?.writeText) {
      // 권한 창이 뜬 채 응답이 없는 웹뷰가 있어 1.5초 안에 끝나지 않으면 대체 방법으로 넘어간다
      const done = await Promise.race([
        navigator.clipboard.writeText(text).then(() => true),
        new Promise<false>((r) => setTimeout(() => r(false), 1500)),
      ]);
      if (done) return true;
    }
  } catch {
    // 권한 거부나 비보안 문맥: 아래 대체 방법으로
  }
  try {
    const el = document.createElement("textarea");
    el.value = text;
    el.setAttribute("readonly", "");
    el.style.position = "fixed";
    el.style.opacity = "0";
    document.body.appendChild(el);
    el.select();
    el.setSelectionRange(0, text.length);
    // 표준 대체 수단이 없어 남아 있는 execCommand를 쓴다(구형 인앱 웹뷰용)
    const ok = document.execCommand("copy");
    el.remove();
    return ok;
  } catch {
    return false;
  }
}
