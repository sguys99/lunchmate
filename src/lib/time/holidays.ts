// 한국 공휴일과 영업일 계산 (FB-04, D-11 기타 결정 "48시간은 주말과 공휴일을 빼고 센다").
//
// 출처 (2026-11-01 확인)
// - 2026년: 한국천문연구원 천문우주지식정보 "월력요항" 2026 (https://astro.kasi.re.kr/kor/life/post/calendarData?search_year=2026)
//   + 인사혁신처 "관공서의 공휴일에 관한 규정" 개정(2026-04-28 국무회의 의결): 노동절(5/1), 제헌절(7/17)을 2026년부터 공휴일로.
//   (천문연 2026 표는 개정 전 발표라 노동절이 기념일로만 있다. 개정 뒤 공휴일로 넣는다.)
// - 2027년: 우주항공청 "2027년도 월력요항"(2026-06-29 발표), 천문연 같은 누리집 search_year=2027.
//   노동절, 제헌절 포함 공휴일과 대체공휴일 7일(설 2/9, 노동절 5/3, 제헌절 7/19, 광복절 8/16, 개천절 10/4, 한글날 10/11, 성탄절 12/27).
// - "국민주권의 날"(12/3)은 지정 방침만 있고 법 개정이 확인되지 않아 넣지 않는다.
// - 임시공휴일은 정부가 따로 지정하면 이 표에 더한다. 2028년 이후는 해마다(월력요항 발표 6월) 늘린다(D-11, 연 1회 점검).
import { DAY_MS } from "./constants";
import { fromKstWallTime, getKstParts, kstDateKey } from "./kst";

/** KST 날짜 키(YYYY-MM-DD) → 이름. 대체공휴일과 선거일 포함 */
export const KR_PUBLIC_HOLIDAYS: Readonly<Record<string, string>> = {
  // 2026
  "2026-01-01": "1월 1일",
  "2026-02-16": "설날 연휴",
  "2026-02-17": "설날",
  "2026-02-18": "설날 연휴",
  "2026-03-01": "3.1절",
  "2026-03-02": "대체공휴일(3.1절)",
  "2026-05-01": "노동절",
  "2026-05-05": "어린이날",
  "2026-05-24": "부처님오신날",
  "2026-05-25": "대체공휴일(부처님오신날)",
  "2026-06-03": "전국동시지방선거",
  "2026-06-06": "현충일",
  "2026-07-17": "제헌절",
  "2026-08-15": "광복절",
  "2026-08-17": "대체공휴일(광복절)",
  "2026-09-24": "추석 연휴",
  "2026-09-25": "추석",
  "2026-09-26": "추석 연휴",
  "2026-10-03": "개천절",
  "2026-10-05": "대체공휴일(개천절)",
  "2026-10-09": "한글날",
  "2026-12-25": "기독탄신일",
  // 2027
  "2027-01-01": "1월 1일",
  "2027-02-06": "설날 연휴",
  "2027-02-07": "설날",
  "2027-02-08": "설날 연휴",
  "2027-02-09": "대체공휴일(설날)",
  "2027-03-01": "3.1절",
  "2027-05-01": "노동절",
  "2027-05-03": "대체공휴일(노동절)",
  "2027-05-05": "어린이날",
  "2027-05-13": "부처님오신날",
  "2027-06-06": "현충일",
  "2027-07-17": "제헌절",
  "2027-07-19": "대체공휴일(제헌절)",
  "2027-08-15": "광복절",
  "2027-08-16": "대체공휴일(광복절)",
  "2027-09-14": "추석 연휴",
  "2027-09-15": "추석",
  "2027-09-16": "추석 연휴",
  "2027-10-03": "개천절",
  "2027-10-04": "대체공휴일(개천절)",
  "2027-10-09": "한글날",
  "2027-10-11": "대체공휴일(한글날)",
  "2027-12-25": "기독탄신일",
  "2027-12-27": "대체공휴일(기독탄신일)",
};

/** 표가 담은 마지막 해. 이 해를 넘기면 주말만 빼고 센다(테스트가 해마다 늘리기를 알린다) */
export const HOLIDAY_TABLE_LAST_YEAR = 2027;

/** 그 순간이 속한 KST 날짜가 공휴일인가 */
export function isKstHoliday(date: Date): boolean {
  return kstDateKey(date) in KR_PUBLIC_HOLIDAYS;
}

/** 그 순간이 속한 KST 날짜가 영업일(월~금, 공휴일 아님)인가 */
export function isKstBusinessDay(date: Date): boolean {
  const { weekday } = getKstParts(date);
  if (weekday === 0 || weekday === 6) return false;
  return !isKstHoliday(date);
}

/**
 * from부터 to까지 지난 시간 중 영업일(KST)에 속한 시간만 더한 ms. to가 from보다 앞이면 0.
 * 예: 금 12:00 → 다음 월 12:00 = 금 12시간 + 월 12시간 = 24시간.
 */
export function businessMsBetween(from: Date, to: Date): number {
  const end = to.getTime();
  let cursor = from.getTime();
  if (!(end > cursor)) return 0;
  let total = 0;
  // 하루씩 KST 자정 경계로 자른다. 길게 묵은 방문도 최대 수백 번이면 끝난다
  for (let guard = 0; cursor < end && guard < 4000; guard += 1) {
    const p = getKstParts(new Date(cursor));
    const nextMidnight = fromKstWallTime(p.year, p.month, p.day + 1).getTime();
    const sliceEnd = Math.min(end, nextMidnight);
    if (isKstBusinessDay(new Date(cursor))) total += sliceEnd - cursor;
    cursor = sliceEnd;
  }
  return total;
}

/** start로부터 영업일 기준 windowMs가 아직 지나지 않았는가(경계 미포함, isExpired와 같은 규칙) */
export function isWithinBusinessWindow(
  start: Date,
  windowMs: number,
  now: Date,
): boolean {
  if (now.getTime() < start.getTime()) return true;
  return businessMsBetween(start, now) < windowMs;
}

/** "YYYY-MM-DD" 두 날짜 키의 달력 날짜 차이(b - a). 형식이 틀리면 NaN */
export function dateKeyDiff(a: string, b: string): number {
  const parse = (k: string) => {
    const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(k);
    return m ? Date.UTC(Number(m[1]), Number(m[2]) - 1, Number(m[3])) : NaN;
  };
  return Math.round((parse(b) - parse(a)) / DAY_MS);
}
