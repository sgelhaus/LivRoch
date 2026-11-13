import { Router } from "express";
import { readFileSync } from "fs";
import { fileURLToPath } from "url";
import { dirname, join } from "path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const hosts = JSON.parse(
  readFileSync(join(__dirname, "../data/hosts.json"), "utf-8")
);

const router = Router();

// GET /hosts — return all hosts
router.get("/", (_req, res) => {
  res.json({ hosts });
});

// GET /hosts/:id — return a single host
router.get("/:id", (req, res) => {
  const host = hosts.find((h) => h.id === req.params.id);
  if (!host) return res.status(404).json({ error: "Host not found" });
  res.json({ host });
});

/**
 * GET /hosts/:id/directions?fromLat=&fromLng=
 *
 * Returns a Google Maps directions URL from the rider's current
 * location (or Rochester, MI as default) to the host's address.
 *
 * Also returns the host's coordinates so the UI can render a map preview.
 */
router.get("/:id/directions", (req, res) => {
  const host = hosts.find((h) => h.id === req.params.id);
  if (!host) return res.status(404).json({ error: "Host not found" });

  // Use real rider location if provided, otherwise default to Rochester trailhead
  const fromLat = req.query.fromLat !== undefined ? parseFloat(req.query.fromLat) : 42.6803;
  const fromLng = req.query.fromLng !== undefined ? parseFloat(req.query.fromLng) : -83.1335;

  const googleMapsUrl =
    `https://www.google.com/maps/dir/?api=1` +
    `&origin=${fromLat},${fromLng}` +
    `&destination=${host.lat},${host.lng}` +
    `&travelmode=bicycling`;

  // Rough straight-line distance in miles (Haversine approximation)
  const R = 3958.8; // Earth radius in miles
  const dLat = ((host.lat - fromLat) * Math.PI) / 180;
  const dLng = ((host.lng - fromLng) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((fromLat * Math.PI) / 180) *
      Math.cos((host.lat * Math.PI) / 180) *
      Math.sin(dLng / 2) ** 2;
  const distanceMiles = +(R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))).toFixed(1);

  // Rough ETA at 12 mph average ebike speed
  const etaMinutes = Math.round((distanceMiles / 12) * 60);

  res.json({
    host: { id: host.id, name: host.name, lat: host.lat, lng: host.lng, address: host.address },
    directions: {
      googleMapsUrl,
      distanceMiles,
      etaMinutes,
      fromLat,
      fromLng,
    },
  });
});

export default router;
