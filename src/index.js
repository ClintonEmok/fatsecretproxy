require("dotenv").config();
const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const morgan = require("morgan");

const foodRoutes = require("./routes/food");
const recipeRoutes = require("./routes/recipe");

const app = express();
const PORT = process.env.PORT || 3000;

app.use(helmet());
app.use(cors());
app.use(morgan("dev"));
app.use(express.json());

app.get("/health", (req, res) => {
  res.json({ status: "ok" });
});

app.use("/api/foods", foodRoutes);
app.use("/api/recipes", recipeRoutes);

app.use((err, req, res, next) => {
  console.error(err.message);
  const status = err.response?.status || 500;
  const data = err.response?.data || { error: err.message };
  res.status(status).json(data);
});

app.listen(PORT, () => {
  console.log(`FatSecret proxy running on port ${PORT}`);
});
