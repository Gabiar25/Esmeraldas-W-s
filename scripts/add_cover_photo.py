"""
Inserta imginicio.png como la PRIMERA foto (portada) de collar-1,
recorriendo las fotos existentes una posicion hacia atras.
"""
import os
import json
from PIL import Image, ImageOps

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SRC = os.path.join(ROOT, "Joyeria-Willi", "Collar #1", "imginicio.png")
DEST_DIR = os.path.join(ROOT, "backend", "public", "assets", "images", "collar-1")
PRODUCTS_FILE = os.path.join(ROOT, "backend", "data", "products.json")

CARD_MAX = 700
FULL_MAX = 1500
QUALITY = 80


def save_resized(img, max_dim, dest_path):
    w, h = img.size
    scale = min(1.0, max_dim / max(w, h))
    if scale < 1.0:
        img = img.resize((max(1, int(w * scale)), max(1, int(h * scale))), Image.LANCZOS)
    img.save(dest_path, "JPEG", quality=QUALITY, optimize=True)


# 1. correr las fotos existentes una posicion hacia atras (4->5, 3->4, 2->3, 1->2)
existing = sorted(
    {int(f.split("-")[0]) for f in os.listdir(DEST_DIR) if f.endswith("-card.jpg")},
    reverse=True,
)
for i in existing:
    for suffix in ("card", "full"):
        src = os.path.join(DEST_DIR, f"{i}-{suffix}.jpg")
        dst = os.path.join(DEST_DIR, f"{i + 1}-{suffix}.jpg")
        os.rename(src, dst)
        print(f"renombrado: {i}-{suffix}.jpg -> {i + 1}-{suffix}.jpg")

# 2. generar la nueva foto de portada como "1"
with Image.open(SRC) as im:
    im = ImageOps.exif_transpose(im)
    if im.mode != "RGB":
        im = im.convert("RGB")
    save_resized(im.copy(), CARD_MAX, os.path.join(DEST_DIR, "1-card.jpg"))
    save_resized(im.copy(), FULL_MAX, os.path.join(DEST_DIR, "1-full.jpg"))
print("nueva portada generada: 1-card.jpg, 1-full.jpg")

# 3. actualizar products.json para reflejar la nueva cantidad de fotos
with open(PRODUCTS_FILE, "r", encoding="utf-8") as f:
    products = json.load(f)

for p in products:
    if p["id"] == "collar-1":
        n = len(existing) + 1
        p["images"] = [str(i) for i in range(1, n + 1)]
        print("collar-1 images:", p["images"])

with open(PRODUCTS_FILE, "w", encoding="utf-8") as f:
    json.dump(products, f, ensure_ascii=False, indent=2)
    f.write("\n")
