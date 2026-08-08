#!/usr/bin/env python3
"""
Build the memory set for <blog-hopfield> from the silhouettes in
assets/images/hopfield/.

Each image becomes a 64x64 bipolar pattern (+1 = ink, -1 = background), packed
one bit per pixel, row-major, MSB first, and base64-encoded.

Each silhouette is cropped to its bounding box and scaled to fill the frame,
rather than centered at its natural aspect. That matters: centered shapes share
a large white background, which correlates every pattern with every other one
(0.44-0.64 for a set of centered animal silhouettes) and the Hebbian rule then
collapses them into a single spurious mixture. Filling the frame drops the
pairwise correlations to 0.08-0.30, low enough for Hebbian storage.

The organisms are the essay's own neuron-count ladder: C. elegans (302 neurons),
Drosophila (~135,000), and H. sapiens (86 billion). Silhouettes come from
PhyloPic (https://www.phylopic.org), all CC0.

    python3 scripts/generate-hopfield-patterns.py
"""

import base64
import json
import pathlib

import numpy as np
from PIL import Image

SIZE = 64
PAD = 2  # margin in pixels, so the shape does not touch the frame
ROOT = pathlib.Path(__file__).resolve().parent.parent
SRC = ROOT / "assets" / "images" / "hopfield"
OUT = ROOT / "assets" / "hopfield-patterns.json"

# Display order in the widget, smallest nervous system first.
NAMES = ["worm", "fly", "human"]


def load(path):
    """Flatten onto white, crop to the ink's bounding box, scale to fill the frame."""
    im = Image.open(path).convert("RGBA")
    im = Image.alpha_composite(Image.new("RGBA", im.size, (255, 255, 255, 255)), im)
    g = im.convert("L")

    ys, xs = np.where(np.asarray(g) < 128)
    g = g.crop((xs.min(), ys.min(), xs.max() + 1, ys.max() + 1))
    g = g.resize((SIZE - 2 * PAD, SIZE - 2 * PAD), Image.LANCZOS)

    frame = Image.new("L", (SIZE, SIZE), 255)
    frame.paste(g, (PAD, PAD))
    return np.asarray(frame, dtype=float) < 128  # True where ink


def pack(bits):
    return base64.b64encode(np.packbits(bits.ravel()).tobytes()).decode("ascii")


def main():
    patterns = []
    stack = []

    for name in NAMES:
        bits = load(SRC / f"{name}.png")
        stack.append(np.where(bits, 1.0, -1.0).ravel())
        patterns.append({"name": name, "bits": pack(bits)})
        print(f"{name:6s} ink={bits.mean():.3f}")

    X = np.stack(stack, axis=1)
    n, p = X.shape
    corr = (X.T @ X) / n
    off = np.abs(corr[~np.eye(p, dtype=bool)])
    print("\ncorrelations:\n", np.round(corr, 3))
    print(f"|correlation| off-diagonal: max={off.max():.3f} mean={off.mean():.3f}")

    # Hebbian storage degrades once patterns overlap; keep a guard rail on the
    # preprocessing so a future image swap cannot quietly break recall.
    assert off.max() < 0.35, f"patterns too correlated for Hebbian storage: {off.max():.3f}"
    assert np.linalg.cond(X.T @ X) < 1e6, "patterns are near linearly dependent"

    OUT.write_text(
        json.dumps(
            {
                "size": SIZE,
                "note": "bits: 1 = ink (+1), 0 = background (-1); row-major, MSB first",
                "source": "https://www.phylopic.org — silhouettes released under CC0",
                "patterns": patterns,
            },
            indent=2,
        )
        + "\n"
    )
    print(f"\nwrote {OUT.relative_to(ROOT)} ({OUT.stat().st_size} bytes)")


if __name__ == "__main__":
    main()
