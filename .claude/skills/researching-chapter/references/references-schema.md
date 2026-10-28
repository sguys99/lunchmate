# 출처 파일 서식 (references-schema)

출처는 두 층으로 적습니다. 서지(제목, 저자, 연도, 주소, 대조 상태)는 시리즈 전체에서 한 번만 `docs/references-master.yml`(서지 마스터)에 적고, 장 폴더의 `vol*/chNN/references.yml`(장 파일)에는 키와 "이 장이 이 출처로 무엇을 받치는지"(`claims`)만 적습니다. 이 문서가 두 파일의 유일한 서식입니다.

원고의 `[@key]`(writing-chapter `box-markup.md` 6장)와 그림의 `source.refs`(`docs/style-guide.md` 8.6절)는 장 파일의 `key`를 가리키고, 빌드는 장 파일의 키로 서지 마스터에서 서지를 찾아 각주 번호와 장 끝 참고 자료 목록을 만듭니다(계획서 11장).

## 목차

1. 두 파일의 역할
2. 서지 마스터 필드 표
3. 장 파일 필드 표
4. 값 목록: kind, tier, check, status
5. 설계서 상태 기호와의 대응
6. 키 이름 규칙
7. 채운 예시
8. 여러 장이 같은 키를 쓸 때
9. 저장 전 점검 명령

---

## 1. 두 파일의 역할

| | 서지 마스터 | 장 파일 |
|---|---|---|
| 경로 | `docs/references-master.yml` | `vol*/chNN/references.yml` |
| 최상위 키 | `entries` | `references` |
| 한 항목 | 출처 하나의 서지와 대조 상태 | 이 장이 인용하는 키 하나와 인용 내용 |
| 같은 키 | 파일 전체에서 한 번만 | 장마다 한 번씩 나올 수 있음 |
| 항목 순서 | 키의 알파벳 순서 | 원고에 처음 인용되는 순서. 원고가 없으면 설계서 "출처 키" 줄 순서 |
| `status` | 여기에만 있음 | 없음 |

서지를 한 곳에만 두는 이유는 같은 키가 여러 장, 여러 권에 나오기 때문입니다(예: `wu2016gnmt`는 1권 1장과 3장, `anthropic2024agents`는 2권 1, 6, 12장). 장 파일마다 서지를 복사하면 한 곳을 고칠 때 다른 곳이 어긋나고, 사람 확인(`status: verified`)도 장마다 따로 해야 합니다.

### 1.1 서지 마스터 꼴

```yaml
# 시리즈 출처 서지 마스터. 형식은 .claude/skills/researching-chapter/references/references-schema.md를 따른다.
# 에이전트가 추가한 항목은 status: unverified로 둔다. verified는 사람만 채운다.
entries:
  - key: he2016
    ...
  - key: vaswani2017
    ...
```

- 머리 주석은 지우지 않습니다. 비어 있을 때는 `entries: []`입니다.
- 항목은 키의 알파벳 순서로 둡니다. 새 항목은 자리를 찾아 끼워 넣어요. 점검 명령이 순서를 확인합니다.
- 서지 마스터는 여러 장의 리서치가 함께 쓰는 파일입니다. 한 번에 한 작업만 고치고, 고칠 때는 자기 작업의 키 항목만 건드립니다.

### 1.2 장 파일 꼴

```yaml
# 1권 4장 출처. 형식과 status 규칙은 CLAUDE.md 8장을 따른다.
# 에이전트가 추가한 항목은 status: unverified로 둔다.
references:
  - key: vaswani2017
    claims:
      - ...
  - key: alammar2018
    claims:
      - ...
```

- 저장소 골격이 만든 머리 주석 두 줄은 지우지 않습니다. 둘째 줄의 `status`는 서지 마스터의 같은 키 항목을 가리킨다고 읽습니다.
- 장 파일에는 서지 필드(2장 표의 `key` 밖 모든 필드)를 쓰지 않습니다. 점검 명령이 "서지 필드 중복"으로 잡아요.

