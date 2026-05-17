import "dotenv/config";
import cors from "cors";
import express from "express";
import { auditRouter } from "./routes/audit.js";

const app = express();
const port = Number(process.env.PORT) || 4000;

app.use(cors());
app.use(express.json());

app.get("/health", (_req, res) => {
  res.json({ ok: true, service: "shipcheck-api" });
});

app.use("/api", auditRouter);

app.listen(port, () => {
  console.log(`ShipCheck API listening on http://localhost:${port}`);
});
