const express = require("express");
const { callFatSecret } = require("../services/fatsecret");

const router = express.Router();

router.get("/search", async (req, res, next) => {
  try {
    const { q, page_number, max_results } = req.query;
    if (!q) return res.status(400).json({ error: "Query parameter 'q' is required" });

    const data = await callFatSecret("recipes.search", {
      search_expression: q,
      page_number: page_number || 0,
      max_results: max_results || 20,
    });

    res.json(data);
  } catch (err) {
    next(err);
  }
});

router.get("/:id", async (req, res, next) => {
  try {
    const data = await callFatSecret("recipe.get.v2", {
      recipe_id: req.params.id,
    });
    res.json(data);
  } catch (err) {
    next(err);
  }
});

module.exports = router;
