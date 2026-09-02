"""
Quita el fondo crema del logo horizontal y lo recorta, dejando un PNG
transparente listo para usar sobre cualquier fondo del sitio.
"""
import os
import numpy as np
from PIL import Image

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SRC = os.path.join(ROOT, "Joyeria-Willi", "logohorizontal.png")
DEST_DIR = os.path.join(ROOT, "backend", "public", "assets", "logo")
os.makedirs(DEST_DIR, exist_ok=True)

BG = np.array([251, 239, 226], dtype=np.float32)
# distancia de color por debajo de la cual se considera 100% fondo,
# y por encima de la cual se considera 100% opaco (logo), con una
# transicion suave en medio para bordes limpios sin dientes de sierra.
LOW, HIGH = 10, 40

im = Image.open(SRC).convert("RGB")
arr = np.array(im, dtype=np.float32)
dist = np.sqrt(((arr - BG) ** 2).sum(axis=2))

alpha = np.clip((dist - LOW) / (HIGH - LOW), 0, 1) * 255
alpha = alpha.astype(np.uint8)

rgba = np.dstack([arr.astype(np.uint8), alpha])
out = Image.fromarray(rgba, mode="RGBA")

# recorta al contenido (bounding box de los pixeles no transparentes)
bbox = out.getbbox()
if bbox:
    out = out.crop(bbox)

out.save(os.path.join(DEST_DIR, "logo-horizontal.png"))
print("Tamano final:", out.size)

# version mas pequena para el header (altura ~72px reales, x2 para pantallas retina)
target_h = 140
ratio = target_h / out.height
small = out.resize((int(out.width * ratio), target_h), Image.LANCZOS)
small.save(os.path.join(DEST_DIR, "logo-horizontal-header.png"))
print("Tamano header:", small.size)
