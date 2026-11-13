import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import planRoutes from "./routes/plan.js";
import hostRoutes from "./routes/hosts.js";
import bookingRoutes from "./routes/bookings.js";

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());

app.use("/plan-route", planRoutes);
app.use("/hosts", hostRoutes);
app.use("/bookings", bookingRoutes);

app.get("/health", (_req, res) => res.json({ status: "ok", app: "LivRoch API" }));

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`LivRoch API running on http://localhost:${PORT}`);
});
