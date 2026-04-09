#!/usr/bin/env python3
import argparse
import gzip
import json
import sqlite3
from pathlib import Path
from typing import Any, Dict, Optional


IMAGE_BASE = "https://images.openfoodfacts.org/images/products"


def code_path(code: str) -> str:
    # OFF splits into groups of 3 from the left, last segment gets remaining digits
    # e.g. "0888849005406" -> "088/884/900/5406" (4+3+3+3 = 13)
    remainder = len(code) % 3
    if remainder > 0:
        split = len(code) - (3 + remainder)
        groups = [code[i : i + 3] for i in range(0, split, 3)]
        groups.append(code[split:])
    else:
        groups = [code[i : i + 3] for i in range(0, len(code), 3)]
    return "/".join(groups)


def build_selected_image_url(images_obj: Dict[str, Any], kind: str, size: int) -> str:
    selected = images_obj.get("selected")
    if not isinstance(selected, dict):
        return ""

    kind_obj = selected.get(kind)
    if not isinstance(kind_obj, dict):
        return ""

    for lang, value in kind_obj.items():
        if not isinstance(value, dict):
            continue
        rev = value.get("rev")
        if rev is None:
            continue
        imgid = value.get("imgid")
        if imgid is None:
            continue

        return f"{kind}_{lang}.{rev}.{size}.jpg"
    return ""


def normalize_nova(product: Dict[str, Any]) -> str:
    nova_group = product.get("nova_group")
    if nova_group is not None and str(nova_group).strip() != "":
        return str(nova_group)

    tags = product.get("nova_groups_tags")
    if isinstance(tags, list) and tags:
        first = tags[0]
        return str(first) if first is not None else ""

    return ""


def get_text(product: Dict[str, Any], key: str) -> str:
    value = product.get(key)
    if value is None:
        return ""
    return str(value)


def build_record(product: Dict[str, Any]) -> Optional[tuple]:
    code = get_text(product, "code").strip()
    product_name = get_text(product, "product_name").strip()

    if not code or not product_name:
        return None

    images_obj = product.get("images")
    if not isinstance(images_obj, dict):
        images_obj = {}

    cp = code_path(code)

    front_400 = build_selected_image_url(images_obj, "front", 400)
    front_200 = build_selected_image_url(images_obj, "front", 200)
    nutrition_400 = build_selected_image_url(images_obj, "nutrition", 400)
    ingredients_400 = build_selected_image_url(images_obj, "ingredients", 400)

    image_front_url = f"{IMAGE_BASE}/{cp}/{front_400}" if front_400 else ""
    image_front_small_url = f"{IMAGE_BASE}/{cp}/{front_200}" if front_200 else ""
    image_nutrition_url = f"{IMAGE_BASE}/{cp}/{nutrition_400}" if nutrition_400 else ""
    image_ingredients_url = (
        f"{IMAGE_BASE}/{cp}/{ingredients_400}" if ingredients_400 else ""
    )

    image_url = image_front_url

    return (
        code,
        product_name,
        get_text(product, "generic_name"),
        get_text(product, "brands"),
        get_text(product, "categories"),
        get_text(product, "countries"),
        image_url,
        image_front_url,
        image_front_small_url,
        image_nutrition_url,
        image_ingredients_url,
        get_text(product, "ingredients_text"),
        get_text(product, "nutrition_grade_fr"),
        normalize_nova(product),
    )


