import { Router, Request, Response, NextFunction } from "express";
import { callFatSecret } from "../services/fatsecret";

const router = Router();

type AsyncHandler = (req: Request, res: Response, next: NextFunction) => Promise<void>;

router.get("/search", (async (req, res, next) => {
  try {
    const { q, page_number, max_results } = req.query;
    if (!q) {
      res.status(400).json({ error: "Query parameter 'q' is required" });
      return;
    }

    const data = await callFatSecret("recipes.search", {
      search_expression: String(q),
      page_number: Number(page_number) || 0,
      max_results: Number(max_results) || 20,
    });

    res.json(data);
  } catch (err) {
    next(err);
  }
}) as AsyncHandler);

router.get("/:id", (async (req, res, next) => {
  try {
    const data = await callFatSecret("recipe.get.v2", {
      recipe_id: String(req.params.id),
    });
    res.json(data);
  } catch (err) {
    next(err);
  }
}) as AsyncHandler);

export default router;
