# researching-chapter 변경 기록

스킬 문서의 변경을 날짜순으로 적습니다. 새 항목은 위에 붙여요.

## 2026-10-17 1권 4장 기준 샘플 반영 (tasks.md 5장 3단계)

근거는 `vol1-llm/ch04/notes.md`의 "리서치 보고", "리서치 보강 보고 (R1 후속)", reviewer-r1 5, 6장, 오케스트레이터가 본 운영 문제입니다.

| 변경 | 고친 곳 | 근거 | 원인 |
|---|---|---|---|
| `notes.md`는 Edit로 끝에 덧붙이기만 하고, 쓴 뒤 `## ` 절 수가 줄지 않았는지 확인 | `research-report.md` 1장, `SKILL.md` 4장 출력 표 | 오케스트레이터: 4장 리서치가 노트를 새로 써 writer 절 개요가 지워짐 | 지시 부족 |
| `where`는 키가 쓰일 자리마다. 박스 사례용 claim만으로 본문 숫자를 받치지 못함 | `SKILL.md` 3단계 | R1-F01(devlin2018이 "4장 사례 ②" claim만 있는데 4.5절 숫자에 인용), liu2018 where 1-4-6과 실제 4.5 | 지시 부족 |
| 논문 설정값과 원문이 적은 관계식은 `value`에, 원문에 없는 계산은 claim에 넣지 않음 | `SKILL.md` 3단계 | R1-F03, R1-F08, 리서치 보강의 vaswani2017 4.3, 4.5 claim | 지시 부족 |
| 원고가 있으면 5단계에서 writing-chapter 명령 G-9로 `[@key]` 자리마다 claim 대조 | `SKILL.md` 5단계 | 리서치 보강 보고("원고의 `[@key]` 자리를 모두 대조")를 절차로 | 검사 누락 |
| 출처를 찾지 않는 것 표: 정본 손계산, 한빛로지스 값, 설계서 설명용 예문, 설명을 위한 단순화 가정(4.4절 네 토큰 분할) | `sources-and-verification.md` 2장 | notes "R1 반영 기록" 저자 확인 2, 3행 | 지시 부족 |

evals는 바뀐 문구에 기대지 않아 고치지 않았습니다.

## 2026-10-15 검사 스크립트 완성 반영 (tasks.md 3.7절)

- `references-schema.md` 9장 서식 점검과 `research-report.md` 7장 키 대조를 `scripts/check_references.py` 한 명령으로 바꾸고, 출력 규칙 ID 표(REF-M, REF-C, REF-B, REF-D, REF-X, REF-I)를 넣었습니다. 손 명령은 짧은 예비 명령으로 줄였습니다.
- 9장 "잡는 것"에 `year` 정수, 날짜 꼴(`accessed`, `verified_at`, `published`), `tier` 문자열 거부를 더하고, 장 파일이 비어 있으면 설계서 대조를 건너뛰는 차이(REF-I02)를 적었습니다.
- `SKILL.md` 5단계, `evals/README.md` Y1, Y5, K1 명령, `.claude/agents/researcher.md` Bash 칸을 같은 스크립트로 맞췄습니다.
- 정정: 아래 "저자 결정 반영과 서지 마스터 분리" 항목의 "references.yml 필드 20개"는 "서지 마스터 18개(필수 12, 선택 6)와 장 파일 3개(key, claims, note)"가 맞습니다.

## 2026-10-15 병렬 실행 때 서지 마스터 쓰기 규칙

- 3단계에 병렬 실행 규칙을 더했습니다. 병렬로 도는 researcher는 서지 마스터를 고치지 않고 리서치 보고 끝 "서지 마스터 반영 대기" 블록으로 넘기며, 메인 에이전트가 하나씩 반영합니다. `.claude/agents/researcher.md` 4장과 같은 규칙이고 저자가 승인했습니다.

## 2026-10-15 저자 결정 반영과 서지 마스터 분리

첫 초안에서 "저자 확인 대기"로 둔 기본값을 저자가 모두 승인했고, 출처 파일 구조를 두 층으로 나누는 안도 승인했습니다.

### 확정한 규칙

- 설계서 상태 기호 ✅/◐/⚠는 `check` 필드(matched, unchecked, secondary)로 받습니다. `status`는 사람 확인 여부(unverified, verified)만 나타냅니다. tasks.md 4.4절 문구는 메인 에이전트가 따로 고칩니다.
- 출처 우선순위: 사양, 법령, 표준, 판결 원문, 주장의 원전 도서는 1단계, 기관 보고서는 2단계, 교재는 3단계입니다.
- 리서치 보고는 장 `notes.md` 끝에 `## 리서치 보고 (YYYY-MM-DD)` 절로 붙입니다.
- `docs/volatile.yml`의 `checked_at`은 researcher가 쓰지 않고, 저자 승인 뒤 메인 에이전트가 요약표의 확인일로 채웁니다.
- `accessed` 기본값은 설계서 대조일 `2026-10-12`이고, 2권 ✅ 키에는 "설계서 2권 12장: 검색 결과로 대조, 원문 재확인 권장" `note`를 자동으로 붙입니다.

### 서지 마스터 분리

- 새 파일 `docs/references-master.yml`(최상위 키 `entries`, 키 알파벳 순서)에 출처마다 서지와 대조 상태를 한 번만 적습니다. 필드 18개: key, kind, tier, title, authors, year, url, accessed, check, status, verified_by, verified_at과 조건 필드 venue, id, published, version, refresh, note. 빈 골격(`entries: []`)과 서식 머리 주석으로 만들었습니다.
- 장 파일 `vol*/chNN/references.yml`에는 `key`, `claims`(필수), 장 전용 `note`만 둡니다. `crosscheck`는 숫자 단위라 `claims` 하위 필드로 옮겼고, `claims.locator`에 `"확인 못 함"` 값을 두었습니다.