### 1.3 두 파일 공통

- 글자는 UTF-8이고 들여쓰기는 빈칸 2칸입니다.
- 문자열에 콜론, 따옴표, `#`, `[`가 들어가면 큰따옴표로 감쌉니다. 제목은 늘 큰따옴표로 감싸면 실수가 줄어요.

## 2. 서지 마스터 필드 표

필드는 18개입니다. "필수"는 모든 항목에 있어야 하고, "조건"은 해당할 때만 씁니다. 해당하지 않는 조건 필드는 아예 쓰지 않습니다(`null`로 채우지 않음). 단 `verified_by`, `verified_at`은 사람이 채울 자리라서 `null`로 둡니다.

| # | 필드 | 필수 | 값 | 설명 |
|---|---|---|---|---|
| 1 | `key` | 필수 | 문자열 | 설계서 출처 마스터 목록의 키 그대로. 새 키는 6장 규칙 |
| 2 | `kind` | 필수 | 4장 목록 | 자료의 종류 |
| 3 | `tier` | 필수 | 1~4 | 출처 우선순위 단계(4.1절). `kind`에서 정해지지만 도서처럼 판단이 필요한 경우가 있어 따로 적습니다 |
| 4 | `title` | 필수 | 문자열 | 원문 제목 그대로. 번역하지 않음. 원문에 줄표나 중간점이 있어도 그대로 둡니다(금지 기호 규칙의 예외) |
| 5 | `authors` | 필수 | 목록 | 저자. 4명 이상이면 첫 저자와 `et al.` 두 칸. 기관 발표는 기관명 한 칸(`[OpenAI]`) |
| 6 | `year` | 필수 | 정수 | 인용 연도. 학회판이 있으면 학회 연도, arXiv 초판 연도가 다르면 `note`에 적음 |
| 7 | `url` | 필수 | 문자열 | 실제로 연 정식 주소. arXiv는 초록 페이지(`/abs/`), PDF 주소는 쓰지 않음 |
| 8 | `accessed` | 필수 | `YYYY-MM-DD` | 에이전트가 원문을 마지막으로 열어 대조한 날. 계획서 11장 인용 형식의 "접근일". 기본값은 5장 |
| 9 | `check` | 필수 | 4.2절 목록 | 에이전트 대조 수준. 설계서의 ✅/◐/⚠를 받는 칸 |
| 10 | `status` | 필수 | `unverified`, `verified` | 사람 확인 여부. 에이전트는 늘 `unverified` |
| 11 | `verified_by` | 필수 | `null` 또는 이름 | 사람이 확인한 뒤 사람이 채움 |
| 12 | `verified_at` | 필수 | `null` 또는 `YYYY-MM-DD` | 위와 같음 |
| 13 | `venue` | 조건 | 문자열 | 학회, 저널, 출판사, 발행 기관. arXiv만 있으면 쓰지 않음 |
| 14 | `id` | 조건 | 문자열 | 영구 식별자. `arXiv:1706.03762`, `doi:10.1038/323533a0`, 법령 번호, 규정 번호 |
| 15 | `published` | 조건 | `YYYY-MM-DD` 또는 `YYYY-MM` | 블로그, 보도자료, 공식 발표, 사양처럼 날짜가 사실의 일부인 자료. 페이지에 날짜가 없으면 쓰지 않고 `note`에 "게시일 미표기" |
| 16 | `version` | 조건 | 문자열 | 대조한 판. arXiv `v4 (2026-01)`, 사양 `2026-07-28`, 법령 개정일 |
| 17 | `refresh` | 조건 | 묶음 | 🔄 관리표 항목을 받치는 출처(2.1절) |
| 18 | `note` | 조건 | 문자열 | 서지에 관한 주의. 대조 방법, 제목 변경, 연도 차이, 접근 제한. 장마다 다른 주의는 장 파일 `note`에 |

