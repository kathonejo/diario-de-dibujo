#!/usr/bin/env bash
# Uso: scripts/publicar_dia.sh [AAAA-MM-DD]   (por defecto: hoy)
# Copia /workspace/raton-perez/<fecha>/ (dia.json + imágenes) a content/<fecha>/, optimiza a webp ≤1600px, commit y push.
set -euo pipefail
FECHA="${1:-$(date +%F)}"
SRC="${RATON_DIR:-/workspace/raton-perez}/$FECHA"
REPO="$(cd "$(dirname "$0")/.." && pwd)"
DEST="$REPO/content/$FECHA"
[[ -f "$SRC/dia.json" ]] || { echo "ERROR: falta $SRC/dia.json" >&2; exit 1; }
[[ -f "$SRC/moodboard.png" ]] || { echo "ERROR: falta $SRC/moodboard.png" >&2; exit 2; }
mkdir -p "$DEST"
python3 - "$SRC" "$DEST" <<'PY'
import json, os, sys
from PIL import Image
src, dest = sys.argv[1], sys.argv[2]
d = json.load(open(os.path.join(src, "dia.json"), encoding="utf-8"))
def conv(name):
    if not name: return name
    p = os.path.join(src, name)
    if not os.path.exists(p):
        print(f"AVISO: no existe {p}", file=sys.stderr); return None
    out = os.path.splitext(name)[0] + ".webp"
    im = Image.open(p); im.thumbnail((1600, 1600))
    if im.mode not in ("RGB", "RGBA"): im = im.convert("RGB")
    im.save(os.path.join(dest, out), "WEBP", quality=82)
    return out
d["moodboard"] = conv(d.get("moodboard", "moodboard.png"))
for x in d.get("datos", []):
    if x.get("imagen"): x["imagen"] = conv(x["imagen"])
json.dump(d, open(os.path.join(dest, "dia.json"), "w", encoding="utf-8"), ensure_ascii=False, indent=2)
PY
cd "$REPO"
git add "content/$FECHA"
if git diff --cached --quiet; then echo "Sin cambios para $FECHA"; exit 0; fi
git commit -qm "Día $FECHA"
git push -q origin HEAD
echo "Publicado $FECHA"
