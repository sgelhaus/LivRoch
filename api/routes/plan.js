import { Router } from "express";
import { readFileSync } from "fs";
import { fileURLToPath } from "url";
import { dirname, join } from "path";
import { planRouteWithWatsonx } from "../services/watsonx.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const hosts = JSON.parse(
  readFileSync(join(__dirname, "../data/hosts.json"), "utf-8")
);

const router = Router();

/**
 * POST /plan-route
 * Body: {
 *   query: "Rochester to Detroit Zoo in 2 days",
 *   lat?: number,   // rider's real GPS latitude  (optional)
 *   lng?: number    // rider's real GPS longitude (optional)
 * }
 *
 * Returns the parsed route and suggested charging stops.
 * When lat/lng are provided the route is planned relative to the
 * rider's actual current position (real-location mode).
 */
router.post("/", async (req, res) => {
  const { query, lat, lng } = req.body;

  if (!query || typeof query !== "string") {
    return res.status(400).json({ error: "query is required" });
  }

  // Build optional rider location object
  const riderLocation =
    lat !== undefined && lng !== undefined
      ? { lat: parseFloat(lat), lng: parseFloat(lng) }
      : null;

  try {
    const plan = await planRouteWithWatsonx(query, hosts, riderLocation);
    res.json(plan);
  } catch (err) {
    console.error("watsonx error:", err.message);
    res.status(500).json({ error: "Route planning failed", detail: err.message });
  }
});

export default router;