### 2.1 `refresh` 묶음

`figures.yml`의 `refresh`와 같은 꼴입니다(`docs/style-guide.md` 8.6절). 관리표 행은 출처의 성질이라 서지 마스터에 둡니다.

```yaml
refresh:
  as_of: "2026-10"                                  # 관리표 기준 시점(월)
  ledger: "vol2 10장 / 7.3 MCP 사양"                 # 권, 관리표 장, 위치, 항목
  recheck: "modelcontextprotocol.io 사양과 공식 블로그"  # 관리표 "확인 기준" 칸 그대로
```

- `as_of`는 관리표 값의 기준 시점입니다. 에이전트가 더 새로운 정보를 찾아도 이 값을 바꾸지 않고 갱신 제안(`refresh-proposal.md`)을 냅니다. 승인 뒤 관리표와 함께 바뀌어요.
- 한 출처가 관리표 두 행을 받치면 `ledger`에 두 행을 `; `로 이어 적습니다.
- 1권 관리표는 설계서 9장, 2권과 3권은 10장입니다.

## 3. 장 파일 필드 표

| 필드 | 필수 | 값 | 설명 |
|---|---|---|---|
| `key` | 필수 | 문자열 | 서지 마스터에 있는 키. 없으면 점검 명령이 "마스터에 없음"으로 잡음 |
| `claims` | 필수 | 목록(1개 이상) | 이 장이 이 출처로 받치는 사실과 수치, 쓰일 절(3.1절) |
| `note` | 조건 | 문자열 | 이 장에만 해당하는 주의. 예: "이 장에서는 더 읽을거리로만 씀", "그림 1-4-6 원문 그림 번호 미확인" |

`claims`를 필수로 두는 이유는 장 파일이 "이 장이 왜 이 출처를 부르는가"를 적는 곳이기 때문입니다. 더 읽을거리로만 쓰는 출처도 `where: "더 읽을거리"` 한 줄을 둡니다.

### 3.1 `claims` 묶음

원고나 정본이 이 출처에서 가져가는 사실 하나가 한 줄입니다. writer와 reviewer가 원문을 다시 찾지 않고 대조할 수 있게 하려는 칸이에요.

| 하위 필드 | 필수 | 설명 |
|---|---|---|
| `where` | 필수 | 쓰일 자리. 절 번호(`"4.1"`), 박스(`"12.3 사례"`), 정본 ID(`"N7-3"`), 그림 ID(`"1-4-6"`), `"더 읽을거리"` |
| `what` | 필수 | 받치는 사실을 한 문장으로. 우리말 습니다체, 금지 기호 규칙 적용 |
| `locator` | 필수 | 원문 안 위치. 절, 쪽, 표, 그림 번호(`"3.2.1절, 그림 2"`). 원문에서 위치를 찾지 못했으면 `"확인 못 함"`. 더 읽을거리는 `"전체"` |
| `value` | 조건 | 숫자를 쓰면 원문 숫자와 단위 그대로(`"73 ms"`) |
| `conditions` | 조건 | 숫자의 조건. 하드웨어, 설정, 시도 수, 일반화 칸, 재생 속도, 원격 조작 여부 중 원문에 있는 것. 원문에 없으면 `"공개되지 않음"` |
| `crosscheck` | 조건 | 이 숫자를 교차 확인한 다른 키나 주소의 목록. 서지 마스터에서 이 키가 `tier: 4`이고 `value`가 있으면 필수 |

- 성능 수치는 CLAUDE.md 8장의 "○○ 조건에서 ○회 중 ○회 성공했다고 보고됐다" 꼴로 옮길 수 있을 만큼 `conditions`를 채웁니다.
- 원문 그림을 참고해 다시 그릴 예정이면 `where`에 그림 ID, `locator`에 원문 그림 번호를 씁니다. 캡션의 "○○ 논문 그림 n을 참고하여 재구성"이 이 값을 씁니다.
- 직접 인용문은 옮기지 않습니다. `what`은 저자의 말로 풀어 쓴 요지입니다.
- `locator: "확인 못 함"`인 줄은 보고서 사람 확인 요청에 올립니다. 위치를 지어내지 않아요.

