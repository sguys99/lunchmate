// 카테고리 선화 12종 (T2.8). 출발점은 G1 시안 B 선화(D-01). 음식과 그릇만 그린다. 사람, 얼굴, 마스코트 금지.
// 통일 규칙(frame.tsx): 바닥선 y 78, 가로 12~88, 주 그릇은 원(40,42) 아래에 앉고 곁들이는 것은 오른쪽,
// 수저와 포크는 오른쪽 위로 기울인다(/ 방향). 톤 면은 음식 한 군데. 원 2개와 점을 나란히 두지 않는다(얼굴로 읽힘).
// detail=false(icon 변형)에서는 결, 김, 깨 같은 잔선만 빠지고 실루엣은 그대로다.
import type { CategorySlug } from "@/features/place/categories";
import {
  bowlBody,
  type DrawOptions,
  foot,
  frontArc,
  Tone,
} from "./frame";

type Drawing = (o: DrawOptions) => React.ReactNode;

/** 한식: 밥공기, 김치 한 접시, 젓가락 */
const hansik: Drawing = ({ detail }) => (
  <>
    <path d={bowlBody(34, 56, 19, 73)} />
    <path d={foot(34, 6, 73)} />
    <path d={frontArc(34, 56, 19, 3.6)} />
    <path d="M16.5 56C18 46.5 25.5 41 34 41S50 46.5 51.5 56" />
    {detail && <path d="M27 48.5l1.4-.5M33.5 46.2l1.4.3M39.5 49l1.2.7" />}
    <path d={bowlBody(70, 71.5, 14, 77.6)} />
    <path d={frontArc(70, 71.5, 14, 2.6)} />
    <Tone d="M58.5 71.5C59 64.5 64 60.5 70 60.5S81 64.5 81.5 71.5Z" />
    <path d="M58.5 71.5C59 64.5 64 60.5 70 60.5S81 64.5 81.5 71.5" />
    {detail && <path d="M63.5 67c2-2.2 4.5-3 7-2.6M68 70c2.5-2.6 6-3.4 9-2.6" />}
    <path d="M60 51L80 19M64.5 52.5L84.5 20.5" />
  </>
);

/** 중식: 짜장 그릇과 면을 집어 올린 젓가락 */
const jungsik: Drawing = ({ detail }) => (
  <>
    <ellipse cx="44" cy="52" rx="28" ry="6" />
    <path d={bowlBody(44, 52, 28, 72)} />
    <path d={foot(44, 9, 72)} />
    <Tone d="M23 53c3-4.5 10-6.5 21-6.5s18 2 21 6.5c-4 2.6-12 3.6-21 3.6S27 55.6 23 53Z" />
    <path d="M26 54c3-2.5 6-2.5 9 0s6 2.5 9 0 6-2.5 9 0 6 2.5 9 0" />
    <path d="M60 14L50.5 46M66 15.5L55.5 47" />
    <path d="M50.5 46c-1.6 3 1 5-.5 8M55.5 47c1.6 2.6-1 4.6.5 7M47.5 47c-2.5 2.5 0 5-1.5 7.5" />
    {detail && <path d="M31 50l4-1.2M35.5 51l3.5-.4" />}
  </>
);

/** 일식: 나무 받침 위 초밥 두 점 */
const sushi = (x: number, detail: boolean) => (
  <>
    <rect x={x} y="53" width="26" height="10" rx="5" />
    <Tone
      outline
      d={`M${x - 2} 55.5C${x} 48 ${x + 6.5} 45.5 ${x + 13} 45.5S${x + 26} 48 ${x + 28} 55.5C${x + 24} 54 ${x + 19} 53.4 ${x + 13} 53.4S${x + 2} 54 ${x - 2} 55.5Z`}
    />
    {detail && (
      <path
        d={`M${x + 6} 49.5l2 3.5M${x + 12} 47.5l2 5M${x + 18} 48l2 4.5`}
      />
    )}
  </>
);
const ilsik: Drawing = ({ detail }) => (
  <>
    <rect x="12" y="63" width="72" height="8" rx="2" />
    <path d="M20 71v7M76 71v7" />
    {sushi(18, detail)}
    {sushi(52, detail)}
  </>
);

/** 양식: 접시 위 파스타 둥지, 바질 잎, 포크 */
const yangsik: Drawing = ({ detail }) => (
  <>
    <ellipse cx="42" cy="69.5" rx="30" ry="8.5" />
    <path d={frontArc(42, 69, 19, 4.6)} />
    <Tone outline d="M26 66c0-12.5 32-12.5 32 0-4 3.5-28 3.5-32 0Z" />
    {detail && <path d="M31 63.5c0-7 22-7 22 0M36 61c2-4 10-4 12 0" />}
    <path d="M38 57c3-4.5 9-5 12-2.5-3 3.5-8 4-12 2.5Z" />
    {detail && <path d="M38 57l9-2" />}
    <g transform="rotate(28 68 44)">
      <path d="M64 20v9c0 3 1.8 4.5 4 4.5s4-1.5 4-4.5v-9M68 20v8.5M68 33.5V62" />
    </g>
  </>
);

