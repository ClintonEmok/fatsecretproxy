API Endpoints
===========

This document lists the HTTP endpoints provided by this FatSecret proxy application.

Notes
- The service proxies requests to the FatSecret Platform API using client-credentials OAuth2.
- Environment variables: `FATSECRET_CLIENT_ID`, `FATSECRET_CLIENT_SECRET` (see `.planning/research/fatsecret-oauth2.md`).
- All responses are JSON. Errors from FatSecret are forwarded; the proxy returns a JSON error body and an appropriate HTTP status.

Endpoints
---------

- `GET /health`
  - Description: Liveness/healthcheck endpoint.
  - Response: `{ "status": "ok" }`
  - Example:

```json
GET /health
200
{
  "status": "ok"
}
```

- `GET /api/foods/search`
  - Description: Search foods by text expression (proxied to `foods.search.v5`).
  - Query parameters:
    - `q` (required) — search expression
    - `page_number` (optional, default `0`)
    - `max_results` (optional, default `20`)
    - `food_type` (optional) — filter by food type
  - Notes: `include_food_images` is set to `true` by the proxy.
  - Example:

```bash
curl -G "http://localhost:3000/api/foods/search" \
  --data-urlencode "q=apple" \
  --data-urlencode "max_results=10"
```

- `GET /api/foods/barcode/:barcode`
  - Description: Find a food by barcode (proxied to `/food/barcode/find-by-id/v2`).
  - Path parameters:
    - `:barcode` (required)
  - Notes: `include_food_images` is set to `true` by the proxy.
  - Example:

```bash
curl "http://localhost:3000/api/foods/barcode/0123456789012"
```

- `GET /api/foods/:id`
  - Description: Get food details by FatSecret food id (proxied to `food.get.v5`).
  - Path parameters:
    - `:id` (required)
  - Notes: `include_food_images` is set to `true` by the proxy.
  - Example:

```bash
curl "http://localhost:3000/api/foods/123456"
```

- `GET /api/recipes/search`
  - Description: Search recipes by text expression (proxied to `recipes.search`).
  - Query parameters:
    - `q` (required) — search expression
    - `page_number` (optional, default `0`)
    - `max_results` (optional, default `20`)
  - Example:

```bash
curl -G "http://localhost:3000/api/recipes/search" \
  --data-urlencode "q=chicken" \
  --data-urlencode "max_results=5"
```

- `GET /api/recipes/:id`
  - Description: Get recipe details by FatSecret recipe id (proxied to `recipe.get.v2`).
  - Path parameters:
    - `:id` (required)
  - Example:

```bash
curl "http://localhost:3000/api/recipes/98765"
```

## OpenFoodFacts (Local SQLite)

The local OpenFoodFacts database mirrors the OFF API response format.

- `GET /api/openfoodfacts/search`
  - Description: Full-text search of OpenFoodFacts products (local SQLite + FTS5).
  - Query parameters:
    - `q` (required) — search expression
    - `limit` (optional, default `20`, max `100`)
    - `offset` (optional, default `0`)
  - Response format:
    - `count` — total matching products
    - `page` — current page number
    - `page_size` — results per page
    - `products` — array of product objects
  - Example:

```bash
curl -G "http://localhost:3000/api/openfoodfacts/search" \
  --data-urlencode "q=nutella" \
  --data-urlencode "limit=3"
```

```json
{
  "count": 897,
  "page": 1,
  "page_size": 3,
  "products": [
    {
      "code": "0009800000753",
      "product_name": "Nutella",
      "generic_name": "",
      "brands": "Nutella",
      "categories": "",
      "countries": "United States",
      "image_url": "https://images.openfoodfacts.org/images/products/000/980/000/0753/front_en.6.400.jpg",
      "image_front_url": "https://images.openfoodfacts.org/images/products/000/980/000/0753/front_en.6.400.jpg",
      "image_front_small_url": "https://images.openfoodfacts.org/images/products/000/980/000/0753/front_en.6.200.jpg",
      "image_nutrition_url": "",
      "image_ingredients_url": "",
      "ingredients_text": "SUGAR, PALM OIL, HAZELNUTS...",
      "nutri_score": "unknown",
      "nova_group": "4"
    }
  ]
}
```

- `GET /api/openfoodfacts/barcode/:code`
  - Description: Lookup an OpenFoodFacts product by barcode. Response format matches OFF API.
  - Path parameters:
    - `:code` (required)
  - Response format:
    - `code` — product barcode
    - `product` — product object (null if not found)
    - `status` — 1 = found, 0 = not found
    - `status_verbose` — human-readable status
  - Example:

```bash
curl "http://localhost:3000/api/openfoodfacts/barcode/3017620422003"
```

```json
{
  "code": "3017620422003",
  "product": {
    "code": "3017620422003",
    "product_name": "Nutella",
    "generic_name": "Pâte à tartiner aux noisettes et au cacao",
    "brands": "Nutella",
    "categories": "Pâtes à tartiner au chocolat",
    "countries": "Belgique,France,Allemagne...",
    "image_url": "https://images.openfoodfacts.org/images/products/301/762/042/2003/front_it.467.400.jpg",
    "image_front_url": "https://images.openfoodfacts.org/images/products/301/762/042/2003/front_it.467.400.jpg",
    "image_front_small_url": "https://images.openfoodfacts.org/images/products/301/762/042/2003/front_it.467.200.jpg",
    "image_nutrition_url": "https://images.openfoodfacts.org/images/products/301/762/042/2003/nutrition_fr.829.400.jpg",
    "image_ingredients_url": "https://images.openfoodfacts.org/images/products/301/762/042/2003/ingredients_de.443.400.jpg",
    "ingredients_text": "Sucre, huile de palme, NOISETTES 13%...",
    "nutri_score": "e",
    "nova_group": "4"
  },
  "status": 1,
  "status_verbose": "product found"
}
```

- `GET /api/openfoodfacts/health`
  - Description: Database health check and product counts.
  - Response: `{ "status": "ok", "total": 4074203, "with_images": 2268344 }`

Error handling
- If a required parameter is missing the proxy returns `400` with a JSON error body, e.g. `{ "error": "Query parameter 'q' is required" }`.
- For upstream FatSecret errors the proxy forwards status and response body when available; otherwise it returns `500`.

Implementation notes
- Routes live in `src/routes/food.ts`, `src/routes/recipe.ts`, and `src/routes/openfoodfacts.ts`.
- The FatSecret client is implemented in `src/services/fatsecret.ts` and caches an access token.
- OpenFoodFacts data is served from a local SQLite database via `src/services/openfoodfacts.ts` (better-sqlite3, readonly mode).