## 4. 값 목록

### 4.1 `kind`와 `tier`

출처 우선순위(CLAUDE.md 8장, 계획서 11장)를 종류별로 풀었습니다. 사양, 법령, 표준, 판결 원문, 주장의 원전 도서는 1단계, 기관 보고서는 2단계, 교재는 3단계로 둡니다. 판단 근거는 `sources-and-verification.md` 1장에 있어요.

| `kind` | 뜻 | 기본 `tier` | 예(설계서 키) |
|---|---|---|---|
| `paper` | 학회, 저널 논문, arXiv 원고, 기술 보고서 | 1 | vaswani2017, deepseek2024v3 |
| `spec` | 기술 사양 원문 | 1 | mcp-spec, a2a-spec |
| `law` | 법령, 규정, 판결 원문 | 1 | kr-ai-basic-act-2025, eu-ai-act-2024, moffatt2024 |
| `standard` | 표준 문서와 표준 기구의 공식 페이지 | 1 | iso25785-1 |
| `book` | 단행본. 주장의 원전이면 1, 교재나 개설서면 3 | 1 또는 3 | moravec1988(1), thrun2005(3) |
| `official` | 개발사, 발행 주체의 공식 블로그, 문서, 보도자료, 모델 카드, 데이터시트, 가격 페이지, 저장소 | 2 | openai2024o1, figure2025helix, nvidia-h100-spec |
| `report` | 기관 보고서와 그 기관의 보도자료(시장 전망, 설문) | 2 | goldman2024humanoid, gartner2025 |
| `explainer` | 저명한 해설(강의, 해설 블로그, 교재가 아닌 해설서) | 3 | alammar2018, weng2023agents |
| `press` | 언론 보도, 2차 해설, 로펌 뉴스레터, 업계 매체 | 4 | gxo-digit-2025(보도 확인 단계) |

- 같은 사실에 더 높은 단계의 출처가 있으면 그것을 씁니다. `tier: 4`는 상위 출처가 그 사실을 다루지 않을 때만 남깁니다.
- 발행 주체가 자기 성과를 말하는 `official`, `report`의 숫자는 "○○ 발표 기준"으로만 쓸 수 있는 값이라 장 파일 `claims.conditions`에 그렇게 적습니다.

### 4.2 `check`: 에이전트 대조 수준

`check`는 설계서 상태 기호 ✅/◐/⚠를 받는 칸입니다. 서지 마스터에만 있어요.

| 값 | 뜻 | 설계서 기호 |
|---|---|---|
| `matched` | 원문 페이지(또는 공식 색인)를 직접 열어 식별자, 제목, 저자, 연도를 대조함 | ✅ |
| `unchecked` | 아직 원문을 대조하지 못함. 설계서에서 옮긴 그대로이거나, 검색 결과 요약만 봄 | ◐ |
| `secondary` | 2차 자료(보도, 해설)로만 확인. 원문을 찾지 못했거나 열 수 없음 | ⚠ |

- `check`는 서지의 대조 수준입니다. 장 파일 `claims`의 내용은 `locator`로 확인 여부를 드러냅니다(원문 위치가 적혀 있으면 확인함, `"확인 못 함"`이면 못 함).
- 존재 자체를 확인하지 못한 자료는 `unchecked`로도 적지 않습니다. 두 파일 어디에도 넣지 않고 보고서의 "찾지 못함"으로 보냅니다(`research-report.md` 5장).

### 4.3 `status`: 사람 확인

`status`는 사람 확인 문턱(CLAUDE.md 8장)만 나타냅니다. 설계서 상태 기호는 `status`로 옮기지 않습니다.