/** 분식: 떡볶이 접시와 김밥 한 줄 */
const bunsik: Drawing = ({ detail }) => (
  <>
    <path d={frontArc(34, 62, 22, 5)} />
    <path d="M12 62a22 5 0 0 1 4.6-3.1M51.4 58.9a22 5 0 0 1 4.6 3.1" />
    <path d={bowlBody(34, 62, 22, 74)} />
    <path d={foot(34, 7, 74)} />
    <Tone d="M17 62.5c3-2.6 9.5-3.8 17-3.8s14 1.2 17 3.8c-3 2.2-9.5 3.2-17 3.2s-14-1-17-3.2Z" />
    <rect x="18" y="53" width="14" height="5.5" rx="2.75" transform="rotate(-12 25 56)" />
    <rect x="30" y="50" width="14" height="5.5" rx="2.75" transform="rotate(10 37 53)" />
    <rect x="39" y="55" width="12" height="5.5" rx="2.75" transform="rotate(-6 45 58)" />
    {detail && <path d="M22 64l1.5.3M45 63.5l1.5-.4" />}
    <rect x="59" y="62" width="28" height="16" rx="8" />
    <path d="M66 62.5v15M73 62.5v15M80 62.5v15" />
  </>
);

/** 국밥/탕: 받침 위 뚝배기, 김 세 줄, 숟가락 */
const gukbap: Drawing = ({ detail }) => (
  <>
    <ellipse cx="42" cy="46" rx="25" ry="5.5" />
    <path d="M17 46v4c0 14 10.5 22 25 22s25-8 25-22v-4" />
    <rect x="13" y="72" width="58" height="6" rx="3" />
    <Tone d="M21 47c0-2.2 9.4-4 21-4s21 1.8 21 4-9.4 4-21 4-21-1.8-21-4Z" />
    {detail && <path d="M30 47.5l2.2-.6M40 45.2l2 .4M47 48l2-.5" />}
    {detail && (
      <path d="M32 37c-2.5-3 2.5-5 0-8.5M42 35c-2.5-3 2.5-5 0-8.5M52 37c-2.5-3 2.5-5 0-8.5" />
    )}
    <path d="M58 46.5L78 19.5" />
    <ellipse cx="55.5" cy="47.5" rx="4.2" ry="1.8" transform="rotate(-8 55.5 47.5)" />
  </>
);

/** 고기: 둥근 석쇠 위 고기 두 점과 상추 한 장 */
const gogi: Drawing = ({ detail }) => (
  <>
    <ellipse cx="44" cy="63" rx="32" ry="9" />
    <path d="M12 63v2c0 5 14.3 9 32 9s32-4 32-9v-2" />
    <path d="M24 73.4l-2 4.6M64 73.4l2 4.6" />
    {detail && <path d="M18.5 59.5h51M15.5 63.5h57M18.5 67.5h51" />}
    <Tone
      outline
      d="M19 60c3-6 15-8 22-4 2 1.5 1 4.5-2 5.5-7 2-15 1.5-20-1.5Z"
    />
    <Tone
      outline
      d="M46 57c3-6 15-8 22-4 2 1.5 1 4.5-2 5.5-7 2-15 1.5-20-1.5Z"
    />
    {detail && <path d="M25 58c4-1.5 8-1.7 11-1M52 55c4-1.5 8-1.7 11-1" />}
    <path d="M64 44c-2-7 3-14 10-16 .8 2.6 3 2.2 4.2 3.8s-.4 3.6 1 5.2 2.8 1.6 2.2 4-3.2 2-4.4 4C72 47 67.5 47 64 44Z" />
    <path d="M64 44c4.5-3.5 8.5-8 11.5-13" />
    {detail && <path d="M68.5 40l3.5.6M71.5 36l3.3.2" />}
  </>
);

/** 아시안: 쌀국수 그릇, 라임, 고수, 국물 숟가락 */
const asian: Drawing = ({ detail }) => (
  <>
    <ellipse cx="42" cy="50" rx="26" ry="5.5" />
    <path d={bowlBody(42, 50, 26, 73)} />
    <path d={foot(42, 8, 73)} />
    <path d="M21 51.5c6-3 13-3.5 21-1.5s14 2 21-.5" />
    {detail && <path d="M26 53.5c5-1.8 10-2 15-.8" />}
    <Tone outline d="M13 48.5a7.5 7.5 0 0 1 15 0Z" />
    {detail && <path d="M20.5 48.5v-5M20.5 48.5l-4-3.5M20.5 48.5l4-3.5" />}
    <path d="M38 47c-1-3.5 1.5-5.5 4.5-5.5 0 3-2 5.5-4.5 5.5ZM38 47c-3-.5-4.5-3-4-5.5 3 0 5 2.5 4 5.5Z" />
    <path d="M56 50.5l14-24c1.4-2.4 4.5-2.6 5.8-.8s.6 4.2-1.6 5.6L60.5 51.5" />
  </>
);

