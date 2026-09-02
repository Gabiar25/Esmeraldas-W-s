"""
Inserta imginicio.png como portada (posicion 1) para varios collares a la
vez, recorriendo las fotos ya procesadas de cada uno una posicion hacia atras.
"""
import os
import json
from PIL import Image, ImageOps

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
IMAGES_ROOT = os.path.join(ROOT, "backend", "public", "assets", "images")
PRODUCTS_FILE = os.path.join(ROOT, "backend", "data", "products.json")

CARD_MAX = 700
FULL_MAX = 1500
QUALITY = 80

# slug -> carpeta origen de imginicio.png
TARGETS = {
    "collar-2": "Collar #2",
    "collar-3": "Collar #3",
    "collar-4": "Collar #4",
    "collar-5": "Collar #5",
    "collar-6": "Collar #6",
}


def save_resized(img, max_dim, dest_path):
    w, h = img.size
    scale = min(1.0, max_dim / max(w, h))
    if scale < 1.0:
        img = img.resize((max(1, int(w * scale)), max(1, int(h * scale))), Image.LANCZOS)
    img.save(dest_path, "JPEG", quality=QUALITY, optimize=True)


with open(PRODUCTS_FILE, "r", encoding="utf-8") as f:
    products = json.load(f)

for slug, folder in TARGETS.items():
    dest_dir = os.path.join(IMAGES_ROOT, slug)
    src = os.path.join(ROOT, "Joyeria-Willi", folder, "imginicio.png")

    existing = sorted(
        {int(fn.split("-")[0]) for fn in os.listdir(dest_dir) if fn.endswith("-card.jpg")},
        reverse=True,
    )
    for i in existing:
        for suffix in ("card", "full"):
            os.rename(
                os.path.join(dest_dir, f"{i}-{suffix}.jpg"),
                os.path.join(dest_dir, f"{i + 1}-{suffix}.jpg"),
            )

    with Image.open(src) as im:
        im = ImageOps.exif_transpose(im)
        if im.mode != "RGB":
            im = im.convert("RGB")
        save_resized(im.copy(), CARD_MAX, os.path.join(dest_dir, "1-card.jpg"))
        save_resized(im.copy(), FULL_MAX, os.path.join(dest_dir, "1-full.jpg"))

    n = len(existing) + 1
    for p in products:
        if p["id"] == slug:
            p["images"] = [str(i) for i in range(1, n + 1)]
            print(f"{slug}: {len(existing)} fotos -> {n} fotos, images={p['images']}")

with open(PRODUCTS_FILE, "w", encoding="utf-8") as f:
    json.dump(products, f, ensure_ascii=False, indent=2)
    f.write("\n")

print("Listo.")
