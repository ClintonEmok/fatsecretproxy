import "dotenv/config";
import express, { Request, Response, NextFunction } from "express";
import cors from "cors";
import helmet from "helmet";
import morgan from "morgan";
import foodRoutes from "./routes/food";
import recipeRoutes from "./routes/recipe";

const app = express();

app.use(helmet());
app.use(cors());
app.use(morgan("dev"));
app.use(express.json());

app.get("/health", (_req: Request, res: Response) => {
  res.json({ status: "ok" });
});

app.use("/api/foods", foodRoutes);
app.use("/api/recipes", recipeRoutes);

interface HttpError extends Error {
  response?: {
    status: number;
    data: unknown;
  };
}

app.use((err: HttpError, _req: Request, res: Response, _next: NextFunction) => {
  console.error(err.message);
  const status = err.response?.status || 500;
  const data = err.response?.data || { error: err.message };
  res.status(status).json(data);
});

if (require.main === module) {
  const PORT = Number(process.env.PORT) || 3000;
  app.listen(PORT, "0.0.0.0", () => {
    console.log(`FatSecret proxy running on port ${PORT}`);
  });
}

export default app;
