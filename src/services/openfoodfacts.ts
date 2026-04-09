import Database from "better-sqlite3";
import path from "path";

const DB_PATH =
  process.env.OPENFOODFACTS_DB_PATH ||
  path.join(__dirname, "..", "..", "off-data", "openfoodfacts.db");

let db: Database.Database | null = null;

function getDb(): Database.Database {
  if (!db) {
    db = new Database(DB_PATH, { readonly: true, fileMustExist: true });
    db.pragma("journal_mode=WAL");
    db.pragma("cache_size=-64000");
  }
  return db;
}

export interface OFFProduct {
  code: string;
  product_name: string;
  generic_name: string;
  brands: string;
  categories: string;
  countries: string;
  image_url: string;
  image_front_url: string;
  image_front_small_url: string;
  image_nutrition_url: string;
  image_ingredients_url: string;
  ingredients_text: string;
  nutri_score: string;
  nova_group: string;
}

export interface OFFSearchResult {
  count: number;
  page: number;
  page_size: number;
  products: OFFProduct[];
}

export interface OFFProductResponse {
  code: string;
  product: OFFProduct | null;
  status: number;
  status_verbose: string;
}

export function searchProducts(
  query: string,
  limit = 20,
  offset = 0
): OFFSearchResult {
  const d = getDb();

  const products = d
    .prepare(
      `
    SELECT p.code, p.product_name, p.generic_name, p.brands, p.categories,
           p.countries, p.image_url, p.image_front_url, p.image_front_small_url,
           p.image_nutrition_url, p.image_ingredients_url, p.ingredients_text,
           p.nutri_score, p.nova_group
    FROM products p
    INNER JOIN products_fts fts ON p.id = fts.rowid
    WHERE products_fts MATCH ?
    ORDER BY rank
    LIMIT ? OFFSET ?
  `
    )
    .all(query, limit, offset) as OFFProduct[];

  const totalRow = d
    .prepare(
      `
    SELECT COUNT(*) as cnt
    FROM products p
    INNER JOIN products_fts fts ON p.id = fts.rowid
    WHERE products_fts MATCH ?
  `
    )
    .get(query) as { cnt: number };

  return {
    count: totalRow.cnt,
    page: Math.floor(offset / limit) + 1,
    page_size: limit,
    products,
  };
}

export function getProductByBarcode(
  barcode: string
): OFFProductResponse {
  const d = getDb();
  const product = d
    .prepare(
      `
    SELECT code, product_name, generic_name, brands, categories, countries,
           image_url, image_front_url, image_front_small_url, image_nutrition_url,
           image_ingredients_url, ingredients_text, nutri_score, nova_group
     FROM products
     WHERE code = ?
  `
    )
    .get(barcode) as OFFProduct | null;

  if (product) {
    return {
      code: product.code,
      product,
      status: 1,
      status_verbose: "product found",
    };
  }
  return {
    code: barcode,
    product: null,
    status: 0,
    status_verbose: "product not found",
  };
}

export function getProductByCode(code: string): OFFProductResponse {
  return getProductByBarcode(code);
}

export function getStats(): { total: number; with_images: number } {
  const d = getDb();
  const total = d
    .prepare("SELECT COUNT(*) as cnt FROM products")
    .get() as { cnt: number };
  const withImages = d
    .prepare(
      "SELECT COUNT(*) as cnt FROM products WHERE image_front_url != ''"
    )
    .get() as { cnt: number };
  return { total: total.cnt, with_images: withImages.cnt };
}

export function closeDb(): void {
  if (db) {
    db.close();
    db = null;
  }
}
