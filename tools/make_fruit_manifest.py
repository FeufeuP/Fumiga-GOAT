#!/usr/bin/env python3
"""Manifest of the optional fruit art (golden apples + biome sanctuaries).

The game never guesses which PNGs exist: `game/js/assets.js` reads this file
and only requests what is listed. Without it the browser would fire 404s for
every map whose art has not been generated yet (noise in the console, and a
real failure for the "no missing assets" inspection).

Usage (after adding/regenerating any PNG in game/assets/ui/frutos/):

    python3 tools/make_fruit_manifest.py

Only Pillow is needed to *create* the art; this script itself is pure stdlib.
"""
import json
import re
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
FOLDER = ROOT / "game" / "assets" / "ui" / "frutos"
MANIFEST = FOLDER / "manifest.json"
# Mesmas chaves de FRUIT_ART_FILES em game/js/assets.js.
VALID = re.compile(r"^(maca|santuario)_(planicie|floresta|pantano|deserto|outono|gelo|topo)$")


def main():
    FOLDER.mkdir(parents=True, exist_ok=True)
    keys = sorted(p.stem for p in FOLDER.glob("*.png") if VALID.match(p.stem))
    MANIFEST.write_text(
        json.dumps({"arquivos": keys}, ensure_ascii=False, indent=2) + "\n",
        encoding="utf-8",
    )
    print(f"{MANIFEST.relative_to(ROOT)}: {len(keys)} arte(s) opcional(is)")
    for key in keys:
        print("  •", key)


if __name__ == "__main__":
    main()
