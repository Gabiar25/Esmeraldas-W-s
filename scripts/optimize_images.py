"""
Redimensiona y comprime las fotos originales de Joyeria-Willi hacia
backend/public/assets/images/<slug>/ en dos tamanos: card (grid) y full (detalle/lightbox).
Uso: python scripts/optimize_images.py
"""
import os
from PIL import Image, ImageOps

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SRC_ROOT = os.path.join(ROOT, "Joyeria-Willi")
DEST_ROOT = os.path.join(ROOT, "backend", "public", "assets", "images")

# slug -> lista de archivos fuente en el orden deseado (portada primero)
PRODUCTS = {
    "collar-1": ("Collar #1", ["imginicio.jpeg", "DSC00832.JPEG", "DSC00836.JPEG", "DSC00837.JPEG", "DSC00840.JPEG"]),
    "collar-2": ("Collar #2", ["imginicio.png", "DSC00860.JPEG", "DSC00863.JPEG", "DSC00864.JPEG", "DSC00866.JPEG"]),
    "collar-3": ("Collar #3", ["imginicio.png", "DSC00899.JPEG", "DSC00901.JPEG", "DSC00905.JPEG"]),
    "collar-4": ("Collar #4", ["imginicio.png", "DSC00869.JPEG", "DSC00874.JPEG", "DSC00876.JPEG"]),
    "collar-5": ("Collar #5", ["imginicio.png", "DSC00787.JPEG", "DSC00797.JPEG", "DSC00813.JPEG"]),
    "collar-6": ("Collar #6", ["imginicio.png", "DSC00911.JPEG", "DSC00914.JPEG", "DSC00919.JPEG"]),
    "collar-7": ("Collar #7", ["imginicio.png", "DSC00882.JPEG", "DSC00884.JPEG", "DSC00888.JPEG", "DSC00891.JPEG"]),
    "collar-8": ("Collar #8", ["imginicio.png", "DSC00848.JPEG", "DSC00854.JPEG", "DSC00858.JPEG", "DSC00859.JPEG"]),
    "collar-9": ("Collar #9", ["imginicio.png", "DSC00920.JPEG", "DSC00924.JPEG", "DSC00926.JPEG", "DSC00928.JPEG"]),
    "collar-10": ("Collar #10", ["imginicio.png", "DSC01032.JPEG", "DSC01035.JPEG", "DSC01039.JPEG", "DSC01040.JPEG"]),
    "collar-11": ("Collar #11", ["imginicio.jpeg", "DSC01050.JPEG", "DSC01054.JPEG", "DSC01056.JPEG", "DSC01060.JPEG"]),
    "aretes-talla-5": ("Aretes Talla 5", ["imginicio.jpeg", "DSC00788.JPEG", "DSC00794.JPEG", "DSC00810.JPEG"]),
    "set-1": ("Set #1", ["imginico.jpeg", "DSC00974.JPEG", "DSC00977.JPEG", "DSC00982.JPEG", "DSC00985.JPEG", "DSC00987.JPEG", "DSC00991.JPEG", "DSC00992.JPEG"]),
    "set-2": ("Set #2", ["imginico.jpg", "DSC00995.JPEG", "DSC01000.JPEG", "DSC01001.JPEG", "DSC01004.JPEG", "DSC01005.JPEG", "DSC01009.JPEG", "DSC01011.JPEG"]),
    "set-3": ("Set #3", ["imginicio.jpg", "DSC00936.JPEG", "DSC00937.JPEG", "DSC00941.JPEG", "DSC00944.JPEG", "DSC00947.JPEG", "DSC00948.JPEG", "DSC00949.JPEG"]),
    "set-4": ("Set #4", ["imginicio.jpeg", "DSC01014.JPEG", "DSC01017.JPEG", "DSC01019.JPEG", "DSC01024.JPEG", "DSC01025.JPEG", "DSC01027.JPEG", "DSC01029.JPEG"]),
    "set-5": ("Set #5", ["imginicio.jpg", "DSC00957.JPEG", "DSC00961.JPEG", "DSC00967.JPEG", "DSC00968.JPEG", "DSC00970.JPEG", "DSC00973.JPEG"]),
}

CARD_MAX = 700
FULL_MAX = 1500
JPEG_QUALITY = 80


def save_resized(img, max_dim, dest_path):
    w, h = img.size
    scale = min(1.0, max_dim / max(w, h))
    if scale < 1.0:
        img = img.resize((max(1, int(w * scale)), max(1, int(h * scale))), Image.LANCZOS)
    img.save(dest_path, "JPEG", quality=JPEG_QUALITY, optimize=True)


def main():
    total = 0
    for slug, (folder, files) in PRODUCTS.items():
        src_dir = os.path.join(SRC_ROOT, folder)
        dest_dir = os.path.join(DEST_ROOT, slug)
        os.makedirs(dest_dir, exist_ok=True)
        for i, fname in enumerate(files, start=1):
            src_path = os.path.join(src_dir, fname)
            if not os.path.isfile(src_path):
                print(f"FALTA: {src_path}")
                continue
            with Image.open(src_path) as im:
                im = ImageOps.exif_transpose(im)
                if im.mode != "RGB":
                    im = im.convert("RGB")
                save_resized(im.copy(), CARD_MAX, os.path.join(dest_dir, f"{i}-card.jpg"))
                save_resized(im.copy(), FULL_MAX, os.path.join(dest_dir, f"{i}-full.jpg"))
                total += 1
        print(f"OK {slug}: {len(files)} fotos -> {dest_dir}")
    print(f"Listo. {total} fotos procesadas (x2 tamanos).")


if __name__ == "__main__":
    main()
