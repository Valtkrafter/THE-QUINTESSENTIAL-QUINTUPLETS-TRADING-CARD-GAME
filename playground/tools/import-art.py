"""Imports the chosen card art into the project.

Reads the picked pictures from the art folder (default: C:/Users/valen/Downloads/TQQ CHARS), where each file is
named "<Name> Tier NN.<ext>" or "<Name> Halloween NN.<ext>", shrinks anything bigger than MAX_LONG_SIDE and writes
  src/assets/art/<character>/t01.jpg ... h1.jpg   (git-ignored, the art stays on this machine)
  src/data/art-manifest.json                        (sizes and source names, tracked in git)

Run from the playground folder:  python tools/import-art.py [source-folder]
"""

import json
import re
import sys
from pathlib import Path

from PIL import Image

DEFAULT_SOURCE = Path("C:/Users/valen/Downloads/TQQ CHARS")
ROOT = Path(__file__).resolve().parent.parent
OUT_DIR = ROOT / "src" / "assets" / "art"
MANIFEST = ROOT / "src" / "data" / "art-manifest.json"

MAX_LONG_SIDE = 2200
JPEG_QUALITY = 88
LOW_RES_SHORT_SIDE = 900

# Folder name in the art folder -> character id used in the code.
CHARACTERS = {
    "Ichika": "ichika",
    "Nino": "nino",
    "Miku": "miku",
    "Yotsuba": "yotsuba",
    "Itsuki": "itsuki",
    "Futarou": "fuutarou",
    "Raiha": "raiha",
    "Isanari": "isanari",
    "Maruo": "maruo",
    "Yusuke": "yusuke",
}
# How many pictures each character should have (tiers plus Halloween).
EXPECTED = {"ichika": 12, "nino": 12, "miku": 12, "yotsuba": 12, "itsuki": 12,
            "fuutarou": 6, "raiha": 4, "isanari": 3, "maruo": 3, "yusuke": 3}

FILE_NAME = re.compile(r"^(?P<name>\w+) (?P<kind>Tier|Halloween) (?P<num>\d+)\.(?:jpe?g|png|webp)$", re.IGNORECASE)


def slot_of(kind: str, number: int) -> str:
    return f"t{number:02d}" if kind.lower() == "tier" else f"h{number}"


def flatten(image: Image.Image) -> Image.Image:
    if image.mode in ("RGBA", "LA", "P"):
        rgba = image.convert("RGBA")
        background = Image.new("RGB", rgba.size, (255, 255, 255))
        background.paste(rgba, mask=rgba.split()[-1])
        return background
    return image.convert("RGB")


def main() -> int:
    source = Path(sys.argv[1]) if len(sys.argv) > 1 else DEFAULT_SOURCE
    if not source.is_dir():
        print(f"Art folder not found: {source}")
        return 1

    manifest: dict[str, dict[str, dict[str, object]]] = {}
    warnings: list[str] = []
    for folder_name, character in CHARACTERS.items():
        folder = source / folder_name
        if not folder.is_dir():
            warnings.append(f"{folder_name}: folder missing")
            continue
        entries: dict[str, dict[str, object]] = {}
        for file in sorted(folder.iterdir()):
            if not file.is_file():
                continue  # _alternates and _original are ignored
            match = FILE_NAME.match(file.name)
            if match is None:
                warnings.append(f"{folder_name}: skipped '{file.name}' (name does not match)")
                continue
            slot = slot_of(match["kind"], int(match["num"]))
            with Image.open(file) as opened:
                image = flatten(opened)
            width, height = image.size
            if min(width, height) < LOW_RES_SHORT_SIDE:
                warnings.append(f"{folder_name} {slot}: only {width}x{height}")
            scale = min(1.0, MAX_LONG_SIDE / max(width, height))
            if scale < 1.0:
                image = image.resize((round(width * scale), round(height * scale)), Image.LANCZOS)
            target = OUT_DIR / character / f"{slot}.jpg"
            target.parent.mkdir(parents=True, exist_ok=True)
            image.save(target, "JPEG", quality=JPEG_QUALITY, subsampling=0)
            entries[slot] = {"width": image.size[0], "height": image.size[1], "source": file.name}
        if len(entries) != EXPECTED[character]:
            warnings.append(f"{folder_name}: {len(entries)} pictures, expected {EXPECTED[character]}")
        manifest[character] = dict(sorted(entries.items()))

    MANIFEST.parent.mkdir(parents=True, exist_ok=True)
    MANIFEST.write_text(json.dumps(manifest, indent=2, ensure_ascii=False) + "\n", encoding="utf-8", newline="\n")

    total = sum(len(v) for v in manifest.values())
    size_mb = sum(p.stat().st_size for p in OUT_DIR.rglob("*.jpg")) / 1_000_000
    print(f"Imported {total} pictures ({size_mb:.0f} MB) into {OUT_DIR}")
    for line in warnings:
        print("  note:", line)
    return 0


if __name__ == "__main__":
    sys.exit(main())
