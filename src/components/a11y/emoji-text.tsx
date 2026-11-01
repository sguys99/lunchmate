// 문구 속 이모지를 읽기 좋게 그리는 조각 (T8.9 F6). "지난주 👍한 국밥"은 보이는 모양 그대로,
// 스크린리더는 "지난주 좋아요한 국밥"으로 읽는다(이모지 aria-hidden + 숨김 글자, 말은 src/copy/common.ts emojiSpeech).
// 문자열에 대상 이모지가 없으면 문자열을 그대로 돌려준다. 있으면 span 하나로 감싸 flex 부모(칩 등)에서 한 덩어리로 남긴다.
// 서버, 클라이언트 컴포넌트 어디서나 쓴다(훅 없음).
import { emojiSpeech } from "@/copy/common";

const EMOJI = Object.keys(emojiSpeech) as (keyof typeof emojiSpeech)[];
const PATTERN = new RegExp(`(${EMOJI.join("|")})`, "u");

function isEmoji(part: string): part is keyof typeof emojiSpeech {
  return Object.hasOwn(emojiSpeech, part);
}

export function EmojiText({ text }: { text: string }) {
  const parts = text.split(PATTERN);
  if (parts.length === 1) return text;
  return (
    <span>
      {parts.map((part, i) =>
        isEmoji(part) ? (
          <span key={i}>
            <span aria-hidden>{part}</span>
            <span className="sr-only">{emojiSpeech[part]}</span>
          </span>
        ) : (
          part
        ),
      )}
    </span>
  );
}