def main() -> None:
    parser = argparse.ArgumentParser(
        description="Build OpenFoodFacts SQLite DB from JSONL.gz"
    )
    parser.add_argument(
        "--input", required=True, help="Path to openfoodfacts-products.jsonl.gz"
    )
    parser.add_argument("--output", required=True, help="Output sqlite db path")
    parser.add_argument(
        "--limit", type=int, default=0, help="Optional record limit for testing"
    )
    parser.add_argument(
        "--resume",
        action="store_true",
        help="Resume from existing DB (skip existing codes)",
    )
    args = parser.parse_args()

    input_path = Path(args.input)
    output_path = Path(args.output)

    if not input_path.exists():
        raise FileNotFoundError(f"Input file not found: {input_path}")

    if output_path.exists() and not args.resume:
        output_path.unlink()

    conn = sqlite3.connect(str(output_path))
    conn.execute("PRAGMA journal_mode=WAL")
    conn.execute("PRAGMA synchronous=NORMAL")
    conn.execute("PRAGMA temp_store=MEMORY")
    conn.execute("PRAGMA cache_size=-200000")

    if args.resume and output_path.exists():
        # Load existing codes for dedup
        existing = conn.execute("SELECT code FROM products").fetchall()
        seen_codes = {row[0] for row in existing}
        inserted = len(seen_codes)
        print(f"Resuming with {inserted:,} existing products")
    else:
        conn.executescript(
            """
            CREATE TABLE products (
              id INTEGER PRIMARY KEY AUTOINCREMENT,
              code TEXT NOT NULL,
              product_name TEXT NOT NULL DEFAULT '',
              generic_name TEXT NOT NULL DEFAULT '',
              brands TEXT NOT NULL DEFAULT '',
              categories TEXT NOT NULL DEFAULT '',
              countries TEXT NOT NULL DEFAULT '',
              image_url TEXT NOT NULL DEFAULT '',
              image_front_url TEXT NOT NULL DEFAULT '',
              image_front_small_url TEXT NOT NULL DEFAULT '',
              image_nutrition_url TEXT NOT NULL DEFAULT '',
              image_ingredients_url TEXT NOT NULL DEFAULT '',
              ingredients_text TEXT NOT NULL DEFAULT '',
              nutri_score TEXT NOT NULL DEFAULT '',
              nova_group TEXT NOT NULL DEFAULT ''
            );
            """
        )
        seen_codes = set()
        inserted = 0

    insert_sql = """
        INSERT INTO products (
          code, product_name, generic_name, brands, categories, countries,
          image_url, image_front_url, image_front_small_url, image_nutrition_url,
          image_ingredients_url, ingredients_text, nutri_score, nova_group
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    """

    batch = []
    processed = 0
    skipped_no_name = 0
    skipped_duplicates = 0
    bad_json = 0
    batch_size = 5000

    with gzip.open(input_path, "rt", encoding="utf-8", errors="ignore") as f:
        for line in f:
            processed += 1
            if args.limit and processed > args.limit:
                break

            try:
                product = json.loads(line)
            except json.JSONDecodeError:
                bad_json += 1
                continue

            record = build_record(product)
            if record is None:
                skipped_no_name += 1
                continue

            code = record[0]
            if code in seen_codes:
                skipped_duplicates += 1
                continue
            seen_codes.add(code)

            batch.append(record)

            if len(batch) >= batch_size:
                conn.executemany(insert_sql, batch)
                conn.commit()
                inserted += len(batch)
                batch.clear()

                if inserted % 100000 == 0:
                    print(f"Inserted: {inserted:,} | Processed: {processed:,}")

    if batch:
        conn.executemany(insert_sql, batch)
        conn.commit()
        inserted += len(batch)

    # Only create indexes/FTS if they don't already exist
    has_fts = conn.execute(
        "SELECT name FROM sqlite_master WHERE type='table' AND name='products_fts'"
    ).fetchone()
    if not has_fts:
        conn.executescript(
            """
            CREATE INDEX IF NOT EXISTS idx_products_code ON products(code);
            CREATE INDEX IF NOT EXISTS idx_products_brands ON products(brands);

            CREATE VIRTUAL TABLE products_fts USING fts5(
              product_name,
              brands,
              categories,
              content=products,
              content_rowid=id
            );

            INSERT INTO products_fts(rowid, product_name, brands, categories)
              SELECT id, product_name, brands, categories FROM products;

            ANALYZE;
            """
        )
    conn.commit()

    total_with_images = conn.execute(
        "SELECT COUNT(*) FROM products WHERE image_front_url != ''"
    ).fetchone()[0]

    conn.close()

    print("Done")
    print(f"Processed: {processed:,}")
    print(f"Inserted: {inserted:,}")
    print(f"Skipped (missing code/name): {skipped_no_name:,}")
    print(f"Skipped (duplicate code): {skipped_duplicates:,}")
    print(f"Bad JSON lines: {bad_json:,}")
    print(f"Products with front image URL: {total_with_images:,}")
    print(f"Output DB: {output_path}")


if __name__ == "__main__":
    main()
