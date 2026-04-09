# OpenFoodFacts Data Setup Guide

Setting up a local OpenFoodFacts (OFF) database using SQLite + FTS5 on a Hostinger KVM 1 (1 vCPU, 4GB RAM, 50GB NVMe).

---

## Architecture Overview

```
JSONL Dump (4.8GB compressed)
        │
        ▼
  Python Script (scripts/build_openfoodfacts_sqlite.py)
  - Reads JSONL.gz directly
  - Reconstructs image URLs from images.selected metadata
  - Deduplicates by code
        │
        ▼
  SQLite DB (~2GB with FTS5 index)
  - 4M products, 2.2M with image URLs
        │
        ▼
  Express Proxy (better-sqlite3, readonly)
        │
        ▼
  /api/openfoodfacts/search?q=apple
  /api/openfoodfacts/barcode/:code
  /api/openfoodfacts/health
```

---

## Quick Start (Local Development)

```bash
# 1. Download JSONL dump
mkdir -p off-data
wget -c https://static.openfoodfacts.org/data/openfoodfacts-products.jsonl.gz -O off-data/openfoodfacts-products.jsonl.gz

# 2. Build SQLite DB (~15 min)
python3 scripts/build_openfoodfacts_sqlite.py \
  --input off-data/openfoodfacts-products.jsonl.gz \
  --output off-data/openfoodfacts.db

# 3. Install dependencies
npm install better-sqlite3 --legacy-peer-deps
npm install -D @types/better-sqlite3 --legacy-peer-deps

# 4. Start server
npm run dev
```

---

## Server Deployment

### 1. Prerequisites

```bash
apt update && apt upgrade -y
apt install -y wget curl python3 sqlite3
```

### 2. Download data

```bash
mkdir -p /opt/off-data
cd /opt/off-data
wget -c https://static.openfoodfacts.org/data/openfoodfacts-products.jsonl.gz
```

### 3. Build database

```bash
cd /path/to/fatsecretproxy
python3 scripts/build_openfoodfacts_sqlite.py \
  --input /opt/off-data/openfoodfacts-products.jsonl.gz \
  --output /opt/off-data/openfoodfacts.db
```

### 4. Configure

Set the DB path via environment variable:

```bash
export OPENFOODFACTS_DB_PATH=/opt/off-data/openfoodfacts.db
```

Or it defaults to `off-data/openfoodfacts.db` relative to the project root.

### 5. Run

```bash
npm run build
npm start
```

---

## API Endpoints

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/openfoodfacts/search?q=apple&limit=20&offset=0` | Full-text search |
| GET | `/api/openfoodfacts/barcode/:code` | Lookup by barcode |
| GET | `/api/openfoodfacts/health` | DB status and product count |

### Search

```bash
curl "http://localhost:3000/api/openfoodfacts/search?q=nutella&limit=2"
```

```json
{
  "products": [
    {
      "code": "0009800000753",
      "product_name": "Nutella",
      "brands": "Nutella",
      "image_url": "https://images.openfoodfacts.org/images/products/000/980/000/075/3/front_en.6.400.jpg",
      "image_front_url": "https://images.openfoodfacts.org/images/products/000/980/000/075/3/front_en.6.400.jpg",
      "image_front_small_url": "https://images.openfoodfacts.org/images/products/000/980/000/075/3/front_en.6.200.jpg"
    }
  ],
  "total": 897,
  "page": 1,
  "per_page": 2
}
```

### Barcode

```bash
curl "http://localhost:3000/api/openfoodfacts/barcode/3017620422003"
```

### Health

```bash
curl "http://localhost:3000/api/openfoodfacts/health"
```

```json
{ "status": "ok", "total": 4074203, "with_images": 2268344 }
```

---

## Image URL Structure

The JSONL dump stores image metadata differently from the API. The Python script reconstructs URLs:

- **Pattern:** `https://images.openfoodfacts.org/images/products/{code_path}/{kind}_{lang}.{rev}.{size}.jpg`
- **Code path:** barcode split into groups of 3 (e.g., `3017620422003` → `301/762/042/200/3`)
- **Available sizes:** 200 (small), 400 (full)
- **Image kinds:** `front`, `nutrition`, `ingredients`

---

## Weekly Updates

```bash
#!/bin/bash
# /opt/off-data/update-off.sh
set -e

cd /opt/off-data
wget -c https://static.openfoodfacts.org/data/openfoodfacts-products.jsonl.gz -O openfoodfacts-products-new.jsonl.gz

python3 /path/to/fatsecretproxy/scripts/build_openfoodfacts_sqlite.py \
  --input openfoodfacts-products-new.jsonl.gz \
  --output openfoodfacts-new.db

mv openfoodfacts.db openfoodfacts-old.db
mv openfoodfacts-new.db openfoodfacts.db
rm -f openfoodfacts-old.db
mv openfoodfacts-products-new.jsonl.gz openfoodfacts-products.jsonl.gz
```

Cron: `0 3 * * 0 /opt/off-data/update-off.sh >> /var/log/off-update.log 2>&1`

---

## Disk Usage

| Item | Size |
|------|------|
| JSONL (compressed) | ~4.8 GB |
| SQLite database | ~2.0 GB |
| Node.js app + deps | ~0.5 GB |
| OS | ~5 GB |
| **Total used** | **~13 GB** |
| **Free on 50GB disk** | **~37 GB** |
