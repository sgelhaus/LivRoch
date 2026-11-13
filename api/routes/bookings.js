import { Router } from "express";
import { readFileSync } from "fs";
import { fileURLToPath } from "url";
import { dirname, join } from "path";
import { v4 as uuidv4 } from "uuid";

const __dirname = dirname(fileURLToPath(import.meta.url));
const hosts = JSON.parse(
  readFileSync(join(__dirname, "../data/hosts.json"), "utf-8")
);

const router = Router();

// In-memory store — fine for the demo
const bookings = [];

/**
 * POST /bookings
 * Body: { hostId, riderId, date, durationHours }
 *
 * Returns a confirmed booking with a mock payment receipt.
 */
router.post("/", (req, res) => {
  const { hostId, riderId, date, durationHours = 2 } = req.body;

  if (!hostId || !riderId) {
    return res.status(400).json({ error: "hostId and riderId are required" });
  }

  // Mock pricing: $2.50/hr, minimum $4.00
  const ratePerHour = 2.50;
  const subtotal = Math.max(ratePerHour * durationHours, 4.00);
  const platformFee = +(subtotal * 0.20).toFixed(2);   // LivRoch 20%
  const hostEarning = +(subtotal * 0.80).toFixed(2);   // Host 80%
  const total = +subtotal.toFixed(2);

  const booking = {
    id: `booking-${uuidv4().slice(0, 8)}`,
    hostId,
    riderId,
    date: date || new Date().toISOString().split("T")[0],
    durationHours,
    status: "confirmed",
    payment: {
      total,
      platformFee,
      hostEarning,
      currency: "USD",
      method: "card_mock",
      paidAt: new Date().toISOString(),
    },
  };

  bookings.push(booking);
  res.status(201).json({ booking });
});

/**
 * GET /bookings/:id — look up a booking
 */
router.get("/:id", (req, res) => {
  const booking = bookings.find((b) => b.id === req.params.id);
  if (!booking) return res.status(404).json({ error: "Booking not found" });
  res.json({ booking });
});

/**
 * PATCH /bookings/:id/accept — host accepts the booking
 */
router.patch("/:id/accept", (req, res) => {
  const booking = bookings.find((b) => b.id === req.params.id);
  if (!booking) return res.status(404).json({ error: "Booking not found" });

  booking.status = "accepted";
  booking.acceptedAt = new Date().toISOString();
  res.json({ booking });
});

/**
 * PATCH /bookings/:id/swap-host
 * Body: { newHostId }
 *
 * Rider can swap to a different charging host at any point during the ride.
 * The old booking is cancelled and a new one is created with the same payment details.
 * The new host receives the booking in "pending" state.
 */
router.patch("/:id/swap-host", (req, res) => {
  const booking = bookings.find((b) => b.id === req.params.id);
  if (!booking) return res.status(404).json({ error: "Booking not found" });

  const { newHostId } = req.body;
  if (!newHostId) return res.status(400).json({ error: "newHostId is required" });
  if (newHostId === booking.hostId) return res.status(400).json({ error: "Already booked with this host" });

  const newHost = hosts.find((h) => h.id === newHostId);
  if (!newHost) return res.status(404).json({ error: "New host not found" });

  // Cancel the old booking
  const oldHostId = booking.hostId;
  booking.status = "cancelled";
  booking.cancelledAt = new Date().toISOString();
  booking.cancellationReason = "rider_swap";

  // Create a fresh booking for the new host
  const newBooking = {
    id: `booking-${uuidv4().slice(0, 8)}`,
    hostId: newHostId,
    riderId: booking.riderId,
    date: booking.date,
    durationHours: booking.durationHours,
    status: "pending",
    swappedFrom: booking.id,
    payment: { ...booking.payment, paidAt: new Date().toISOString() },
  };

  bookings.push(newBooking);

  res.json({
    message: "Host swapped successfully",
    cancelledBooking: { id: booking.id, hostId: oldHostId, status: "cancelled" },
    newBooking,
    newHost: { id: newHost.id, name: newHost.name, address: newHost.address, lat: newHost.lat, lng: newHost.lng },
  });
});

/**
 * PATCH /bookings/:id/eta
 * Body: { etaMinutes, riderLat, riderLng }
 *
 * Rider's app sends their current location + calculated ETA as they ride.
 * The host can poll GET /bookings/:id to see the latest rider ETA.
 */
router.patch("/:id/eta", (req, res) => {
  const booking = bookings.find((b) => b.id === req.params.id);
  if (!booking) return res.status(404).json({ error: "Booking not found" });

  const { etaMinutes, riderLat, riderLng } = req.body;

  if (etaMinutes === undefined) {
    return res.status(400).json({ error: "etaMinutes is required" });
  }

  booking.riderEta = {
    etaMinutes: Math.round(etaMinutes),
    riderLat: riderLat || null,
    riderLng: riderLng || null,
    updatedAt: new Date().toISOString(),
    message: etaMinutes <= 5
      ? "Rider is almost there!"
      : `Rider is about ${Math.round(etaMinutes)} minutes away`,
  };

  res.json({
    bookingId: booking.id,
    hostId: booking.hostId,
    riderEta: booking.riderEta,
  });
});

export default router;
