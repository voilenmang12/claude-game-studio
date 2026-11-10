#!/usr/bin/env python3
"""Check a game's popup UI kit against Assets/Integration/UIPopupStandard.md, section 4.

Reads each sprite's fill (center pixel) and outline (first opaque pixel on the middle column),
then checks the contrast rules: outline vs fill, each layer vs the layer under it, and text colors.

  python Tools/ui-kit-check.py \
      --layer bg1=Assets/Art/UI/Popup/popup_frame.png \
      --layer bg2=Assets/Art/UI/Popup/popup_panel.png \
      --layer bg3=Assets/Art/UI/Popup/popup_well.png:flat \
      --layer card=Assets/Art/UI/Popup/popup_card.png \
      --state card_selected=Assets/Art/UI/Popup/popup_card_selected.png:card \
      --button Assets/Art/UI/Buttons/button_primary.png --button Assets/Art/UI/Buttons/button_secondary.png \
      --text "#784403@bg2" --text "#784403@bg3"

--layer is bottom to top; each is compared with the one before it. Add :flat for a recessed layer without an outline.
--state NAME=PNG:BASE compares a state sprite (selected, active) with its base layer.
--button checks outline vs fill and that every button has the same size (and outline thickness, for pixel art).
--text HEX@LAYER checks body text against a layer fill (needs 4.5:1). Exit code 1 if any check fails.
Needs Pillow (pip install pillow).
"""
import argparse
import sys

from PIL import Image

MIN_LAYER_DL = 10     # adjacent surface fills, CIELAB L*
MIN_OUTLINE_DL = 25   # raised element: outline darker than its fill
MIN_STATE_DL = 15     # selected or active state vs its base
MIN_TEXT_RATIO = 4.5  # WCAG contrast ratio for body text


def lum(rgb):
    c = [v / 255 for v in rgb]
    c = [v / 12.92 if v <= 0.04045 else ((v + 0.055) / 1.055) ** 2.4 for v in c]
    return 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2]


def lstar(rgb):
    y = lum(rgb)
    return 116 * y ** (1 / 3) - 16 if y > 0.008856 else 903.3 * y


def ratio(a, b):
    hi, lo = sorted((lum(a), lum(b)), reverse=True)
    return (hi + 0.05) / (lo + 0.05)


def hexc(rgb):
    return "#%02x%02x%02x" % rgb


def parse_hex(text):
    text = text.lstrip("#")
    return tuple(int(text[i:i + 2], 16) for i in (0, 2, 4))


def read(path):
    img = Image.open(path).convert("RGBA")
    w, h = img.size
    px = img.load()
    fill = px[w // 2, h // 2]
    if fill[3] < 255:
        raise SystemExit(f"{path}: the center is not opaque, so it is not a filled plate")
    column = [px[w // 2, y] for y in range(h)]
    top = next(y for y, p in enumerate(column) if p[3] >= 200)
    outline = column[top][:3]
    thickness = 0
    for p in column[top:]:
        if p[:3] != outline:
            break
        thickness += 1
    hard = set(img.getchannel("A").histogram()[1:255]) == {0}  # pixel art: thickness is exact
    return {"size": (w, h), "fill": fill[:3], "outline": outline, "thickness": thickness, "hard": hard}


def main():
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("--layer", action="append", default=[])
    ap.add_argument("--state", action="append", default=[])
    ap.add_argument("--button", action="append", default=[])
    ap.add_argument("--text", action="append", default=[])
    args = ap.parse_args()
    failed = 0

    def check(ok, message):
        nonlocal failed
        print(("PASS  " if ok else "FAIL  ") + message)
        failed += not ok

    layers = {}
    previous = None
    for spec in args.layer:
        name, rest = spec.split("=", 1)
        path, _, flag = rest.partition(":")
        info = read(path)
        layers[name] = info
        fill_l = lstar(info["fill"])
        print(f"      {name}: fill {hexc(info['fill'])} L* {fill_l:.1f}, outline {hexc(info['outline'])}, {info['size'][0]}x{info['size'][1]}")
        if flag == "flat":
            check(info["outline"] == info["fill"], f"{name} is flat (no outline): edge {hexc(info['outline'])}")
        else:
            d = fill_l - lstar(info["outline"])
            check(d >= MIN_OUTLINE_DL, f"{name} outline is {d:.1f} L* darker than its fill (min {MIN_OUTLINE_DL})")
        if previous:
            d = abs(fill_l - lstar(layers[previous]["fill"]))
            check(d >= MIN_LAYER_DL, f"{name} vs {previous}: fill differs by {d:.1f} L* (min {MIN_LAYER_DL})")
        previous = name

    for spec in args.state:
        name, rest = spec.split("=", 1)
        path, _, base = rest.partition(":")
        info = read(path)
        if base not in layers:
            raise SystemExit(f"--state {name}: base layer {base} was not given with --layer")
        d = abs(lstar(info["fill"]) - lstar(layers[base]["fill"]))
        check(d >= MIN_STATE_DL, f"{name} vs {base}: fill differs by {d:.1f} L* (min {MIN_STATE_DL})")
        check(info["size"] == layers[base]["size"], f"{name} has the same size as {base}")

    buttons = [(path, read(path)) for path in args.button]
    for path, info in buttons:
        d = lstar(info["fill"]) - lstar(info["outline"])
        check(d >= MIN_OUTLINE_DL, f"{path}: outline is {d:.1f} L* darker than fill {hexc(info['fill'])} (min {MIN_OUTLINE_DL})")
    if len(buttons) > 1:
        sizes = {info["size"] for _, info in buttons}
        check(len(sizes) == 1, f"all buttons share one size: {sorted(sizes)}")
        if all(info["hard"] for _, info in buttons):
            thick = {info["thickness"] for _, info in buttons}
            check(len(thick) == 1, f"all buttons share one outline thickness: {sorted(thick)}")
        else:
            print("      outline thickness not compared: soft alpha (raster art)")

    for spec in args.text:
        color, _, layer = spec.partition("@")
        if layer not in layers:
            raise SystemExit(f"--text {spec}: layer {layer} was not given with --layer")
        r = ratio(parse_hex(color), layers[layer]["fill"])
        check(r >= MIN_TEXT_RATIO, f"text {color} on {layer}: {r:.2f}:1 (min {MIN_TEXT_RATIO})")

    print(f"{failed} check(s) failed." if failed else "All checks passed.")
    sys.exit(1 if failed else 0)


if __name__ == "__main__":
    main()
