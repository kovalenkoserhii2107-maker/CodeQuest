"""
Подготовка картинок модулей: приведение к одному размеру и общему фону.

Запуск: python3 tools/prep-modules.py <папка-с-исходниками>
Нужен Pillow: pip install Pillow

Midjourney отдаёт квадраты 1024×1024 с разным фоном — от бурого до синего.
Если положить их в интерфейс как есть, карточки станут разноцветными
заплатками. Поэтому края уводим в один тёмный цвет (--surface-sunken),
и картинка садится на тёмную подложку без видимого шва.
"""
import sys
from pathlib import Path

from PIL import Image, ImageDraw, ImageFilter

SRC = Path(sys.argv[1] if len(sys.argv) > 1 else '.')
OUT = Path(__file__).resolve().parent.parent / 'assets' / 'modules'
SIZE = 512
PLATE = (10, 15, 29)        # #0a0f1d — фон панелей игры
INNER, OUTER = 0.46, 0.98   # где виньетка начинается и где становится сплошной

MAPPING = {
    '958af9a0-image.jpg': 'mod-reactor-1.jpg',
    '7f24d04c-image.jpg': 'mod-engine-1.jpg',
    '8bb3efec-image.jpg': 'mod-drill-1.jpg',
    'dda27793-image.jpg': 'mod-shield-1.jpg',
    '427c6d25-image.jpg': 'default.jpg',
}


def vignette_mask(size, inner, outer):
    """Маска: в центре картинка видна целиком, к краю уступает место фону."""
    big = size * 4
    mask = Image.new('L', (big, big), 0)
    draw = ImageDraw.Draw(mask)

    steps = 64
    for step in range(steps, -1, -1):
        t = step / steps
        radius = (inner + (outer - inner) * t) * big / 2
        value = int(255 * (1 - t) ** 1.6)
        box = [big / 2 - radius, big / 2 - radius, big / 2 + radius, big / 2 + radius]
        draw.ellipse(box, fill=value)

    mask = mask.resize((size, size), Image.LANCZOS)
    return mask.filter(ImageFilter.GaussianBlur(size / 48))


mask = vignette_mask(SIZE, INNER, OUTER)
plate = Image.new('RGB', (SIZE, SIZE), PLATE)

OUT.mkdir(parents=True, exist_ok=True)
for source, target in MAPPING.items():
    image = Image.open(SRC / source).convert('RGB')
    side = min(image.size)
    left = (image.width - side) // 2
    top = (image.height - side) // 2
    image = image.crop((left, top, left + side, top + side)).resize((SIZE, SIZE), Image.LANCZOS)

    blended = Image.composite(image, plate, mask)
    path = OUT / target
    blended.save(path, 'JPEG', quality=82, optimize=True, progressive=True)
    print(f'{target:22} {path.stat().st_size // 1024:>4} КБ')