| 값 | 누가 | 뜻 |
|---|---|---|
| `unverified` | 에이전트 | 에이전트가 넣거나 고친 모든 항목. `check: matched`여도 같음 |
| `verified` | 사람만 | 저자나 사람 검토자가 원문을 확인함. `verified_by`, `verified_at`을 함께 채움 |

- 에이전트는 `verified`로 올리지 않고, 이미 `verified`인 항목의 서지 필드를 바꾸지도 않습니다. 바꿔야 하면 보고서에 제안으로 적어요. 사람이 확인한 내용을 에이전트가 덮으면 확인의 의미가 사라지기 때문입니다.
- writing-chapter의 자가 점검 G2는 `status: unverified`를 셉니다. 이 값이 서지 마스터에만 있으므로, 장 확인 상태는 9장 `check_references.py` 출력의 REF-I01(status 집계) 줄로 봅니다. 값의 철자는 정확히 `unverified`여야 합니다.

## 5. 설계서 상태 기호와의 대응

설계서 출처 마스터 목록의 ✅/◐/⚠는 서지 마스터의 `check`로 옮기고, `status`는 모두 `unverified`로 둡니다.

| 설계서 상태 | `check` | `status` | `accessed` |
|---|---|---|---|
| ✅ | `matched` | `unverified` | 설계서 대조일 `2026-10-12`. 장 리서치에서 다시 열면 그날로 바꿈 |
| ◐ | `unchecked` | `unverified` | 장 리서치에서 처음 연 날. 아직 안 열었으면 초기화한 날 |
| ⚠ | `secondary` | `unverified` | 2차 자료를 연 날 |
| ◐ 🔄, ⚠ 🔄 | 위와 같음 | `unverified` | 위와 같고 `refresh` 묶음을 채움 |

- 설계서 상태 칸에 붙은 설명("⚠ 국가법령정보센터 원문 확인 필요")은 서지 마스터 `note`로 옮깁니다.
- 2권 설계서의 ✅는 "검색 결과로 대조"한 것이라 원문 재확인이 권장돼 있습니다(2권 12장 머리말). 2권 ✅ 키를 옮길 때는 `check: matched`, `accessed: "2026-10-12"`에 `note: "설계서 2권 12장: 검색 결과로 대조, 원문 재확인 권장"`을 자동으로 붙이고, 장 리서치에서 원문을 열면 이 문장을 지우고 `accessed`를 그날로 바꿉니다. 점검 명령이 2권 ✅ 기본값에 이 `note`가 빠졌는지 보지는 못하므로 눈으로 확인합니다.

## 6. 키 이름 규칙

- 설계서 출처 마스터 목록(1권 12장, 2권 12장, 3권 12장)에 있는 키는 철자 그대로 씁니다. 앞 권에서 정의한 키는 앞 권 이름 그대로 씁니다(예: 2권 4장의 `liu2023lost`).
- 목록에 없는 출처가 필요하면 아래 꼴로 새 키를 짓고, 보고서의 "새 키 제안"에 올립니다. 서지 마스터에는 넣되 설계서 목록에는 직접 넣지 않아요.

| 출처 | 꼴 | 설계서 선례 |
|---|---|---|
| 논문 | 첫 저자 성 소문자 + 연도 + 필요하면 짧은 구분어 | vaswani2017, wei2022cot, edge2024graphrag |
| 기관, 회사 발표 | 기관명 + 연도 + 주제어 | openai2024o1, anthropic2024contextual, goldman2024humanoid |
| 사양, 법령, 표준, 데이터시트, 사례 | 낱말을 하이픈으로 이음, 연도는 끝에 | mcp-spec, kr-ai-basic-act-2025, nvidia-h100-spec, gxo-agility-2024 |

- 영문 소문자, 숫자, 하이픈만 씁니다. 원고 인용 정규식 `@[A-Za-z0-9_-]*`(writing-chapter `box-markup.md` 6장)에 걸려야 하기 때문입니다.
- 이미 있는 키와 겹치면 구분어를 붙입니다(`mikolov2013a`, `mikolov2013b` 선례). 새 키를 짓기 전에 서지 마스터에서 같은 출처가 다른 키로 있는지 먼저 찾습니다.

