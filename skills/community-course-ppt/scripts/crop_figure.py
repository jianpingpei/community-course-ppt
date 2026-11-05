"""Extract a specified paper panel without resizing or redrawing scientific content."""

import argparse
from PIL import Image


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("source")
    parser.add_argument("output")
    parser.add_argument("--crop", nargs=4, type=float, default=[0, 0, 1, 1])
    args = parser.parse_args()
    x, y, w, h = args.crop
    if min(x, y) < 0 or min(w, h) <= 0 or x + w > 1.000001 or y + h > 1.000001:
        raise ValueError(
            "Crop must be a normalized rectangle inside the original figure"
        )
    with Image.open(args.source) as image:
        width, height = image.size
        panel = image.crop(
            (
                round(x * width),
                round(y * height),
                round((x + w) * width),
                round((y + h) * height),
            )
        )
        panel.convert("RGB").save(args.output)
        print(f"{panel.width} {panel.height}")


if __name__ == "__main__":
    main()
