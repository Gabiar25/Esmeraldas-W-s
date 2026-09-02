"""Optimiza la foto de portada para usarla como fondo del hero del inicio."""
import os
from PIL import Image, ImageOps

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SRC = os.path.join(ROOT, "Joyeria-Willi", "Collar #1", "imginicio.png")
DEST_DIR = os.path.join(ROOT, "backend", "public", "assets", "hero")
os.makedirs(DEST_DIR, exist_ok=True)

im = Image.open(SRC)
im = ImageOps.exif_transpose(im)
if im.mode != "RGB":
    im = im.convert("RGB")

target_w = 1920
ratio = target_w / im.width
im = im.resize((target_w, int(im.height * ratio)), Image.LANCZOS)
dest = os.path.join(DEST_DIR, "hero-inicio.jpg")
im.save(dest, "JPEG", quality=78, optimize=True)
print("Tamano:", im.size, "Peso:", os.path.getsize(dest), "bytes")
