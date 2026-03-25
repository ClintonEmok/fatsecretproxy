const request = require("supertest");
const axios = require("axios");
const app = require("../src/index");
const { resetTokenCache } = require("../src/services/fatsecret");

jest.mock("axios");

function resetMocks() {
  axios.post.mockReset();
  resetTokenCache();
}

function mockToken() {
  return { data: { access_token: "fake-token", expires_in: 86400 } };
}

describe("GET /api/recipes/search", () => {
  beforeEach(resetMocks);

  it("returns 400 when query param 'q' is missing", async () => {
    const res = await request(app).get("/api/recipes/search");
    expect(res.status).toBe(400);
    expect(res.body.error).toBe("Query parameter 'q' is required");
  });

  it("proxies search to FatSecret", async () => {
    axios.post.mockResolvedValueOnce(mockToken());
    axios.post.mockResolvedValueOnce({
      data: {
        recipes_search: {
          max_results: "20",
          total_results: "50",
          page_number: "0",
          results: {
            recipe: [{ recipe_id: "456", recipe_name: "Pasta Carbonara" }],
          },
        },
      },
    });

    const res = await request(app).get("/api/recipes/search?q=pasta");

    expect(res.status).toBe(200);
    expect(res.body.recipes_search.results.recipe[0].recipe_name).toBe(
      "Pasta Carbonara"
    );

    expect(axios.post.mock.calls[1][1]).toContain("method=recipes.search");
    expect(axios.post.mock.calls[1][1]).toContain("search_expression=pasta");
  });
});

describe("GET /api/recipes/:id", () => {
  beforeEach(resetMocks);

  it("proxies recipe get to FatSecret", async () => {
    axios.post.mockResolvedValueOnce(mockToken());
    axios.post.mockResolvedValueOnce({
      data: { recipe: { recipe_id: "456", recipe_name: "Pasta Carbonara" } },
    });

    const res = await request(app).get("/api/recipes/456");

    expect(res.status).toBe(200);
    expect(res.body.recipe.recipe_name).toBe("Pasta Carbonara");
    expect(axios.post.mock.calls[1][1]).toContain("method=recipe.get.v2");
    expect(axios.post.mock.calls[1][1]).toContain("recipe_id=456");
  });
});
