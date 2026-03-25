const express = require("express");
const { callFatSecret, callFatSecretUrl } = require("../services/fatsecret");

const router = express.Router();

router.get("/search", async (req, res, next) => {
  try {
    const { q, page_number, max_results, food_type } = req.query;
    if (!q) return res.status(400).json({ error: "Query parameter 'q' is required" });

    const params = {
      search_expression: q,
      page_number: page_number || 0,
      max_results: max_results || 20,
    };

    if (food_type) params.food_type = food_type;
    params.include_food_images = true;

    const data = await callFatSecret("foods.search.v5", params);
    res.json(data);
  } catch (err) {
    next(err);
  }
});

router.get("/barcode/:barcode", async (req, res, next) => {
  try {
    const data = await callFatSecretUrl(
      "/food/barcode/find-by-id/v2",
      { barcode: req.params.barcode, include_food_images: true }
    );
    res.json(data);
  } catch (err) {
    next(err);
  }
});

router.get("/:id", async (req, res, next) => {
  try {
    const data = await callFatSecret("food.get.v5", {
      food_id: req.params.id,
    });
    res.json(data);
  } catch (err) {
    next(err);
  }
});

module.exports = router;