/** 패스트푸드: 버거 한 개 */
const fastfood: Drawing = ({ detail }) => (
  <>
    <path d="M18 50c0-14 11.5-22 26-22s26 8 26 22Z" />
    {detail && (
      <path d="M35 37l2-1M44 34h2M53 37l2 1M39.5 43l1.5-1M49 42.5l1.5.5" />
    )}
    <path d="M16 55c3 3 6 3 8 0s5 3 8 0 5 3 8 0 5 3 8 0 5 3 8 0 5 3 8 0 5 3 8 0" />
    <Tone outline d="M22 58h44a4 4 0 0 1 0 8H22a4 4 0 0 1 0-8Z" />
    <path d="M18 69h52v1.5c0 4.5-3 7-7 7H25c-4 0-7-2.5-7-7Z" />
  </>
);

/** 샐러드/건강식: 볼 샐러드, 잎채소와 방울토마토 */
const salad: Drawing = ({ detail }) => (
  <>
    <ellipse cx="44" cy="56" rx="30" ry="6" />
    <path d={bowlBody(44, 56, 30, 74)} />
    <path d={foot(44, 9, 74)} />
    <path d="M20 54c0-12 8-19 19-21 0 11-7 18-19 21Z" />
    {detail && <path d="M22 52L36 37" />}
    <path d="M53 55c2-13 12-19 24-18-2 11-11 17-24 18Z" />
    {detail && <path d="M56 53l17-13" />}
    <Tone outline d="M37.5 49a6.5 6.5 0 1 0 13 0a6.5 6.5 0 1 0-13 0Z" />
    <path d="M41.5 42.8l2.5 1.6 2.5-1.6" />
  </>
);

/** 카페/베이커리: 받침 위 커피 잔과 크루아상 */
const cafe: Drawing = ({ detail }) => (
  <>
    <ellipse cx="34" cy="48" rx="15" ry="3.5" />
    <Tone d="M21.5 48.6c0-1.3 5.6-2.4 12.5-2.4s12.5 1.1 12.5 2.4-5.6 2.4-12.5 2.4-12.5-1.1-12.5-2.4Z" />
    <path d="M19 48v8c0 9 6.5 15 15 15s15-6 15-15v-8" />
    <path d="M49 52c5.5 0 7.5 2.2 7.5 5s-2.5 5-7.5 5" />
    <ellipse cx="34" cy="73.5" rx="21" ry="4" />
    <path d="M13 73.5c0 2.6 9.4 4.5 21 4.5s21-1.9 21-4.5" />
    {detail && (
      <path d="M30 40c-2.5-3 2.5-5 0-8.5M38 40c-2.5-3 2.5-5 0-8.5" />
    )}
    <path d="M59 77.5c0-16 28-16 28 0-3.5-1.8-7.5-1-14-1s-10.5-.8-14 1Z" />
    <path d="M65.5 67l2.6 9.5M73 64.5v12M80.5 67l-2.6 9.5" />
  </>
);

/** 술집: 맥주잔과 꼬치 한 접시 */
const pub: Drawing = ({ detail }) => (
  <>
    <Tone d="M23 44h20v29a2 2 0 0 1-2 2H25a2 2 0 0 1-2-2Z" />
    <path d="M20 38h26v37a3 3 0 0 1-3 3H23a3 3 0 0 1-3-3Z" />
    <path d="M46 45h4a5 5 0 0 1 5 5v12a5 5 0 0 1-5 5h-4" />
    <path d="M19 38c0-5 4-6.5 7-4 1.5-4.5 8-4.5 9.5 0 2-3 10.5-2 10.5 4" />
    {detail && <path d="M28.5 51v17M37.5 51v17" />}
    <ellipse cx="72" cy="74" rx="14" ry="3.5" />
    <path d="M58 74c0 2.2 6.3 4 14 4s14-1.8 14-4" />
    <path d="M59 70.5L88 56" />
    <rect x="62" y="63.5" width="7" height="7" rx="2" transform="rotate(-26 65.5 67)" />
    <rect x="70" y="59.5" width="7" height="7" rx="2" transform="rotate(-26 73.5 63)" />
    <rect x="78" y="55.5" width="7" height="7" rx="2" transform="rotate(-26 81.5 59)" />
  </>
);

export const DRAWINGS = {
  hansik,
  jungsik,
  ilsik,
  yangsik,
  bunsik,
  gukbap,
  gogi,
  asian,
  fastfood,
  salad,
  cafe,
  pub,
} as const satisfies Record<CategorySlug, Drawing>;
