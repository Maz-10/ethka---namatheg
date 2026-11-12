#!/usr/bin/env python3
"""يبني العرض التفاعلي ملفًّا واحدًا مكتفيًا بذاته يعمل بلا إنترنت.

- الشعار يُقرأ من `identity/Logo.tsx` (المصدر الواحد للعلامة) ولا يُعاد رسمه.
- خطّا ثمانية يُقتطعان للعربية واللاتينية الأساسية ويُضمَّنان بصيغة woff2.

    pip install fonttools brotli
    python3 عروض/تفاعلي/build.py
"""
import base64, io, re, sys
from pathlib import Path
from fontTools import subset
from fontTools.ttLib import TTFont

HERE = Path(__file__).resolve().parent
KIT = HERE.parent
SRC = HERE / 'src' / 'index.html'
OUT = HERE / 'إذكاء-اللقاء-التأسيسي.html'

FONTS = [  # (العائلة في CSS، الوزن، الملف)
    ('Thm Serif', 700, 'thmanyahserifdisplay-Bold.otf'),
    ('Thm Serif', 400, 'thmanyahserifdisplay-Regular.otf'),
    ('Thm Sans', 400, 'thmanyahsans-Regular.otf'),
    ('Thm Sans', 700, 'thmanyahsans-Bold.otf'),
]
UNICODES = ('U+0020-007E,U+00A0-00FF,U+0600-06FF,U+0750-077F,U+08A0-08FF,'
            'U+FB50-FDFF,U+FE70-FEFF,U+2000-206F,U+25C6,U+00D7')


def woff2(path: Path) -> str:
    opts = subset.Options()
    opts.flavor = 'woff2'
    opts.layout_features = ['*']
    opts.name_IDs = ['*']
    opts.notdef_outline = True
    font = TTFont(str(path))
    sub = subset.Subsetter(opts)
    sub.populate(unicodes=subset.parse_unicodes(UNICODES))
    sub.subset(font)
    buf = io.BytesIO()
    font.flavor = 'woff2'
    font.save(buf)
    return base64.b64encode(buf.getvalue()).decode()


def logo_paths() -> dict:
    src = (KIT / 'identity' / 'Logo.tsx').read_text(encoding='utf-8')
    out = {}
    for name in ('D_NAME', 'D_NAME_GOLD', 'D_DOTS', 'D_DIAMOND'):
        m = re.search(rf"const {name} = '([^']+)'", src)
        if not m:
            sys.exit(f'تعذّر قراءة {name} من Logo.tsx')
        out[name] = m.group(1)
    return out


def main():
    html = SRC.read_text(encoding='utf-8')
    faces = []
    for fam, wt, file in FONTS:
        data = woff2(KIT / 'fonts' / file)
        faces.append(f"@font-face{{font-family:'{fam}';font-weight:{wt};font-display:block;"
                     f"src:url(data:font/woff2;base64,{data}) format('woff2')}}")
    html = html.replace('/*__FONTS__*/', '\n'.join(faces))
    for name, d in logo_paths().items():
        html = html.replace(f'__{name}__', d)
    left = re.findall(r'__D_[A-Z_]+__', html)
    if left:
        sys.exit(f'بقيت علامات بلا استبدال: {set(left)}')
    OUT.write_text(html, encoding='utf-8')
    print(f'◆ {OUT.name} — {OUT.stat().st_size / 1024:.0f} ك.ب')


if __name__ == '__main__':
    main()
