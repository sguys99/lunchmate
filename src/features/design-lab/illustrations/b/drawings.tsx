// 시안 B 카테고리 선화 12종 (T1.5). 음식과 그릇만 그린다. 캐릭터, 얼굴, 마스코트 금지.
// 좌표계는 viewBox 96. 그릇 바닥선은 대체로 y 74~80에 맞춰 12종의 무게중심을 같게 둔다.
import { Frame } from "./frame";

type Props = { className?: string };

/** 한식: 밥공기와 반찬 두 접시, 수저 */
export function Hansik({ className }: Props) {
  return (
    <Frame category="hansik" className={className}>
      <path d="M14 56h40c0 11-9 18-20 18s-20-7-20-18Z" />
      <path d="M28 74l1 3h10l1-3" />
      <path d="M16 56c1.5-8.5 9-13.5 18-13.5S50.5 47.5 52 56" />
      <path d="M28 49l1.2-.6M34 47.5l1.2.4M40 50l1 .8" />
      <path d="M58 70h28M60 70c0 4.5 4 7 13 7s13-2.5 13-7" />
      <path d="M63 70c1-4.5 4.5-7 10-7s9 2.5 10 7M68 66.5l2 3.5M74 64.5l1 5M79 66l-1 4" />
      <path d="M60 24l24 22M63 20l24 22" />
    </Frame>
  );
}

/** 중식: 짜장면 그릇과 면을 집어 올린 젓가락 */
export function Jungsik({ className }: Props) {
  return (
    <Frame category="jungsik" className={className}>
      <path d="M19 55h58c0 13-12.5 21-29 21s-29-8-29-21Z" />
      <path d="M40 76l1 3h14l1-3" />
      <path d="M25 55c3-4 7-4 10 0s7 4 10 0 7-4 10 0 7 4 10 0 5-3 7 0" />
      <path d="M60 14l-9 32M66 15l-10 32" />
      <path d="M52 44c-2 4 1.5 6-.5 11M55 45c2 4-1.5 6 .5 10M49.5 45c-3 3 0 6-2 10" />
      <path d="M33 50.5l5-1.5M64 50l4 1" />
    </Frame>
  );
}

/** 일식: 나무 받침 위 초밥 두 점 */
export function Ilsik({ className }: Props) {
  return (
    <Frame category="ilsik" className={className}>
      <rect x="10" y="66" width="76" height="7" rx="2" />
      <path d="M18 73v6M78 73v6" />
      <rect x="17" y="56" width="26" height="10" rx="5" />
      <path d="M15 58c2-7 9.5-9.5 15-9.5S43 51 45 58c-3.5-1.5-8-2-15-2s-11.5.5-15 2Z" />
      <path d="M23 52l2 3.5M29 50.5l2 4.5M35 51l2 4" />
      <rect x="53" y="56" width="26" height="10" rx="5" />
      <path d="M51 58c2-7 9.5-9.5 15-9.5S79 51 81 58c-3.5-1.5-8-2-15-2s-11.5.5-15 2Z" />
      <path d="M59 52l2 3.5M65 50.5l2 4.5M71 51l2 4" />
    </Frame>
  );
}

/** 양식: 접시 위 파스타 한 둥지와 포크 */
export function Yangsik({ className }: Props) {
  return (
    <Frame category="yangsik" className={className}>
      <ellipse cx="48" cy="66" rx="36" ry="11" />
      <ellipse cx="48" cy="65" rx="23" ry="6.5" />
      <path d="M33 63c0-11 30-11 30 0 0 6-24 6-24-1 0-5.5 18-5.5 18 0 0 3.5-12 3.5-12 0" />
      <path d="M41 55c3-4 9-4 12 0" />
      <path d="M43 53.5c3.5-5 8.5-3.5 9-1.5-3.5 3-6.5 3-9 1.5Z" />
      <path d="M70 18v10c0 3.5-2 5-4 5s-4-1.5-4-5V18M66 18v9M66 33v21" />
    </Frame>
  );
}

/** 분식: 떡볶이 접시와 김밥 두 알 */
export function Bunsik({ className }: Props) {
  return (
    <Frame category="bunsik" className={className}>
      <path d="M10 60h44c0 9-8 14-22 14s-22-5-22-14Z" />
      <path d="M26 74l1 3h10l1-3" />
      <rect
        x="16"
        y="52"
        width="14"
        height="5.5"
        rx="2.75"
        transform="rotate(-12 23 55)"
      />
      <rect
        x="29"
        y="49"
        width="14"
        height="5.5"
        rx="2.75"
        transform="rotate(8 36 52)"
      />
      <rect
        x="38"
        y="54"
        width="12"
        height="5.5"
        rx="2.75"
        transform="rotate(-6 44 57)"
      />
      <path d="M56 73h32" />
      <rect x="58" y="57" width="28" height="13" rx="6.5" />
      <path d="M65 57.5v12M72 57.5v12M79 57.5v12" />
    </Frame>
  );
}

/** 국밥/탕: 받침 위 뚝배기, 숟가락, 김 */
export function Gukbap({ className }: Props) {
  return (
    <Frame category="gukbap" className={className}>
      <path d="M18 48h60" />
      <path d="M22 48v3c0 15 10 23 26 23s26-8 26-23v-3" />
      <path d="M22 54c-4 0-6 1.5-6 4M74 54c4 0 6 1.5 6 4" />
      <path d="M16 79h64M22 79l2-5M74 79l-2-5" />
      <path d="M36 40c-3-3.5 3-6 0-10M46 38c-3-3.5 3-6 0-10M56 40c-3-3.5 3-6 0-10" />
      <path d="M62 47l14-21" />
      <ellipse
        cx="78.5"
        cy="22"
        rx="3.5"
        ry="5.5"
        transform="rotate(34 78.5 22)"
      />
    </Frame>
  );
}

