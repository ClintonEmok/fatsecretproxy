import request from "supertest";
import app from "../src/index";

jest.mock("../src/services/openfoodfacts", () => ({
  searchProducts: jest.fn(),
  getProductByBarcode: jest.fn(),
  getStats: jest.fn(),
}));

import {
  searchProducts,
  getProductByBarcode,
  getStats,
} from "../src/services/openfoodfacts";

const mockSearchProducts = searchProducts as jest.Mock;
const mockGetProductByBarcode = getProductByBarcode as jest.Mock;
const mockGetStats = getStats as jest.Mock;

describe("GET /api/openfoodfacts/search", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("returns 400 when query param 'q' is missing", async () => {
    const res = await request(app).get("/api/openfoodfacts/search");
    expect(res.status).toBe(400);
    expect(res.body.error).toBe("Query parameter 'q' is required");
  });

  it("returns search results in OFF API format", async () => {
    mockSearchProducts.mockReturnValue({
      count: 2,
      page: 1,
      page_size: 20,
      products: [
        {
          code: "3017620422003",
          product_name: "Nutella",
          generic_name: "Pâte à tartiner",
          brands: "Nutella",
          categories: "Pâtes à tartiner au chocolat",
          countries: "France",
          image_url: "https://images.openfoodfacts.org/images/products/301/762/042/2003/front_it.467.400.jpg",
          image_front_url: "https://images.openfoodfacts.org/images/products/301/762/042/2003/front_it.467.400.jpg",
          image_front_small_url: "https://images.openfoodfacts.org/images/products/301/762/042/2003/front_it.467.200.jpg",
          image_nutrition_url: "",
          image_ingredients_url: "",
          ingredients_text: "Sucre, huile de palme...",
          nutri_score: "e",
          nova_group: "4",
        },
      ],
    });

    const res = await request(app).get("/api/openfoodfacts/search?q=nutella");

    expect(res.status).toBe(200);
    expect(res.body.count).toBe(2);
    expect(res.body.page).toBe(1);
    expect(res.body.page_size).toBe(20);
    expect(res.body.products).toHaveLength(1);
    expect(res.body.products[0].product_name).toBe("Nutella");
    expect(mockSearchProducts).toHaveBeenCalledWith("nutella", 20, 0);
  });

  it("respects limit and offset parameters", async () => {
    mockSearchProducts.mockReturnValue({
      count: 100,
      page: 3,
      page_size: 10,
      products: [],
    });

    await request(app).get("/api/openfoodfacts/search?q=apple&limit=10&offset=20");

    expect(mockSearchProducts).toHaveBeenCalledWith("apple", 10, 20);
  });

  it("caps limit at 100", async () => {
    mockSearchProducts.mockReturnValue({
      count: 0,
      page: 1,
      page_size: 100,
      products: [],
    });

    await request(app).get("/api/openfoodfacts/search?q=apple&limit=500");

    expect(mockSearchProducts).toHaveBeenCalledWith("apple", 100, 0);
  });

  it("handles queries with hyphens without SQL errors", async () => {
    mockSearchProducts.mockReturnValue({
      count: 1,
      page: 1,
      page_size: 10,
      products: [
        {
          code: "0895835001029",
          product_name: "Siete Grain-Free Tortilla Chips",
          generic_name: "",
          brands: "Siete",
          categories: "",
          countries: "United States",
          image_url: "",
          image_front_url: "",
          image_front_small_url: "",
          image_nutrition_url: "",
          image_ingredients_url: "",
          ingredients_text: "",
          nutri_score: "unknown",
          nova_group: "unknown",
        },
      ],
    });

    const res = await request(app).get("/api/openfoodfacts/search?q=Siete%20Grain-Free%20Tortilla%20Chips");

    expect(res.status).toBe(200);
    expect(mockSearchProducts).toHaveBeenCalledWith("Siete Grain-Free Tortilla Chips", 20, 0);
  });
});

describe("GET /api/openfoodfacts/barcode/:code", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("returns product with status 1 when found", async () => {
    mockGetProductByBarcode.mockReturnValue({
      code: "3017620422003",
      product: {
        code: "3017620422003",
        product_name: "Nutella",
        generic_name: "Pâte à tartiner",
        brands: "Nutella",
        categories: "Pâtes à tartiner au chocolat",
        countries: "France",
        image_url: "https://images.openfoodfacts.org/images/products/301/762/042/2003/front_it.467.400.jpg",
        image_front_url: "https://images.openfoodfacts.org/images/products/301/762/042/2003/front_it.467.400.jpg",
        image_front_small_url: "https://images.openfoodfacts.org/images/products/301/762/042/2003/front_it.467.200.jpg",
        image_nutrition_url: "",
        image_ingredients_url: "",
        ingredients_text: "Sucre, huile de palme...",
        nutri_score: "e",
        nova_group: "4",
      },
      status: 1,
      status_verbose: "product found",
    });

    const res = await request(app).get("/api/openfoodfacts/barcode/3017620422003");

    expect(res.status).toBe(200);
    expect(res.body.status).toBe(1);
    expect(res.body.status_verbose).toBe("product found");
    expect(res.body.product.product_name).toBe("Nutella");
  });

  it("returns 404 with status 0 when product not found", async () => {
    mockGetProductByBarcode.mockReturnValue({
      code: "0000000000000",
      product: null,
      status: 0,
      status_verbose: "product not found",
    });

    const res = await request(app).get("/api/openfoodfacts/barcode/0000000000000");

    expect(res.status).toBe(404);
    expect(res.body.status).toBe(0);
    expect(res.body.status_verbose).toBe("product not found");
    expect(res.body.product).toBeNull();
  });
});

describe("GET /api/openfoodfacts/health", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("returns health status with stats", async () => {
    mockGetStats.mockReturnValue({
      total: 4074203,
      with_images: 2268344,
    });

    const res = await request(app).get("/api/openfoodfacts/health");

    expect(res.status).toBe(200);
    expect(res.body.status).toBe("ok");
    expect(res.body.total).toBe(4074203);
    expect(res.body.with_images).toBe(2268344);
  });
});
