import { Router, Request, Response, NextFunction } from "express";
import { callFatSecret, callFatSecretUrl } from "../services/fatsecret";

const router = Router();

type AsyncHandler = (req: Request, res: Response, next: NextFunction) => Promise<void>;

router.get("/search", (async (req, res, next) => {
  try {
    const { q, page_number, max_results, food_type } = req.query;
    if (!q) {
      res.status(400).json({ error: "Query parameter 'q' is required" });
      return;
    }

    const params: Record<string, string | number | boolean> = {
      search_expression: String(q),
      page_number: Number(page_number) || 0,
      max_results: Number(max_results) || 20,
      include_food_images: true,
    };

    if (food_type) params.food_type = String(food_type);

    const data = await callFatSecret("foods.search.v5", params);
    res.json(data);
  } catch (err) {
    next(err);
  }
}) as AsyncHandler);

router.get("/barcode/:barcode", (async (req, res, next) => {
  try {
    const data = await callFatSecretUrl("/food/barcode/find-by-id/v2", {
      barcode: String(req.params.barcode),
      include_food_images: true,
    });
    res.json(data);
  } catch (err) {
    next(err);
  }
}) as AsyncHandler);

router.get("/:id", (async (req, res, next) => {
  try {
    const data = await callFatSecret("food.get.v5", {
      food_id: String(req.params.id),
      include_food_images: true,
    });
    res.json(data);
  } catch (err) {
    next(err);
  }
}) as AsyncHandler);

export default router;
