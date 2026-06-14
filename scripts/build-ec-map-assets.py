#!/usr/bin/env python3
"""Extract Event Companion layout maps from the GW PDF into public/maps/ec/."""
from __future__ import annotations

import json
import sys
from pathlib import Path

import fitz

ROOT = Path(__file__).resolve().parents[1]
OUT_DIR = ROOT / "public" / "maps" / "ec"
DEFAULT_PDF = Path.home() / "Downloads" / "eng_12-06_warhammer40000_event_companion-s3bfb5f9s1-ivswuij3fo.pdf"

MATCHUPS: dict[str, int] = {
    "1": 33,
    "2": 27,
    "3": 12,
    "4": 24,
    "5": 30,
    "6": 21,
    "7": 9,
    "8": 15,
    "9": 18,
    "10": 51,
    "11": 48,
    "12": 42,
    "13": 45,
    "14": 39,
    "15": 36,
}

LABELS = ("a", "b", "c")
MATRIX = fitz.Matrix(2.5, 2.5)


def clip_for_page(page: fitz.Page) -> fitz.Rect:
    """Tight crop around map vectors; avoids the old 17% top trim that cut layouts."""
    xs: list[float] = []
    ys: list[float] = []
    for drawing in page.get_drawings():
        rect = drawing.get("rect")
        if rect:
            xs.extend((rect.x0, rect.x1))
            ys.extend((rect.y0, rect.y1))

    page_rect = page.rect
    if not xs:
        return fitz.Rect(
            page_rect.x0 + page_rect.width * 0.02,
            page_rect.y0 + page_rect.height * 0.08,
            page_rect.x1 - page_rect.width * 0.02,
            page_rect.y1 - page_rect.height * 0.05,
        )

    pad_x = page_rect.width * 0.02
    pad_y = page_rect.height * 0.015
    return fitz.Rect(
        min(xs) - pad_x,
        min(ys) - pad_y,
        max(xs) + pad_x,
        max(ys) + pad_y,
    ) & page_rect


def main() -> int:
    pdf_path = Path(sys.argv[1]) if len(sys.argv) > 1 else DEFAULT_PDF
    if not pdf_path.is_file():
        print(f"Missing PDF: {pdf_path}", file=sys.stderr)
        return 1

    OUT_DIR.mkdir(parents=True, exist_ok=True)
    doc = fitz.open(pdf_path)
    written = 0

    for mid, start in MATCHUPS.items():
        for offset, label in enumerate(LABELS):
            page = doc[start + offset - 1]
            clip = clip_for_page(page)
            pix = page.get_pixmap(matrix=MATRIX, clip=clip, alpha=False)
            out = OUT_DIR / f"matchup-{mid}-{label}.png"
            pix.save(out)
            written += 1
            print(f"✓ {out.name} ({pix.width}×{pix.height})")

    print(f"\nWrote {written} maps to {OUT_DIR}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
