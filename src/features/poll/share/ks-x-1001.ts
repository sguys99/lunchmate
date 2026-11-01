// 서버 OG 글꼴(마루 부리, Pretendard KS X 1001 서브셋)로 그릴 수 있는 글자인지 본다 (T7.14, D-17 안건 4).
// 서브셋에 없는 글자는 Satori가 빈 칸으로 그리므로, 그런 글자가 든 제목은 기본 문구로 바꾼다.
// 허용: 보이는 ASCII(공백 포함)와 KS X 1001 완성형 한글 2,350자. 한글 목록은 EUC-KR(= KS X 1001) 2바이트 영역
// B0A1~C8FE를 TextDecoder로 풀어 만든다(표를 손으로 옮기지 않는다). 그 밖의 기호, 한자, 이모지는 빠질 수 있어 막는다.
let hangul: Set<string> | null = null;

function ksHangul(): Set<string> {
  if (hangul) return hangul;
  const decoder = new TextDecoder("euc-kr");
  const set = new Set<string>();
  for (let lead = 0xb0; lead <= 0xc8; lead++) {
    for (let trail = 0xa1; trail <= 0xfe; trail++) {
      const ch = decoder.decode(new Uint8Array([lead, trail]));
      if (ch >= "가" && ch <= "힣") set.add(ch);
    }
  }
  hangul = set;
  return set;
}

/** 서버 OG 글꼴로 모든 글자를 그릴 수 있으면 true */
export function isOgDrawable(text: string): boolean {
  const set = ksHangul();
  for (const ch of text) {
    const code = ch.codePointAt(0) ?? 0;
    if (code >= 0x20 && code <= 0x7e) continue;
    if (set.has(ch)) continue;
    return false;
  }
  return true;
}