| 파일 | 바뀐 점 |
|---|---|
| `references/references-schema.md` | 두 파일 역할, 서지 마스터 필드 표, 장 파일 필드 표로 나눔. 예시를 vaswani2017, he2016, alammar2018, black2024pi0, gxo-digit-2025의 마스터 항목과 장 항목으로 다시 씀. 서식 점검 명령(9장)이 서지 마스터와 장 파일을 함께 읽고, 장 키의 마스터 존재, 장 파일의 서지 필드 중복, 마스터 키 순서, 확인자 칸, `tier: 4` 숫자의 `claims.crosscheck`를 봄 |
| `references/research-report.md` | 키 대조 명령(7장)을 python으로 바꾸고 빠짐, 추가, 마스터 없음, 미사용, 순서 다섯 가지를 출력. 요약 수치와 사람 확인 요청 순서에 `locator: "확인 못 함"` 줄 추가 |
| `SKILL.md` | 3단계를 "서지 마스터와 장 파일 쓰기"로, 5단계 점검 항목, 출력 파일 표, 하지 않는 일 2줄(장 파일에 서지 복사, 남의 장 키 지우기) |
| `references/sources-and-verification.md` | tier 대응 규칙을 확정 문장으로, `crosscheck` 위치 |
| `references/refresh-proposal.md` | `refresh` 묶음은 서지 마스터에, `checked_at`은 메인 에이전트 |
| `evals/` | 세 사례 기대 결과와 evals.json 판정을 서지 마스터 기준으로 고침(Y5 추가, 판정 62개). 실행 전 `outputs/docs/`에 서지 마스터 복사, 체크섬에 서지 마스터 포함 |

### 시험한 것

- 서식 점검: 빈 서지 마스터 단독, 빈 서지 마스터와 저장소 장 파일 전체에서 `OK`. 7장 예시로 만든 표본(마스터 5항목, 장 파일 3개)에서 `OK`. 일부러 망친 표본에서 PDF 주소, 금지 기호, 키 순서, 확인자 없는 verified, 서지 필드 중복, 마스터 없음, 자리 표시, crosscheck 빠짐을 모두 잡음.
- 키 대조: 세 권 모든 장의 설계서 "출처 키" 줄을 읽음(2권, 3권 0장 "없음"은 0개로). 표본에서 빠짐, 마스터 없음, 미사용, 순서 다름을 잡음.
- 평가 사례는 아직 돌리지 않았습니다(3.8절).

## 2026-10-15 첫 초안

tasks.md 3.5절 보조 스킬 `researching-chapter`의 첫 초안입니다. researcher 에이전트(CLAUDE.md 13장)가 장 집필 사이클 ①(tasks.md 6장)에서 쓰는 절차를 담았습니다.

| 파일 | 내용 |
|---|---|
| `SKILL.md` | 0~6단계 절차(작업 판정, 수집 목록, 찾기와 대조, references.yml, 🔄 재확인, 점검, 보고), 단계별 reference 표, 출력 파일, 하지 않는 일 9가지 |
| `references/sources-and-verification.md` | 출처 우선순위 tier 1~4, 수집 목록 만드는 법, 종류별 존재 대조 표, 숫자 내용 대조, 언론 숫자 교차 확인, 판정이 갈릴 때, 기록하지 않는 것, 접근 실패 처리 |
| `references/references-schema.md` | references.yml 필드 20개, kind 9종과 tier, check 3값, status 2값, 설계서 ✅/◐/⚠ 대응표, 키 이름 규칙, 채운 예시 5개, 서식 점검 명령 |
| `references/refresh-proposal.md` | 🔄 대상 행 고르기, 재확인 절차, 판정 4종, 요약표와 제안 카드 서식, 승인 뒤 바뀌는 곳 |
| `references/research-report.md` | notes.md 리서치 보고 서식 9개 절, 키 대조 명령, 응답 요약 다섯 줄 |
| `evals/` | 사례 3건(1권 4장 리서치, 2권 7장 🔄 재확인, 3권 12장 사례 수치), 판정 61개(evals.json), README와 판정 명령 |

### 이번 초안에서 정한 기본값 (위 항목에서 확정)

- 설계서 상태 기호 ✅/◐/⚠는 `check` 필드(matched, unchecked, secondary)로 받고, `status`는 사람 확인 문턱(unverified, verified)으로만 씁니다. tasks.md 4.4절 문구("상태를 `status` 필드로")와 표현이 다릅니다.
- 출처 우선순위 4단계에 사양, 법령, 표준, 판결 원문을 tier 1로, 기관 보고서를 tier 2로 넣었습니다. CLAUDE.md 8장 목록에 없는 종류를 해석한 것입니다.
- 리서치 보고는 장 `notes.md` 끝에 `## 리서치 보고 (날짜)` 절로 붙입니다.
- 서식 점검은 저장소 `.venv`의 PyYAML을 쓰는 인라인 명령으로 둡니다. 정식 스크립트는 tasks.md 3.7절 몫입니다.

### 시험하지 않은 것

- 평가 사례는 아직 돌리지 않았습니다(3.8절). 점검 명령 두 개(서식 점검, 키 대조)는 `references-schema.md` 6장 예시와 1권 4장, 3권 7장 설계서로 동작을 확인했습니다.
