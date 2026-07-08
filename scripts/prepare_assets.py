"""
One-time asset prep: turns the flat, checkerboard/white-background source
renders in D:\\ride\\images\\ into clean transparent PNGs for the app.

The source PNGs have NO real alpha channel — the "checkerboard" some of them
show is baked into the pixels by whatever tool generated them, not real
transparency. This script:

  1. Finds the background blob (near-white/gray pixels connected to the
     image border — using connected-component labeling, not a flat color
     key, so it can't eat into similarly light-colored parts *inside* the
     vehicle, e.g. glass/chrome, since those aren't touching the border).
  2. Feathers the cutout edge slightly so it isn't jaggy.
  3. Crops to the subject's bounding box, then centers it on a transparent
     512x512 canvas at ~80% fill.

Run once from mobile/: `python scripts/prepare_assets.py`
Safe to re-run — it always re-reads from D:\\ride\\images\\.
"""
import numpy as np
from PIL import Image, ImageFilter
from scipy import ndimage
import pathlib

SOURCE_DIR = pathlib.Path(r"D:\ride\images")
ASSETS_DIR = pathlib.Path(__file__).resolve().parent.parent / "assets"

CANVAS_SIZE = 512
FILL_RATIO = 0.80  # vehicle occupies ~80% of the canvas
NEAR_WHITE_MIN = 225  # min channel value to be considered "near white/gray"
NEAR_WHITE_SPREAD = 20  # max(R,G,B) - min(R,G,B) to still count as gray/white
FEATHER_PX = 1.5

JOBS = [
    (SOURCE_DIR / "logo.png", ASSETS_DIR / "logo" / "logo.png"),
    (SOURCE_DIR / "motobike.png", ASSETS_DIR / "vehicles" / "bike.png"),
    (SOURCE_DIR / "rickshaw.png", ASSETS_DIR / "vehicles" / "rickshaw.png"),
    (SOURCE_DIR / "mini.png", ASSETS_DIR / "vehicles" / "mini.png"),
    (SOURCE_DIR / "car.png", ASSETS_DIR / "vehicles" / "car.png"),
]


def remove_background(rgb: np.ndarray) -> np.ndarray:
    """Returns an RGBA array with the border-connected near-white/gray
    background made transparent, edges feathered."""
    r, g, b = rgb[..., 0].astype(int), rgb[..., 1].astype(int), rgb[..., 2].astype(int)
    channel_min = np.minimum(np.minimum(r, g), b)
    channel_max = np.maximum(np.maximum(r, g), b)
    near_white = (channel_min > NEAR_WHITE_MIN) & (channel_max - channel_min < NEAR_WHITE_SPREAD)

    labeled, _ = ndimage.label(near_white)
    border_labels = set(labeled[0, :]) | set(labeled[-1, :]) | set(labeled[:, 0]) | set(labeled[:, -1])
    border_labels.discard(0)

    background_mask = np.isin(labeled, list(border_labels)) if border_labels else np.zeros_like(near_white)

    alpha = np.where(background_mask, 0, 255).astype(np.uint8)
    alpha_img = Image.fromarray(alpha, mode="L").filter(ImageFilter.GaussianBlur(FEATHER_PX))

    rgba = np.dstack([rgb, np.array(alpha_img)])
    return rgba


def crop_and_center(rgba: np.ndarray) -> Image.Image:
    alpha = rgba[..., 3]
    ys, xs = np.where(alpha > 10)
    if len(xs) == 0:
        raise ValueError("No foreground content found after background removal")

    x0, x1 = xs.min(), xs.max()
    y0, y1 = ys.min(), ys.max()
    subject = Image.fromarray(rgba[y0 : y1 + 1, x0 : x1 + 1], mode="RGBA")

    target = int(CANVAS_SIZE * FILL_RATIO)
    scale = target / max(subject.width, subject.height)
    new_size = (max(1, round(subject.width * scale)), max(1, round(subject.height * scale)))
    subject = subject.resize(new_size, Image.LANCZOS)

    canvas = Image.new("RGBA", (CANVAS_SIZE, CANVAS_SIZE), (0, 0, 0, 0))
    offset = ((CANVAS_SIZE - subject.width) // 2, (CANVAS_SIZE - subject.height) // 2)
    canvas.paste(subject, offset, subject)
    return canvas


def main():
    if not SOURCE_DIR.exists():
        print(f"Source folder not found: {SOURCE_DIR} — nothing to do.")
        return

    for src, dest in JOBS:
        if not src.exists():
            print(f"SKIP (missing source): {src}")
            continue

        rgb = np.array(Image.open(src).convert("RGB"))
        rgba = remove_background(rgb)
        result = crop_and_center(rgba)

        dest.parent.mkdir(parents=True, exist_ok=True)
        result.save(dest, "PNG")
        print(f"OK  {src.name} -> {dest.relative_to(dest.parent.parent.parent)} ({result.size[0]}x{result.size[1]}, RGBA)")


if __name__ == "__main__":
    main()
