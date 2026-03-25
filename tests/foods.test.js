const request = require("supertest");
const axios = require("axios");
const app = require("../src/index");
const { resetTokenCache } = require("../src/services/fatsecret");

jest.mock("axios");

function resetMocks() {
  axios.post.mockReset();
  axios.get.mockReset();
  resetTokenCache();
}

function mockToken() {
  return { data: { access_token: "fake-token", expires_in: 86400 } };
}

describe("GET /api/foods/search", () => {
  beforeEach(resetMocks);

  it("returns 400 when query param 'q' is missing", async () => {
    const res = await request(app).get("/api/foods/search");
    expect(res.status).toBe(400);
    expect(res.body.error).toBe("Query parameter 'q' is required");
  });

  it("proxies search to FatSecret v5 with images", async () => {
    axios.post.mockResolvedValueOnce(mockToken());
    axios.post.mockResolvedValueOnce({
      data: {
        foods_search: {
          max_results: "20",
          total_results: "100",
          page_number: "0",
          results: { food: [{ food_id: "123", food_name: "Chicken" }] },
        },
      },
    });

    const res = await request(app).get("/api/foods/search?q=chicken");

    expect(res.status).toBe(200);
    expect(res.body.foods_search.results.food[0].food_name).toBe("Chicken");

    expect(axios.post.mock.calls[1][1]).toContain("method=foods.search.v5");
    expect(axios.post.mock.calls[1][1]).toContain("include_food_images=true");
  });

  it("passes food_type filter when provided", async () => {
    axios.post.mockResolvedValueOnce(mockToken());
    axios.post.mockResolvedValueOnce({ data: { foods_search: {} } });

    await request(app).get("/api/foods/search?q=chicken&food_type=brand");

    expect(axios.post).toHaveBeenCalledTimes(2);
    expect(axios.post.mock.calls[1][1]).toContain("food_type=brand");
  });
});

describe("GET /api/foods/barcode/:barcode", () => {
  beforeEach(resetMocks);

  it("proxies barcode lookup to FatSecret v2", async () => {
    axios.post.mockResolvedValueOnce(mockToken());
    axios.get.mockResolvedValueOnce({
      data: {
        food: {
          food_id: "50953",
          food_name: "Whole Grain Cheerios",
          brand_name: "General Mills",
        },
      },
    });

    const res = await request(app).get("/api/foods/barcode/0001600027527");

    expect(res.status).toBe(200);
    expect(res.body.food.food_name).toBe("Whole Grain Cheerios");

    expect(axios.get.mock.calls[0][0]).toContain("/food/barcode/find-by-id/v2");
    expect(axios.get.mock.calls[0][0]).toContain("include_food_images=true");
  });
});

describe("GET /api/foods/:id", () => {
  beforeEach(resetMocks);

  it("proxies food get to FatSecret v5", async () => {
    axios.post.mockResolvedValueOnce(mockToken());
    axios.post.mockResolvedValueOnce({
      data: { food: { food_id: "1641", food_name: "Chicken Breast" } },
    });

    const res = await request(app).get("/api/foods/1641");

    expect(res.status).toBe(200);
    expect(res.body.food.food_name).toBe("Chicken Breast");
    expect(axios.post.mock.calls[1][1]).toContain("method=food.get.v5");
    expect(axios.post.mock.calls[1][1]).toContain("food_id=1641");
  });
});
