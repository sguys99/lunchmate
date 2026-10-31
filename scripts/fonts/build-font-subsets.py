"""글꼴 동적 서브셋 생성 (T5.41). 결과물은 리포에 커밋하고, 이 스크립트는 다시 만들 때만 쓴다.

- Pretendard: 공식 배포(pretendard 1.3.9, dist/web/variable/woff2-dynamic-subset)의 unicode-range 조각 woff2를
  그대로 복사한다(글자 모양, 조각 경계 모두 공식 그대로).
- 마루 부리: 기존 KS X 1001 서브셋(Light, Regular)을 Pretendard와 같은 unicode-range 경계로 나눈다.
  경계에 들지 않는 글자(기호, 자모 등)는 마지막 조각 하나로 모은다. 글리프는 바꾸지 않고 고르기만 한다.
- 결과 CSS: src/app/fonts/fonts.css (@font-face + :root 서체 변수)

실행(프로젝트 의존성 아님, Python fonttools + brotli 필요):
  python3 -m venv /tmp/ft && /tmp/ft/bin/pip install fonttools brotli
  /tmp/ft/bin/python scripts/fonts/build-font-subsets.py <pretendard 패키지 경로>
"""
import re
import shutil
import sys
from pathlib import Path

from fontTools import subset
from fontTools.ttLib import TTFont

ROOT = Path(__file__).resolve().parents[2]
FONTS = ROOT / "src/app/fonts"
PKG = Path(sys.argv[1]) if len(sys.argv) > 1 else None


def parse_ranges(text: str):
    """'U+20-22, U+27' -> [(0x20, 0x22), (0x27, 0x27)]"""
    out = []
    for part in text.split(","):
        part = part.strip().removeprefix("U+").removeprefix("u+")
        if not part:
            continue
        a, _, b = part.partition("-")
        out.append((int(a, 16), int(b or a, 16)))
    return out


def to_range_text(cps):
    cps = sorted(cps)
    out, start, prev = [], None, None
    for c in cps:
        if start is None:
            start = prev = c
        elif c == prev + 1:
            prev = c
        else:
            out.append((start, prev))
            start = prev = c
    if start is not None:
        out.append((start, prev))
    return ", ".join(f"U+{a:x}" if a == b else f"U+{a:x}-{b:x}" for a, b in out)


def main():
    if PKG is None:
        sys.exit("pretendard 패키지 경로를 인자로 주세요")
    src_dir = PKG / "dist/web/variable"
    css = (src_dir / "pretendardvariable-dynamic-subset.css").read_text()
    blocks = re.findall(
        r"src: url\(\./woff2-dynamic-subset/(PretendardVariable\.subset\.(\d+)\.woff2)\).*?unicode-range: ([^;]+);",
        css,
        re.S,
    )
    # 1) Pretendard 조각 복사
    pdir = FONTS / "pretendard"
    if pdir.exists():
        shutil.rmtree(pdir)
    pdir.mkdir()
    for fname, _, _ in blocks:
        shutil.copy(src_dir / "woff2-dynamic-subset" / fname, pdir / fname)

    # 2) 마루 부리 조각
    mdir = FONTS / "maruburi"
    if mdir.exists():
        shutil.rmtree(mdir)
    mdir.mkdir()
    weights = {"Light": 300, "Regular": 400}
    groups = []  # (idx, set(cps))
    covered = set()
    sample = TTFont(FONTS / "MaruBuri-Light-KSX1001.woff2")
    cmap = set(sample.getBestCmap().keys())
    for _, idx, rng in blocks:
        cps = set()
        for a, b in parse_ranges(rng):
            cps.update(range(a, b + 1))
        covered |= cps
        hit = cps & cmap
        if hit:
            groups.append((int(idx), hit))
    rest = cmap - covered
    if rest:
        groups.append((len(blocks), rest))

    faces = []
    for name, weight in weights.items():
        srcfile = FONTS / f"MaruBuri-{name}-KSX1001.woff2"
        for idx, cps in groups:
            opts = subset.Options()
            opts.flavor = "woff2"
            opts.layout_features = ["*"]
            opts.name_IDs = ["*"]
            opts.notdef_outline = True
            font = TTFont(srcfile)
            sub = subset.Subsetter(opts)
            sub.populate(unicodes=sorted(cps))
            sub.subset(font)
            out = mdir / f"MaruBuri-{name}.subset.{idx}.woff2"
            font.flavor = "woff2"
            font.save(out)
            faces.append((name, weight, out.name, to_range_text(cps)))

    # 3) CSS
    lines = [
        "/* 생성물: scripts/fonts/build-font-subsets.py (T5.41). 직접 고치지 말고 스크립트를 다시 돌린다. */",
        "/* Pretendard (OFL-1.1, PRETENDARD-OFL-LICENSE.txt), 마루 부리 (OFL-1.1, MARUBURI-OFL-LICENSE.txt) */",
        "/* unicode-range로 나눈 동적 서브셋: 화면에 나온 글자가 든 조각만 받는다. preload 없음, display swap */",
        "",
        ":root {",
        '  --font-pretendard: "Pretendard Variable", "Pretendard Fallback", "Apple SD Gothic Neo", "Malgun Gothic", system-ui, sans-serif;',
        '  --font-maruburi: "MaruBuri", "MaruBuri Fallback", AppleMyungjo, "Noto Serif KR", Batang, serif;',
        "}",
        "",
        "/* 교체 흔들림 줄이기: 이전 next/font adjustFontFallback 값과 같다 */",
        '@font-face { font-family: "Pretendard Fallback"; src: local("Arial"); ascent-override: 93.76%; descent-override: 23.75%; line-gap-override: 0%; size-adjust: 101.55%; }',
        '@font-face { font-family: "MaruBuri Fallback"; src: local("Times New Roman"); ascent-override: 69.74%; descent-override: 17.44%; line-gap-override: 30.08%; size-adjust: 114.71%; }',
        "",
    ]
    for fname, _, rng in blocks:
        lines.append(
            '@font-face { font-family: "Pretendard Variable"; font-style: normal; font-display: swap; font-weight: 45 920; '
            f'src: url("./pretendard/{fname}") format("woff2-variations"); unicode-range: {rng.strip()}; }}'
        )
    lines.append("")
    for name, weight, fname, rng in faces:
        lines.append(
            f'@font-face {{ font-family: "MaruBuri"; font-style: normal; font-display: swap; font-weight: {weight}; '
            f'src: url("./maruburi/{fname}") format("woff2"); unicode-range: {rng}; }}'
        )
    (FONTS / "fonts.css").write_text("\n".join(lines) + "\n")
    print(f"pretendard {len(blocks)} 조각, maruburi {len(groups)} 조각 x {len(weights)} 굵기")


if __name__ == "__main__":
    main()
