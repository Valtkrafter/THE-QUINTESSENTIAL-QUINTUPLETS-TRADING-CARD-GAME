"""Generates the signature plates used on SAR / UR cards.

The signatures are invented, original stroke designs (a legible capital followed by a flowing cursive body,
an optional flourish and an underline), not a font and not anybody's real autograph. Each name is drawn
deterministically from a fixed seed, so running this script always reproduces the same plates.

    python tools/generate-signatures.py --out src/cardface/signatureData.ts
    python tools/generate-signatures.py --preview signatures.png     (needs Pillow)

Tune the letter templates or the seeds below, regenerate, and commit the resulting data file.
"""
import argparse
import random

# ---- letter templates -------------------------------------------------------
# Coordinates: x right, y UP. Baseline 0, x-height 1, ascender ~2.2, capitals ~2.7. Smooth (Catmull-Rom) curves
# through the points. The first point of each lowercase template is where the previous letter left the pen.
LOWER = {
 'a': [(0,0),(0.1,0.7),(0.4,1.0),(0.55,0.7),(0.35,0.2),(0.18,0.5),(0.35,0.9),(0.62,0.9),(0.66,0.1),(0.92,0.05)],
 'b': [(0,0),(0.1,1.0),(0.3,2.1),(0.45,2.25),(0.4,1.6),(0.2,0.5),(0.3,0.05),(0.65,0.2),(0.7,0.7),(0.4,0.9),(0.25,0.6),(0.5,0.05),(0.9,0.05)],
 'c': [(0,0.05),(0.15,0.8),(0.45,1.0),(0.5,0.8),(0.3,0.5),(0.2,0.2),(0.4,0.05),(0.72,0.1)],
 'e': [(0,0),(0.2,0.5),(0.5,0.95),(0.6,0.7),(0.35,0.5),(0.2,0.35),(0.3,0.1),(0.55,0.05),(0.82,0.1)],
 'h': [(0,0),(0.1,1.0),(0.3,2.1),(0.45,2.25),(0.4,1.6),(0.2,0.5),(0.22,0.05),(0.35,0.7),(0.55,0.98),(0.72,0.6),(0.74,0.1),(0.97,0.05)],
 'i': [(0,0),(0.1,0.8),(0.18,0.9),(0.28,0.1),(0.52,0.05)],
 'k': [(0,0),(0.1,1.0),(0.3,2.1),(0.45,2.25),(0.4,1.6),(0.2,0.5),(0.22,0.05),(0.3,0.5),(0.55,0.9),(0.35,0.6),(0.5,0.35),(0.7,0.05),(0.97,0.1)],
 'n': [(0,0),(0.15,0.8),(0.3,1.0),(0.42,0.55),(0.42,0.1),(0.5,0.6),(0.7,1.0),(0.88,0.6),(0.9,0.1),(1.12,0.05)],
 'o': [(0,0),(0.12,0.7),(0.35,1.0),(0.55,0.7),(0.4,0.1),(0.2,0.45),(0.45,0.95),(0.85,0.85),(0.97,0.5)],
 'r': [(0,0),(0.12,0.9),(0.28,0.95),(0.4,0.6),(0.45,0.2),(0.5,0.7),(0.75,0.95),(0.97,0.8)],
 's': [(0,0),(0.1,0.5),(0.28,0.95),(0.52,0.85),(0.42,0.55),(0.2,0.38),(0.28,0.05),(0.5,0.08),(0.78,0.1)],
 't': [(0,0),(0.12,0.9),(0.2,1.6),(0.25,1.75),(0.2,1.0),(0.18,0.3),(0.35,0.0),(0.62,0.1)],
 'u': [(0,0),(0.1,0.9),(0.28,0.12),(0.45,0.9),(0.62,0.9),(0.72,0.1),(0.96,0.1)],
}
# extra pen-up strokes attached to a letter: points relative to the letter's entry point
EXTRA = {
 'i': [[(0.06,1.45),(0.2,1.62)]],
 't': [[(-0.12,1.12),(0.3,1.2),(0.66,1.08)]],
}
CAPITAL = {
 'I': [[(0.0,0.3),(0.3,1.3),(0.6,2.4),(0.72,2.85),(0.5,3.0),(0.32,2.75),(0.5,2.0),(0.62,1.0),(0.7,0.3),(0.9,0.0),(1.2,0.1)]],
 'N': [[(0,0),(0.05,1.2),(0.2,2.6),(0.45,1.5),(0.7,0.2),(0.8,1.2),(1.0,2.5),(1.2,1.2),(1.25,0.1),(1.5,0.05)]],
 'M': [[(0,0),(0.05,1.2),(0.2,2.6),(0.4,1.2),(0.5,0.1),(0.6,1.0),(0.75,2.4),(0.95,1.0),(1.05,0.1),(1.15,0.9),(1.3,2.3),(1.55,1.0),(1.6,0.05),(1.85,0.05)]],
 'Y': [[(0.0,2.5),(0.2,1.3),(0.45,0.55),(0.75,1.6),(0.95,2.5),(0.8,1.2),(0.55,-0.2),(0.2,-1.0),(-0.15,-0.9),(0.1,-0.3),(0.6,0.0),(1.0,0.1)]],
 'F': [[(1.05,2.6),(0.6,2.85),(0.3,2.6),(0.22,1.8),(0.18,0.9),(0.15,0.15),(0.25,0.0),(0.55,0.1)], [(-0.1,1.55),(0.4,1.62),(0.85,1.5)]],
 'R': [[(0,0),(0.1,1.3),(0.15,2.6),(0.65,2.75),(0.85,2.2),(0.55,1.6),(0.2,1.5),(0.6,1.1),(0.8,0.4),(1.0,0.0),(1.3,0.05)]],
}


