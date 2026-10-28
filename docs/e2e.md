# E2E, 시각 회귀, 접근성 검사

Playwright 설정은 `playwright.config.ts`. 모두 dev 서버(`pnpm dev`)로 돈다. 빌드 산출물은 쓰지 않는다.

| 명령 | 내용 | 프로젝트 |
| --- | --- | --- |
| `pnpm test:e2e` | 기능 E2E와 axe 검사. 디자인 랩이 꺼져 있으면 갤러리, PoC 검사는 건너뛴다 | mobile 390px, desktop 1280px |
| `pnpm test:e2e:a11y` | axe 검사만, 디자인 랩을 켜고 (T2.17) | mobile, desktop |
| `pnpm test:e2e:visual` | 컴포넌트 갤러리 섹션별 스냅샷 (T2.16) | visual-mobile, visual-desktop |

## 이미 떠 있는 dev 서버 쓰기

Next dev는 한 폴더에서 하나만 뜬다. 다른 포트에 dev 서버가 있으면 주소를 넘긴다.
디자인 랩 검사는 그 서버가 `NEXT_PUBLIC_DESIGN_LAB=true`로 떠 있어야 한다.

```bash
PLAYWRIGHT_BASE_URL=http://localhost:3100 pnpm test:e2e:visual
```

## 시각 회귀 (T2.16)

- 기준 페이지: `/design-lab/components?theme=<light|dark>&motion=reduce&static=1`. 섹션 `[data-gallery-section]` 12개 x 라이트, 다크 x 390px, 1280px = 48장.
- 기준 이미지: `e2e/__screenshots__/gallery.spec.ts/<프로젝트>/<테마>-<섹션>-darwin.png`. 약 2MB.
- 허용 오차: 픽셀 비율 0.2%, 색 차 임계 0.15. 레이아웃과 색 변화는 잡고 안티앨리어싱만 넘긴다.
- Next dev 인디케이터는 `e2e/visual/screenshot.css`로 스냅샷에서만 숨긴다.

의도한 변경으로 화면이 바뀌었으면 기준을 갱신하고, 바뀐 PNG를 눈으로 확인한 뒤 같은 커밋에 넣는다.

```bash
pnpm test:e2e:visual --update-snapshots
# 실패 시 비교 이미지(기대, 실제, 차이)는 test-results/에, 보고서는 npx playwright show-report
```

플랫폼 주의: 글꼴 래스터화가 OS마다 달라 기준 이미지 이름에 플랫폼(`-darwin`)이 붙는다. 지금은 macOS 기준만 있다.
linux CI에 붙일 때는 같은 Playwright 버전의 공식 컨테이너(`mcr.microsoft.com/playwright`)에서 `--update-snapshots`로
`-linux` 기준을 따로 만들어 함께 커밋한다.

## 접근성 (T2.17)

- 헬퍼 `e2e/helpers/axe.ts`의 `expectNoA11yViolations(page)`. 태그는 WCAG 2.1 A, AA와 best-practice, 위반 0을 기대한다.
- 대상: 갤러리(라이트, 다크), 앱 탭 4개, 404(셸 안, 셸 밖), PoC 목록. 새 화면을 만들면 `e2e/a11y.spec.ts`에 경로를 더한다.
- 위반이 나오면 컴포넌트를 고친다. 끄는 규칙은 `disableRules`에 이유 주석과 함께 최소한으로만 둔다.
- axe가 판정하지 못한 대비(incomplete)는 실패로 보지 않는다. 토큰 대비는 `pnpm contrast`가 따로 검증한다.