## 7. 채운 예시

아래 예시는 설계서 출처 마스터 목록의 행을 옮긴 것입니다. `claims`의 위치와 값은 설계서에 적힌 범위만 썼고, 원문에서 확인하지 않은 위치는 `"확인 못 함"`으로 두었습니다. 실제 장 리서치에서 원문을 열어 채워요. 예시의 `accessed`는 서식 시연용입니다.

### 7.1 서지 마스터 항목

논문, 설계서 ✅(1권 12.2절)

```yaml
  - key: vaswani2017
    kind: paper
    tier: 1
    title: "Attention Is All You Need"
    authors: [Vaswani, et al.]
    venue: "NeurIPS"
    year: 2017
    id: "arXiv:1706.03762"
    url: "https://arxiv.org/abs/1706.03762"
    accessed: "2026-10-12"
    check: matched
    status: unverified
    verified_by: null
    verified_at: null
```

학회판과 arXiv 연도가 다른 논문

```yaml
  - key: he2016
    kind: paper
    tier: 1
    title: "Deep Residual Learning for Image Recognition"
    authors: [He, et al.]
    venue: "CVPR"
    year: 2016
    id: "arXiv:1512.03385"
    url: "https://arxiv.org/abs/1512.03385"
    accessed: "2026-10-12"
    check: matched
    status: unverified
    verified_by: null
    verified_at: null
    note: "arXiv 초판 2015, 학회판 2016. 인용 연도는 학회판을 따름(설계서 1권 11.2절)."
```

해설 자료, 설계서 ◐

```yaml
  - key: alammar2018
    kind: explainer
    tier: 3
    title: "The Illustrated Transformer"
    authors: [Jay Alammar]
    year: 2018
    url: "https://jalammar.github.io/illustrated-transformer/"
    accessed: "2026-10-15"
    check: unchecked
    status: unverified
    verified_by: null
    verified_at: null
    note: "설계서 1권 11.2절 ◐. 게시 연도는 키 이름에서 온 값이라 페이지에서 확인 필요. 해설 자료라 숫자의 근거로 쓰지 않음."
```

숫자를 받치는 논문과 🔄(3권)

```yaml
  - key: black2024pi0
    kind: paper
    tier: 1
    title: "π0: A Vision-Language-Action Flow Model for General Robot Control"
    authors: [Black, et al.]
    year: 2024
    id: "arXiv:2410.24164"
    version: "v4 (2026-01)"
    url: "https://arxiv.org/abs/2410.24164"
    accessed: "2026-10-12"
    check: matched
    status: unverified
    verified_by: null
    verified_at: null
    refresh:
      as_of: "2026-10"
      ledger: "vol3 10장 / 7.3, 8.3 π 계열"
      recheck: "arXiv 원문, Physical Intelligence 공식 블로그"
```

보도로만 확인한 출처(3권)

```yaml
  - key: gxo-digit-2025
    kind: press
    tier: 4
    title: "(보도 원문 제목 그대로)"
    authors: ["(매체명)"]
    year: 2025
    published: "2025-11"
    url: "(실제로 연 보도 주소)"
    accessed: "2026-10-15"
    check: secondary
    status: unverified
    verified_by: null
    verified_at: null
    refresh:
      as_of: "2026-10"
      ledger: "vol3 10장 / 12.3, 12.5 배치 사례"
      recheck: "회사 공식 발표"
    note: "회사 원문을 찾으면 kind: official로 바꾸고 이 보도는 claims.crosscheck로 내림."
```

괄호로 적은 값은 실제 리서치에서 원문을 열어 채울 자리입니다. 실제 파일에는 괄호 자리 표시를 남기지 않아요. 채울 수 없으면 그 항목은 넣지 않고 "찾지 못함"으로 보고합니다.