def cr_to_bezier(pts):
    """Catmull-Rom through pts -> list of cubic segments (c1, c2, p)."""
    n = len(pts)
    segs = []
    for i in range(n - 1):
        p0 = pts[i - 1] if i > 0 else pts[i]
        p1 = pts[i]
        p2 = pts[i + 1]
        p3 = pts[i + 2] if i + 2 < n else pts[i + 1]
        c1 = (p1[0] + (p2[0] - p0[0]) / 6, p1[1] + (p2[1] - p0[1]) / 6)
        c2 = (p2[0] - (p3[0] - p1[0]) / 6, p2[1] - (p3[1] - p1[1]) / 6)
        segs.append((c1, c2, p2))
    return segs


def build(name, seed, cfg):
    rnd = random.Random(seed)
    U = cfg['unit']
    slant = cfg['slant']
    base = cfg['baseline']

    def tf(p, ox, oy, sx, sy):
        return (ox + p[0] * sx + p[1] * slant * sy, oy - p[1] * sy)

    strokes = []
    x = 0.0
    first = name[0].upper()
    rest = name[1:].lower()
    cap_scale = cfg['cap_scale'] * rnd.uniform(0.96, 1.06)
    main = None
    for k, sub in enumerate(CAPITAL[first]):
        pts = [tf(p, x, base, U * cap_scale, U * cap_scale) for p in sub]
        if k == 0:
            main = pts
        else:
            strokes.append(pts)
    pen = main[-1]
    path = list(main)
    for ch in rest:
        tpl = LOWER[ch]
        sx = U * rnd.uniform(0.9, 1.08)
        sy = U * rnd.uniform(0.92, 1.1)
        ent = tpl[0]
        lp = []
        for p in tpl[1:]:
            q = (p[0] - ent[0], p[1] - ent[1])
            lp.append(((pen[0] + q[0] * sx + q[1] * slant * sy) + rnd.uniform(-1.2, 1.2), pen[1] - q[1] * sy + rnd.uniform(-1.2, 1.2)))
        for ex in EXTRA.get(ch, []):
            strokes.append([(pen[0] + e[0] * sx + e[1] * slant * sy, pen[1] - e[1] * sy) for e in ex])
        path.extend(lp)
        pen = lp[-1]
    t = rnd.choice(['rise', 'swash', 'loop'])
    if t == 'rise':
        tail = [(pen[0] + 0.5 * U, pen[1] - 0.1 * U), (pen[0] + 1.2 * U, pen[1] - 0.55 * U), (pen[0] + 2.0 * U, pen[1] - 0.4 * U)]
    elif t == 'swash':
        tail = [(pen[0] + 0.5 * U, pen[1] + 0.1 * U), (pen[0] + 1.2 * U, pen[1] + 0.35 * U), (pen[0] + 1.9 * U, pen[1] + 0.1 * U)]
    else:
        tail = [(pen[0] + 0.5 * U, pen[1] - 0.35 * U), (pen[0] + 1.0 * U, pen[1] - 0.95 * U), (pen[0] + 1.5 * U, pen[1] - 0.55 * U), (pen[0] + 1.2 * U, pen[1] - 0.2 * U), (pen[0] + 1.0 * U, pen[1] - 0.5 * U)]
    path.extend(tail)
    strokes.insert(0, path)
    xs = [p[0] for p in path]
    x0, x1 = min(xs), max(xs)
    uy = base + cfg['under'] * U
    under = [(x0 + 0.1 * (x1 - x0), uy + rnd.uniform(-2, 2)), (x0 + 0.45 * (x1 - x0), uy + 0.18 * U), (x0 + 0.85 * (x1 - x0), uy - 0.05 * U), (x1 + 0.25 * U, uy - 0.55 * U)]
    strokes.append(under)
    return strokes


def bounds(strokes):
    xs = [p[0] for s in strokes for p in s]
    ys = [p[1] for s in strokes for p in s]
    return min(xs), min(ys), max(xs), max(ys)


