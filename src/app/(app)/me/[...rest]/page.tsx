// 탭 아래 없는 주소(예: /today/nope)도 앱 셸 안 404로 보낸다 (T2.22). 루트 not-found로 가면 하단 탭이 사라진다.
// /poll 아래는 초대 코드 경로(T7)가 들어올 자리라 두지 않는다.
import { notFound } from "next/navigation";

export default function UnknownTabPath(): never {
  notFound();
}
