"""
Quita el fondo del icono de carga (logodecarcainicio.png), lo recorta
y genera una version optimizada para el splash de carga del sitio.
"""
import os
import numpy as np
from PIL import Image

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SRC = os.path.join(ROOT, "Joyeria-Willi", "logodecarcainicio.png")
DEST_DIR = os.path.join(ROOT, "backend", "public", "assets", "logo")
os.makedirs(DEST_DIR, exist_ok=True)

BG = np.array([251, 241, 227], dtype=np.float32)
LOW, HIGH = 10, 40

im = Image.open(SRC).convert("RGB")
arr = np.array(im, dtype=np.float32)
dist = np.sqrt(((arr - BG) ** 2).sum(axis=2))
alpha = np.clip((dist - LOW) / (HIGH - LOW), 0, 1) * 255
rgba = np.dstack([arr.astype(np.uint8), alpha.astype(np.uint8)])
out = Image.fromarray(rgba, mode="RGBA")

bbox = out.getbbox()
if bbox:
    out = out.crop(bbox)

target_w = 260
ratio = target_w / out.width
out = out.resize((target_w, int(out.height * ratio)), Image.LANCZOS)

# paleta reducida: esta ilustracion tiene pocos colores planos, asi que
# cuantizar a una paleta pequena baja mucho el peso sin perder calidad visible.
quantized = out.quantize(colors=48, method=Image.FASTOCTREE)
quantized.save(os.path.join(DEST_DIR, "loader-icon.png"), optimize=True)
print("Tamano final:", out.size)
print("Peso:", os.path.getsize(os.path.join(DEST_DIR, "loader-icon.png")), "bytes")
