#!/usr/bin/env python3
"""Генератор иконок PWA.

Рисует фирменный знак CodeQuest (градиентный скруглённый квадрат с тёмной
каплей-кораблём) без внешних зависимостей и сохраняет PNG в assets/.
Запуск: python3 tools/make-icons.py
"""
import struct
import zlib
from pathlib import Path

BG = (5, 7, 15)
GRAD_FROM = (27, 139, 181)   # --color-accent-deep
GRAD_TO = (166, 124, 255)    # --color-violet
MARK = (4, 18, 26)

ROOT = Path(__file__).resolve().parent.parent


def mix(a, b, t):
    t = max(0.0, min(1.0, t))
    return tuple(round(a[i] + (b[i] - a[i]) * t) for i in range(3))


def rounded_square(x, y, half, radius):
    """Расстояние до скруглённого квадрата: <= 0 — точка внутри."""
    dx = max(abs(x) - (half - radius), 0.0)
    dy = max(abs(y) - (half - radius), 0.0)
    return (dx * dx + dy * dy) ** 0.5 - radius


def inside_mark(x, y):
    """Капля-корабль: треугольник сверху и полукруг снизу."""
    if y < 0.06 and abs(x) <= 0.30 * (y + 0.34) / 0.40:
        return True
    return (x * x + (y - 0.10) ** 2) ** 0.5 <= 0.20


def sample(x, y):
    """Цвет точки в координатах -1…1."""
    if rounded_square(x, y, 0.78, 0.26) > 0:
        return BG
    if inside_mark(x, y):
        return MARK
    return mix(GRAD_FROM, GRAD_TO, (x + y + 1.4) / 2.8)


def render(size, samples=2):
    rows = []
    step = 2.0 / size
    for py in range(size):
        row = bytearray()
        for px in range(size):
            acc = [0, 0, 0]
            for sy in range(samples):
                for sx in range(samples):
                    x = -1.0 + (px + (sx + 0.5) / samples) * step
                    y = -1.0 + (py + (sy + 0.5) / samples) * step
                    color = sample(x, y)
                    for i in range(3):
                        acc[i] += color[i]
            total = samples * samples
            row.extend(value // total for value in acc)
        rows.append(bytes(row))
    return rows


def write_png(path, size):
    rows = render(size)
    raw = b''.join(b'\x00' + row for row in rows)

    def chunk(tag, data):
        body = tag + data
        return struct.pack('>I', len(data)) + body + struct.pack('>I', zlib.crc32(body))

    png = b'\x89PNG\r\n\x1a\n'
    png += chunk(b'IHDR', struct.pack('>IIBBBBB', size, size, 8, 2, 0, 0, 0))
    png += chunk(b'IDAT', zlib.compress(raw, 9))
    png += chunk(b'IEND', b'')
    path.write_bytes(png)
    print(f'{path.relative_to(ROOT)} — {size}×{size}, {len(png)} байт')


if __name__ == '__main__':
    assets = ROOT / 'assets'
    assets.mkdir(exist_ok=True)
    write_png(assets / 'icon-192.png', 192)
    write_png(assets / 'icon-512.png', 512)