### 7.2 장 파일 항목

1권 4장(`vol1-llm/ch04/references.yml`)

```yaml
references:
  - key: vaswani2017
    claims:
      - where: "4.1"
        what: "2017년 논문이 순환 구조 없이 어텐션만으로 번역 모델을 만들었습니다."
        locator: "초록"
      - where: "1-4-6"
        what: "블록 구조 그림을 다시 그릴 때 참고하는 원 논문 그림입니다. 원 논문은 인코더-디코더 구조입니다."
        locator: "확인 못 함"
    note: "그림 1-4-6의 원문 그림 번호는 장 리서치에서 확인."
  - key: alammar2018
    claims:
      - where: "더 읽을거리"
        what: "트랜스포머 구조를 그림으로 풀어 쓴 해설입니다."
        locator: "전체"
  - key: he2016
    claims:
      - where: "4.5"
        what: "잔차 연결로 깊은 신경망을 학습시켰습니다."
        locator: "확인 못 함"
```

3권 7장, 숫자를 받치는 줄

```yaml
  - key: black2024pi0
    claims:
      - where: "N7-2"
        what: "액션 청크 길이가 50스텝입니다."
        locator: "확인 못 함"
        value: "50"
      - where: "N7-3"
        what: "로봇 탑재 추론 시간이 약 73 ms로 보고됐습니다."
        locator: "확인 못 함"
        value: "73 ms"
        conditions: "RTX 4090 기준(설계서 3권 7장 정본 N7-3)"
```

3권 12장, 보도 숫자와 교차 확인

```yaml
  - key: gxo-digit-2025
    claims:
      - where: "12.3 사례"
        what: "물류센터 휴머노이드가 상자 10만 개 이상을 옮겼다고 보도됐습니다."
        locator: "본문 둘째 문단"
        value: "10만 개 이상"
        conditions: "회사 발표를 인용한 보도. 기간, 대수, 작업 조건은 공개되지 않음"
        crosscheck: ["(같은 수치를 실은 다른 매체 주소 또는 회사 발표 키)"]
```

## 8. 여러 장이 같은 키를 쓸 때

- 서지 마스터 항목은 하나뿐이고, 각 장 파일에 `key`와 그 장의 `claims`만 둡니다. 서지를 고치면 모든 장에 함께 반영됩니다.
- 앞 권 키를 뒤 권 장에서 쓸 때도 장 파일에 키와 `claims`만 넣습니다. 서지 마스터 항목이 `status: verified`이면 그대로 둡니다. 사람이 확인한 대상은 같은 서지이기 때문이에요.
- 어느 장이 그 키를 쓰는지 찾기: `grep -l "key: wu2016gnmt" vol*/ch*/references.yml`.
- 한 장에서 키를 빼서 어느 장도 쓰지 않게 되면 키 대조 명령이 "미사용"으로 알려 줍니다. 그 항목을 지울지는 보고서에 적어 메인 에이전트에게 넘깁니다. `status: verified`인 항목은 지우지 않습니다.

## 9. 저장 전 점검 명령

서지 마스터와 장 파일을 저장하기 전에 `scripts/check_references.py`로 점검합니다. 저장소 루트에서 돌리고, 파이썬은 PyYAML이 있는 `.venv/bin/python`을 씁니다. 출력 마지막 요약 줄 끝이 `OK`이고 종료 코드가 0이면 통과예요(경고와 정보만 있어도 0, 오류가 있으면 1, YAML 읽기 실패 같은 입력 문제는 2).

```bash
.venv/bin/python scripts/check_references.py vol1-llm/ch04      # 장 하나: 서지 마스터 + 장 파일 + 원고 [@key] + 설계서 출처 키 줄
.venv/bin/python scripts/check_references.py --master-only      # 서지 마스터 서식만
.venv/bin/python scripts/check_references.py                    # 전체: 모든 장 + 어느 장도 쓰지 않는 마스터 항목(REF-X01)
.venv/bin/python scripts/check_references.py vol1-llm --quiet   # 권 하나, 정보(REF-I) 줄 숨김
```