/** 고기: 둥근 석쇠 위 고기 두 점과 마늘 */
export function Gogi({ className }: Props) {
  return (
    <Frame category="gogi" className={className}>
      <ellipse cx="48" cy="62" rx="35" ry="13" />
      <path d="M16 64h64M22 70h52" />
      <path d="M30 76l-3 5M66 76l3 5" />
      <path d="M18 58c4-9 18-11 26-6 3 2 1.5 6-3 7.5-8 2-17 1.5-23-1.5Z" />
      <path d="M24 55.5c4-2 9-2 13-1M25 59c5 .5 10-.5 14-2" />
      <path d="M48 55c4-9 18-11 26-6 3 2 1.5 6-3 7.5-8 2-17 1.5-23-1.5Z" />
      <path d="M54 52.5c4-2 9-2 13-1M55 56c5 .5 10-.5 14-2" />
      <path d="M66 32c5-7 15-6 18 1-6 4.5-13 4-18-1ZM68 32.5c5-.5 10 0 14 1.5" />
    </Frame>
  );
}

/** 아시안: 쌀국수 그릇, 라임, 고수, 국물 숟가락 */
export function Asian({ className }: Props) {
  return (
    <Frame category="asian" className={className}>
      <path d="M16 52h64c0 15-14 24-32 24s-32-9-32-24Z" />
      <path d="M40 76l1 3h14l1-3" />
      <path d="M24 52c8-5 16-5 24-1.5s16 3.5 24-.5" />
      <path d="M30 49c4-1.5 8-1.5 12 0" />
      <path d="M52 47a6 6 0 0 1 12 0ZM58 47v-6M58 47l-4-4M58 47l4-4" />
      <path d="M36 46c-1-4 2-6 5-6 0 3-2 6-5 6ZM36 46c-3-1-4.5-3.5-4-6 3 0 5 3 4 6Z" />
      <path d="M68 50l8-26c1-3 4-4 6-2.5s2 4.5-1 6.5l-9 23" />
    </Frame>
  );
}

/** 패스트푸드: 버거 한 개 */
export function Fastfood({ className }: Props) {
  return (
    <Frame category="fastfood" className={className}>
      <path d="M22 46c0-14 12-21 26-21s26 7 26 21Z" />
      <path d="M38 34l2-1M48 31h2M57 34l2 1M43 40l1.5-1M53 39.5l1.5.5" />
      <path d="M20 51c3 3 6 3 8 0s5 3 8 0 5 3 8 0 5 3 8 0 5 3 8 0 5 3 8 0 5 3 8 0" />
      <rect x="22" y="55" width="52" height="8" rx="4" />
      <path d="M22 67h52v2c0 4-3 6-6 6H28c-3 0-6-2-6-6Z" />
    </Frame>
  );
}

/** 샐러드/건강식: 볼 샐러드, 잎채소와 방울토마토 */
export function Salad({ className }: Props) {
  return (
    <Frame category="salad" className={className}>
      <path d="M14 54h68c0 14-15 23-34 23s-34-9-34-23Z" />
      <path d="M40 77l1 3h14l1-3" />
      <path d="M22 54c1-13 9-19 20-20-1 11-8 18-20 20ZM24 52l14-14" />
      <path d="M54 54c3-14 13-19 24-17-3 11-12 16-24 17ZM57 52l17-12" />
      <circle cx="48" cy="47" r="6" />
      <path d="M46 41.5l2 1.5 2-1.5" />
      <ellipse cx="66" cy="51" rx="5" ry="3" />
    </Frame>
  );
}

/** 카페/베이커리: 받침 위 커피 잔과 크루아상 */
export function Cafe({ className }: Props) {
  return (
    <Frame category="cafe" className={className}>
      <path d="M22 46h32v10c0 10-7 16-16 16s-16-6-16-16Z" />
      <path d="M54 50c6 0 8 2 8 5s-3 5-8 5" />
      <path d="M14 76h48M19 76c4 3.5 34 3.5 38 0" />
      <path d="M33 38c-3-3.5 3-6 0-10M43 38c-3-3.5 3-6 0-10" />
      <path d="M60 75c1-14 26-14 28 0-3.5-2-7-1-14-1s-10.5-1-14 1Z" />
      <path d="M66.5 65.5l2.5 9M74 62.5v11.5M81.5 65.5l-2.5 9" />
    </Frame>
  );
}

/** 술집: 맥주잔과 꼬치 한 접시 */
export function Pub({ className }: Props) {
  return (
    <Frame category="pub" className={className}>
      <path d="M22 34h26v38a3 3 0 0 1-3 3H25a3 3 0 0 1-3-3Z" />
      <path d="M48 42h4a5 5 0 0 1 5 5v12a5 5 0 0 1-5 5h-4" />
      <path d="M21 34c0-5 4-6.5 7-4 1.5-4.5 8-4.5 9.5 0 2-3 10.5-2 10.5 4" />
      <path d="M29 48v18M35 44v22M41 48v18" />
      <ellipse cx="73" cy="71" rx="16" ry="5" />
      <path d="M58 68l30-12" />
      <rect
        x="62"
        y="61"
        width="7"
        height="7"
        rx="2"
        transform="rotate(-22 65.5 64.5)"
      />
      <rect
        x="70.5"
        y="58"
        width="7"
        height="7"
        rx="2"
        transform="rotate(-22 74 61.5)"
      />
      <rect
        x="79"
        y="54.5"
        width="7"
        height="7"
        rx="2"
        transform="rotate(-22 82.5 58)"
      />
    </Frame>
  );
}
