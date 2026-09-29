"""Produce the four-character display subset from the pinned local font package.

Build-only dependency: install fonttools[woff] 4.66.0 in your Python environment.
The shipped font retains its SIL OFL license; no system font installation is used.
"""
from pathlib import Path
from fontTools import subset
from fontTools.ttLib import TTFont

source=Path('node_modules/@fontsource/noto-serif-sc/files/noto-serif-sc-chinese-simplified-600-normal.woff2')
target=Path('public/assets/fonts/noto-serif-sc-title-600.woff2')
target.parent.mkdir(parents=True,exist_ok=True)
font=TTFont(source)
options=subset.Options()
subsetter=subset.Subsetter(options=options)
subsetter.populate(text='三体文明')
subsetter.subset(font)
font.flavor='woff2'
font.save(target)
print(f'{target}: {target.stat().st_size} bytes; {sorted(font.getBestCmap())}')
