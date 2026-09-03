"""
Reoptimiza SOLO la foto de portada (index 1, la "imginicio.*") de cada
producto en su version -card (grid), que es la que se carga en todos
los listados del sitio (inicio, catalogo, categorias, relacionados).
Reduce el tamano maximo (menos peso) sin tocar la calidad JPEG, para
que se note lo minimo posible en el resultado visual.
Uso: python scripts/optimize_cover_cards.py
"""
import os
from PIL import Image, ImageOps

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SRC_ROOT = os.path.join(ROOT, "Joyeria-Willi")
DEST_ROOT = os.path.join(ROOT, "backend", "public", "assets", "images")

# slug -> (carpeta origen, archivo de portada)
COVERS = {
    "collar-1": ("Collar #1", "imginicio.jpeg"),
    "collar-2": ("Collar #2", "imginicio.png"),
    "collar-3": ("Collar #3", "imginicio.png"),
    "collar-4": ("Collar #4", "imginicio.png"),
    "collar-5": ("Collar #5", "imginicio.png"),
    "collar-6": ("Collar #6", "imginicio.png"),
    "collar-7": ("Collar #7", "imginicio.png"),
    "collar-8": ("Collar #8", "imginicio.jpeg"),
    "collar-9": ("Collar #9", "imginicio.png"),
    "collar-10": ("Collar #10", "imginicio.jpeg"),
    "collar-11": ("Collar #11", "imginicio.jpeg"),
    "aretes-talla-5": ("Aretes Talla 5", "imginicio.jpeg"),
    "set-1": ("Set #1", "imginico.jpeg"),
    "set-2": ("Set #2", "imginico.jpg"),
    "set-3": ("Set #3", "imginicio.jpg"),
    "set-4": ("Set #4", "imginicio.jpeg"),
    "set-5": ("Set #5", "imginicio.jpg"),
}

CARD_MAX = 560  # antes 700 -- las tarjetas del grid se muestran mucho mas chicas que eso
JPEG_QUALITY = 80  # sin cambios, misma calidad que el resto del sitio


def main():
    total = 0
    saved_bytes = 0
    for slug, (folder, fname) in COVERS.items():
        src_path = os.path.join(SRC_ROOT, folder, fname)
        dest_path = os.path.join(DEST_ROOT, slug, "1-card.jpg")
        if not os.path.isfile(src_path):
            print(f"FALTA: {src_path}")
            continue
        before = os.path.getsize(dest_path) if os.path.isfile(dest_path) else 0
        with Image.open(src_path) as im:
            im = ImageOps.exif_transpose(im)
            if im.mode != "RGB":
                im = im.convert("RGB")
            w, h = im.size
            scale = min(1.0, CARD_MAX / max(w, h))
            if scale < 1.0:
                im = im.resize((max(1, int(w * scale)), max(1, int(h * scale))), Image.LANCZOS)
            im.save(dest_path, "JPEG", quality=JPEG_QUALITY, optimize=True, progressive=True)
        after = os.path.getsize(dest_path)
        saved_bytes += max(0, before - after)
        print(f"OK {slug}: {before} -> {after} bytes")
        total += 1
    print(f"Listo. {total} portadas reoptimizadas. Ahorro total: {saved_bytes/1024:.1f} KB")


if __name__ == "__main__":
    main()