출력은 `경로:줄: [규칙ID] 메시지` 한 줄씩입니다. 규칙 ID 묶음은 아래와 같고, 번호별 뜻은 스크립트 머리 docstring이 정본이에요.

| 묶음 | 보는 것 | 심각도 |
|---|---|---|
| REF-M | 서지 마스터: 최상위 키, 필수와 알 수 없는 필드, 키 중복과 글자와 알파벳 순서, kind, tier, check, status 값, 확인자 칸, 날짜 꼴, year 정수, arXiv PDF 주소, 자리 표시, refresh 칸, note 금지 기호 | 오류(M20 `check: secondary`만 경고) |
| REF-C | 장 파일: 최상위 키, 장 안 키 중복, 마스터에 없는 키, 서지 필드 중복, 알 수 없는 필드, claims 하위 필드, 금지 기호, locator 자리 표시, tier 4 숫자의 crosscheck | 오류(C13 장 파일 없음만 경고) |
| REF-B | 원고 인용: 본문 `[@key]`가 장 파일에 없음(B01), 장 파일 키를 본문과 그림 어디서도 쓰지 않음(B02, 인용이 하나도 없으면 건너뜀) | B01 오류, B02 경고 |
| REF-D | 설계서 대조: 빠짐(D01), 추가(D02), 순서(D03), 출처 키 줄 없음(D04). `research-report.md` 7장 표와 같은 뜻 | 경고 |
| REF-X | 미사용: 서지 마스터에 있는데 어느 장 파일도 쓰지 않음. 인자 없이 전체를 돌릴 때만 | 경고 |
| REF-I | 정보: status 집계(I01), 대조 건너뜀 안내(I02) | 정보 |

- `title`과 `authors`는 원문 그대로라 금지 기호 검사에서 뺍니다(writing-chapter `style-rules.md` 3장). `what`, `conditions`, `note`는 우리가 쓴 글이라 검사합니다.
- 잡는 것: 서지 마스터의 필수 필드, 값 목록(`tier`는 정수 1~4만, 문자열 `"1"`은 오류), 키 중복과 순서, 확인자 칸, 날짜 꼴(`accessed`, `verified_at`, `published`는 `YYYY-MM-DD`), `year` 정수, arXiv PDF 주소, 자리 표시, `refresh` 칸. 장 파일의 키가 서지 마스터에 있는지, 장 파일에 서지 필드가 복사돼 있는지(서지 필드 중복), `claims` 하위 필드, `tier: 4` 숫자의 `crosscheck`. 원고 `[@key]`가 장 파일에 있는지.
- 예전 손 명령과 다른 점: 장 파일이 비어 있으면(`references: []`) 설계서 대조(REF-D)를 건너뛰고 REF-I02 정보만 냅니다. 리서치를 시작하기 전 빈 틀에서 "빠짐"이 쏟아지지 않게 하려는 것이에요. "미사용"(REF-X01)은 인자 없이 전체를 돌릴 때만 나옵니다.

스크립트를 못 쓸 때의 예비 명령은 YAML 읽기와 금지 기호만 봅니다. 나머지 규칙은 위 표를 보며 눈으로 대조해요.

```bash
.venv/bin/python -c 'import sys,re,yaml
bad=re.compile("[\u2014\u2015\u2013\u00b7\u318d\u30fb\u2022]")
for f in sys.argv[1:]:
    yaml.safe_load(open(f,encoding="utf-8"))
    for i,l in enumerate(open(f,encoding="utf-8"),1):
        if bad.search(l) and not re.match(r"\s*-?\s*(title|authors):",l): print(f,i,l.strip()[:60])
print("읽기 끝(저자 목록 줄은 원문이라 걸려도 무시)")' docs/references-master.yml vol1-llm/ch04/references.yml
```