def to_d(stroke, ox, oy):
    pts = [(p[0] - ox, p[1] - oy) for p in stroke]
    segs = cr_to_bezier(pts) if len(pts) > 2 else [(pts[0], pts[1], pts[1])]
    d = f"M{pts[0][0]:.1f} {pts[0][1]:.1f}"
    for c1, c2, p in segs:
        d += f"C{c1[0]:.1f} {c1[1]:.1f} {c2[0]:.1f} {c2[1]:.1f} {p[0]:.1f} {p[1]:.1f}"
    return d


CFG = {'unit': 62, 'slant': 0.28, 'baseline': 190, 'cap_scale': 1.0, 'under': 0.55}
NAMES = {'ichika': 'Ichika', 'nino': 'Nino', 'miku': 'Miku', 'yotsuba': 'Yotsuba', 'itsuki': 'Itsuki', 'fuutarou': 'Futaro', 'raiha': 'Raiha', 'isanari': 'Isanari', 'maruo': 'Maruo', 'yusuke': 'Yusuke'}
SEEDS = {k: i * 7 + 3 for i, k in enumerate(NAMES)}


def make_all(cfg=CFG, seeds=SEEDS):
    out = {}
    for key, name in NAMES.items():
        st = build(name, seeds[key], cfg)
        x0, y0, x1, y1 = bounds(st)
        pad = 8
        out[key] = {
            'width': round(x1 - x0 + 2 * pad, 1),
            'height': round(y1 - y0 + 2 * pad, 1),
            'strokes': [to_d(s, x0 - pad, y0 - pad) for s in st],
            'raw': [[(p[0] - x0 + pad, p[1] - y0 + pad) for p in s] for s in st],
        }
    return out


def dense(s):
    if len(s) <= 2:
        return list(s)
    out = [s[0]]
    prev = s[0]
    for c1, c2, p in cr_to_bezier(s):
        for j in range(1, 13):
            t = j / 12
            out.append(((1 - t) ** 3 * prev[0] + 3 * (1 - t) ** 2 * t * c1[0] + 3 * (1 - t) * t ** 2 * c2[0] + t ** 3 * p[0],
                        (1 - t) ** 3 * prev[1] + 3 * (1 - t) ** 2 * t * c1[1] + 3 * (1 - t) * t ** 2 * c2[1] + t ** 3 * p[1]))
        prev = p
    return out


def preview(data, path, line=6):
    from PIL import Image, ImageDraw

    keys = list(data)
    W, H = 640, 300
    img = Image.new('RGB', (W * 2, H * 5), (30, 28, 40))
    dr = ImageDraw.Draw(img)
    S = 3
    for i, k in enumerate(keys):
        cell = Image.new('RGB', (W * S, H * S), (30, 28, 40))
        cd = ImageDraw.Draw(cell)
        for s in data[k]['raw']:
            pts = [(x * S + 40, y * S + 40) for x, y in dense(s)]
            cd.line(pts, fill=(240, 200, 100), width=int(line * S), joint='curve')
            for p in (pts[0], pts[-1]):
                cd.ellipse([p[0] - line * S / 2, p[1] - line * S / 2, p[0] + line * S / 2, p[1] + line * S / 2], fill=(240, 200, 100))
        cell = cell.resize((W, H), Image.LANCZOS)
        img.paste(cell, ((i % 2) * W, (i // 2) * H))
        dr.text(((i % 2) * W + 8, (i // 2) * H + 6), f"{k}  {data[k]['width']}x{data[k]['height']}", fill=(255, 255, 255))
    img.save(path)


def to_typescript(data):
    lines = [
        "import type { CharacterId } from '../cards/model';",
        '',
        '// Generated by tools/generate-signatures.py. Invented signature plates as SVG path data (plate units).',
        '// Do not edit by hand: change the generator and regenerate.',
        '',
        'export interface SignaturePlate {',
        '  readonly width: number;',
        '  readonly height: number;',
        '  /** One SVG path per pen stroke: the main line, i/t marks, the underline. */',
        '  readonly strokes: readonly string[];',
        '}',
        '',
        'export const SIGNATURES: Readonly<Record<CharacterId, SignaturePlate>> = {',
    ]
    for key, plate in data.items():
        lines.append(f'  {key}: {{')
        lines.append(f"    width: {plate['width']},")
        lines.append(f"    height: {plate['height']},")
        lines.append('    strokes: [')
        for d in plate['strokes']:
            lines.append(f"      '{d}',")
        lines.append('    ],')
        lines.append('  },')
    lines.append('};')
    return '\n'.join(lines) + '\n'


def main():
    parser = argparse.ArgumentParser(description='Generate signature plate data.')
    parser.add_argument('--out', help='Write the TypeScript data file to this path.')
    parser.add_argument('--preview', help='Write a PNG preview sheet to this path (needs Pillow).')
    args = parser.parse_args()
    data = make_all()
    if args.out:
        with open(args.out, 'w', encoding='utf-8', newline='\n') as handle:
            handle.write(to_typescript(data))
    if args.preview:
        preview(data, args.preview)
    print({key: (plate['width'], plate['height']) for key, plate in data.items()})


if __name__ == '__main__':
    main()
