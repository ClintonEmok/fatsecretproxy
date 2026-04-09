import { Router, Request, Response, NextFunction } from "express";
import {
  searchProducts,
  getProductByBarcode,
  getStats,
} from "../services/openfoodfacts";

const router = Router();

type AsyncHandler = (req: Request, res: Response, next: NextFunction) => Promise<void>;

router.get("/search", (async (req, res, next) => {
  try {
    const { q, limit, offset } = req.query;
    if (!q) {
      res.status(400).json({ error: "Query parameter 'q' is required" });
      return;
    }

    const result = searchProducts(
      String(q),
      Math.min(Number(limit) || 20, 100),
      Number(offset) || 0
    );
    res.json(result);
  } catch (err) {
    next(err);
  }
}) as AsyncHandler);

router.get("/barcode/:code", (async (req, res, next) => {
  try {
    const result = getProductByBarcode(String(req.params.code));
    if (result.status === 0) {
      res.status(404).json(result);
      return;
    }
    res.json(result);
  } catch (err) {
    next(err);
  }
}) as AsyncHandler);

router.get("/health", ((_req, res, next) => {
  try {
    const stats = getStats();
    res.json({ status: "ok", ...stats });
  } catch (err) {
    next(err);
  }
}) as AsyncHandler);

export default router;
