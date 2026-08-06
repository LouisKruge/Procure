"""
Extracts the Eventspec stock workbook into a compact pipe-delimited feed for
import. One spreadsheet row becomes one stock item: items that appear in two
bins stay as two lines, because that is how they physically sit on the racks.

Emits: area|sku|description|type|bin|location|qty|price|supplier|uom
"""

import math
import re
import sys
from collections import Counter

import openpyxl

SRC = "/root/.claude/uploads/0031d502-5b40-5a30-84ab-8c3c608bfb15/95832876-JULY2026_UPDATED_Eventspec_stock.xlsx"
OUT = "/home/user/Procure/scripts/stock-feed.txt"


def num(v, default=None):
    if v is None:
        return default
    try:
        f = float(str(v).strip())
        return f if math.isfinite(f) else default
    except (TypeError, ValueError):
        return default


def clean(v):
    if v is None:
        return ""
    s = str(v).replace("|", "/").replace("\n", " ").strip()
    s = re.sub(r"\s+", " ", s)
    return "" if s.upper() in {"NA", "N/A", "#N/A", "NONE", "-"} else s


def title(s):
    """Sheets are shouted in all-caps; sentence case reads better on a phone."""
    return s.title() if s.isupper() else s


class SkuMinter:
    """Stock codes repeat in the sheets, so uniqueness is enforced here."""

    def __init__(self):
        self.seen = Counter()

    def mint(self, prefix, raw, seq):
        base = re.sub(r"[^A-Z0-9./-]+", "-", clean(raw).upper()).strip("-")
        code = f"{prefix}-{base}" if base else f"{prefix}-{seq:05d}"
        code = code[:48]
        self.seen[code] += 1
        n = self.seen[code]
        return code if n == 1 else f"{code}#{n}"


def minimums(qty):
    """Starting reorder point: a quarter of what is held, nothing for dead lines."""
    if qty <= 0:
        return 0, 0
    rop = max(1, math.ceil(qty * 0.25))
    return rop, max(rop, math.ceil(qty * 0.5))


def main():
    wb = openpyxl.load_workbook(SRC, data_only=True)
    mint = SkuMinter()
    out = []
    stats = Counter()

    def emit(area, sku, desc, typ, bin_, loc, qty, price, sup, uom="EA"):
        if not desc and not sku:
            stats[f"{area}:skipped-empty"] += 1
            return
        rop, roq = minimums(qty)
        out.append(
            "|".join(
                [
                    area,
                    sku,
                    desc[:180],
                    typ[:60],
                    bin_[:24],
                    loc[:12],
                    f"{qty:g}",
                    f"{price:g}" if price else "",
                    sup[:60],
                    uom,
                    f"{rop:g}",
                    f"{roq:g}",
                ]
            )
        )
        stats[area] += 1

    # ---------------------------------------------------------- consumables
    ws = wb["FINAL CONSUMABLE STOCK "]
    for i, r in enumerate(ws.iter_rows(min_row=2, values_only=True), 1):
        if not any(c not in (None, "") for c in r):
            continue
        short, long_, price, typ, _code, wh, bin_, qty = (list(r) + [None] * 8)[:8]
        desc = clean(long_) or clean(short)
        if not desc:
            continue
        emit(
            "CONSUMABLE",
            mint.mint("CON", clean(bin_), i),
            title(desc),
            title(clean(typ)) or "Basic Consumable",
            clean(bin_),
            clean(wh),
            num(qty, 0) or 0,
            num(price) or 0,
            "",
        )

    # ------------------------------------------------------------- fittings
    ws = wb["FITTING STOCK"]
    for i, r in enumerate(ws.iter_rows(min_row=2, values_only=True), 1):
        if not any(c not in (None, "") for c in r):
            continue
        desc, code, bin_, sup, price, qty, _total = (list(r) + [None] * 7)[:7]
        desc = clean(desc)
        if not desc and not clean(code):
            continue
        emit(
            "FITTING",
            mint.mint("FIT", clean(code) or clean(bin_), i),
            title(desc) or clean(code),
            "",
            clean(bin_),
            "",
            num(qty, 0) or 0,
            num(price) or 0,
            clean(sup),
        )

    # -------------------------------------------------------- rebuild store
    ws = wb["REBUILD STORE STOCK"]
    for i, r in enumerate(ws.iter_rows(min_row=2, values_only=True), 1):
        if not any(c not in (None, "") for c in r):
            continue
        sup, code, desc, qty, price, _dt, _tot = (list(r) + [None] * 7)[:7]
        desc, code, sup = clean(desc), clean(code), clean(sup)
        # 105 rows carry only a supplier and part number - the part number is
        # the only identity they have, so it doubles as the description.
        label = desc or code
        if not label:
            stats["REBUILD:skipped-empty"] += 1
            continue
        emit(
            "REBUILD",
            mint.mint("RBS", code or label, i),
            title(label),
            "",
            "",
            "",
            num(qty, 0) or 0,
            num(price) or 0,
            sup,
        )

    # --------------------------------------------------------- electrical
    ws = wb["ELECTRICAL BAY STOCK"]
    for i, r in enumerate(ws.iter_rows(min_row=2, values_only=True), 1):
        if not any(c not in (None, "") for c in r):
            continue
        code, desc, bin_, sup, qty = (list(r) + [None] * 5)[:5]
        emit(
            "ELECTRICAL",
            mint.mint("ELE", clean(code), i),
            title(clean(desc)) or clean(code),
            "",
            clean(bin_),
            "",
            num(qty, 0) or 0,
            0,
            clean(sup),
        )

    # -------------------------------------------------------------- paints
    ws = wb["PAINTS"]
    for i, r in enumerate(ws.iter_rows(min_row=2, values_only=True), 1):
        desc, qty = (list(r) + [None] * 2)[:2]
        if not clean(desc):
            continue
        emit("PAINT", mint.mint("PNT", "", i), title(clean(desc)), "", "", "",
             num(qty, 0) or 0, 0, "", "EA")

    # ---------------------------------------------------------------- oils
    ws = wb["OILS"]
    for i, r in enumerate(ws.iter_rows(min_row=2, values_only=True), 1):
        desc, qty = (list(r) + [None] * 2)[:2]
        if not clean(desc):
            continue
        emit("OIL", mint.mint("OIL", "", i), title(clean(desc)), "", "", "",
             num(qty, 0) or 0, 0, "", "EA")

    with open(OUT, "w", encoding="utf-8") as fh:
        fh.write("\n".join(out))

    print(f"wrote {len(out)} lines -> {OUT}")
    for k, v in sorted(stats.items()):
        print(f"  {k:28} {v}")
    dupes = sum(1 for line in out if "#" in line.split("|")[1])
    print(f"  de-duplicated stock codes    {dupes}")
    print(f"  bytes                        {sum(len(x) for x in out) + len(out)}")


if __name__ == "__main__":
    sys.exit(main())
