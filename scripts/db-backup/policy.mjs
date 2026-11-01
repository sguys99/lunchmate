// DB 백업 규칙 (T8.17, T0.19). 순수 함수, 네트워크와 파일 쓰기 없음. 테스트: policy.test.ts

import { isAbsolute, relative, resolve } from "node:path";

/** 백업 폴더 이름: 2026-11-01_0930 (KST). 이름순 정렬 = 시간순 */
export const FOLDER_RE = /^\d{4}-\d{2}-\d{2}_\d{4}$/;

export function folderName(/** @type {Date} */ date) {
  const kst = new Date(date.getTime() + 9 * 60 * 60 * 1000);
  const iso = kst.toISOString(); // 2026-11-01T00:30:00.000Z 모양이지만 KST 값
  return `${iso.slice(0, 10)}_${iso.slice(11, 13)}${iso.slice(14, 16)}`;
}

/** dir이 root 안(같은 폴더 포함)인가. 백업은 저장소 밖에만 둔다 */
export function isInside(
  /** @type {string} */ root,
  /** @type {string} */ dir,
) {
  const rel = relative(resolve(root), resolve(dir));
  return rel === "" || (!rel.startsWith("..") && !isAbsolute(rel));
}

/** 오래된 것부터 지울 폴더 이름. 형식에 맞는 폴더만 센다(다른 파일은 건드리지 않는다) */
export function foldersToRotate(
  /** @type {string[]} */ names,
  /** @type {number} */ keep,
) {
  if (!Number.isInteger(keep) || keep < 1) throw new Error("keep은 1 이상");
  const sorted = names.filter((n) => FOLDER_RE.test(n)).sort();
  return sorted.slice(0, Math.max(0, sorted.length - keep));
}

/** 로그에 비밀값이 섞이지 않게 가린다: 넘겨준 값 + 연결 문자열의 비밀번호 + PGPASSWORD 줄 */
export function redact(
  /** @type {string} */ text,
  /** @type {(string | undefined)[]} */ secrets,
) {
  let out = text;
  for (const s of secrets) {
    if (s && s.length >= 4) out = out.split(s).join("***");
  }
  out = out.replace(/(postgres(?:ql)?:\/\/[^:\s/]+:)[^@\s]+@/gi, "$1***@");
  out = out.replace(/(PGPASSWORD=)\S+/g, "$1***");
  return out;
}

/** 덤프 세 가지 (Supabase 공식 백업 안내와 같은 구성) */
export const DUMP_PARTS = [
  { file: "roles.sql", args: ["--role-only"] },
  // 스키마: auth, storage 같은 플랫폼 스키마는 CLI가 뺀다. public, private 스키마와 RLS 정책, 함수가 들어간다
  { file: "schema.sql", args: [] },
  // 데이터: auth.users를 포함한 모든 데이터(트리거 끈 채로 복원하도록 CLI가 앞뒤를 붙인다)
  {
    file: "data.sql",
    args: [
      "--data-only",
      "--use-copy",
      "-x",
      "storage.buckets_vectors",
      "-x",
      "storage.vector_indexes",
    ],
  },
];
