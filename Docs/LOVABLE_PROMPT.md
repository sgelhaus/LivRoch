# LivRoch — Lovable UI Prompt

Paste this entire prompt into Lovable to generate the frontend.

---

## PROMPT

Build a mobile-first web app called **LivRoch** — an Airbnb-style ebike charging network for Michigan trail riders.

The app has two user modes: **Rider** and **Host**. The default view is Rider.

---

### Design language
- Clean, outdoorsy, modern. Think REI meets Airbnb.
- Primary color: deep forest green (`#2D6A4F`)
- Accent: warm amber (`#F4A261`)
- Background: off-white (`#FAFAF8`)
- Font: Inter or similar clean sans-serif
- Rounded cards, generous white space, subtle shadows
- Mobile-first but works on desktop

---

### Screen 1 — Home / Route Search (Rider)

Header: LivRoch logo (leaf + lightning bolt icon) + "Rider" / "Host" toggle in top right

Hero section:
- Headline: **"Range freedom for Michigan trail riders"**
- Subheadline: "Find a charge, book a host, ride further."
- Large search bar with placeholder: *"Where do you want to ride?"*
- Below the search bar: two inputs — "From" and "To" — plus a "Days" selector (1–5)
- Big green "Plan my route" button

Below the fold: "How it works" section with 3 steps:
1. 🔍 Search your route
2. ⚡ AI finds charging stops
3. ✅ Book & ride

---

### Screen 2 — Route Results + Map

After tapping "Plan my route":

Left panel (or top on mobile):
- Route summary card: "Rochester → Detroit Zoo · 2 days · ~42 miles"
- AI summary text in a subtle box: *"A 2-day ride along the Paint Creek and Iron Belle trails. We found 2 charging stops for you."*
- List of 2 host cards (see Host Card below)

Right panel (or bottom on mobile):
- Google Map centered on the route with:
  - Blue line for the trail route (polyline from Rochester to Royal Oak)
  - Green pin markers for each suggested charging host
  - Each pin shows the host's initials in a circle

Host Card (compact):
- Host avatar circle with initials + green background
- Name, location
- Outlet type badge (e.g. "⚡ Level 2")
- Rating (★ 4.9) + response time ("~15 min")
- Session fee ($4.00)
- "View & Request" button (amber)

---

### Screen 3 — Host Profile + Booking

Tap "View & Request" on a host card:

Full host profile:
- Large avatar circle (initials, green bg)
- Name, location, rating, review count
- Bio paragraph
- Amenities chips: Water · Restroom · Covered seating
- Outlet type + available hours
- Pricing: "$4.00 / session · Host earns $3.20 · LivRoch fee $0.80"

Booking form:
- Date picker
- Duration selector (1 hr / 2 hrs / 3 hrs)
- Total price auto-calculated: e.g. "2 hrs · $5.00 total"

"Request a Charge" button (green, full-width)

---

### Screen 4 — Mock Payment

After tapping "Request a Charge":

Payment screen:
- Summary: host name, date, duration, total
- Mock credit card form:
  - Card number field (placeholder: 4242 4242 4242 4242)
  - Expiry + CVC fields
  - Name on card
- "Pay $5.00 & Confirm" button (green)
- Small text: "Secure mock payment · LivRoch"

---

### Screen 5 — Confirmation

After tapping "Pay & Confirm":

Success screen:
- Large green checkmark ✓
- "Booking Confirmed!"
- Booking summary card:
  - Host: Sarah M. · Rochester, MI
  - Date, duration
  - Amount paid: $5.00
  - Booking ID
- "View on map" button
- "Back to route" link

---

### Host Mode (toggle in header)

When "Host" is selected in the top-right toggle, show a simple host dashboard:

- Header: "Welcome, Sarah M." 
- Pending request card:
  - Rider: "Alex R." wants to charge on [date] for 2 hrs
  - Route: Rochester → Detroit Zoo
  - Earning: $3.20
  - "Accept" (green) and "Decline" (outlined) buttons
- After Accept: show "Booking confirmed — $3.20 earned" success state

---

### API integration

The app should call this local API: `http://localhost:3001`

| Method | Endpoint | Body / Params | Purpose |
|--------|----------|---------------|---------|
| POST | `/plan-route` | `{ query, lat?, lng? }` | AI route plan + suggested hosts |
| GET | `/hosts` | — | All hosts |
| GET | `/hosts/:id` | — | Single host |
| GET | `/hosts/:id/directions` | `?fromLat=&fromLng=` | Google Maps URL + distance + ETA to host |
| POST | `/bookings` | `{ hostId, riderId, date, durationHours }` | Create booking + mock payment |
| PATCH | `/bookings/:id/accept` | — | Host accepts |
| PATCH | `/bookings/:id/swap-host` | `{ newHostId }` | Rider swaps to a different host mid-ride |
| PATCH | `/bookings/:id/eta` | `{ etaMinutes, riderLat, riderLng }` | Rider sends ETA to host |
| GET | `/bookings/:id` | — | Look up booking (host uses to poll ETA) |

If the API is unavailable, use hardcoded mock data so the UI always works for the demo.

---

### Screen 5 — Confirmation (updated)

After payment confirmed show:
- Large green checkmark ✓
- "Booking Confirmed!"
- Booking summary: host name, date, duration, amount paid, booking ID
- **"Get directions" button** — calls `GET /hosts/:id/directions?fromLat=&fromLng=` using the browser's GPS (`navigator.geolocation`). Opens the returned `googleMapsUrl` in a new tab. Shows distance and ETA inline: *"8.8 miles · ~44 min by bike"*
- "Change stop" button (outlined) — navigates to Screen 6
- "Back to route" link

---

### Screen 6 — Change Charging Stop (new, accessible anytime during ride)

Accessible from:
- The confirmation screen ("Change stop" button)
- An "Active ride" banner that appears at the top of every screen once a booking is confirmed

This screen shows:
- Current booking summary at top: "Currently booked: Sarah M. · Nov 14 · 2 hrs"
- Headline: "Choose a different stop"
- Full list of all available hosts as cards (same compact host card from Screen 2)
- Each card has a "Switch to this host" button
- Tapping "Switch to this host" calls `PATCH /bookings/:id/swap-host` with `{ newHostId }`
- On success: show a brief "✅ Stop updated — now heading to [new host name]" toast, then navigate back to confirmation screen with updated host info

---

### Host dashboard — ETA display (updated)

In the Host view, after accepting a booking, show a live ETA card:
- "Alex R. is on their way"
- ETA display: *"About 18 minutes away"* — updated whenever the rider's app calls the ETA endpoint
- The host view polls `GET /bookings/:id` every 30 seconds and reads `booking.riderEta.message`
- When `etaMinutes <= 5`: show *"Rider is almost there!"* in amber with a pulse animation

---

### Real location mode

When the rider opens the app, call `navigator.geolocation.getCurrentPosition()`:
- **If granted**: send `{ lat, lng }` with every `/plan-route` call. The map centers on the real location. The directions button uses real coordinates.
- **If denied or unavailable**: silently fall back to mock coordinates (Rochester, MI: `42.6803, -83.1335`). Show a small "📍 Using default location" badge near the search bar.

The rider should never see an error — real location is an enhancement, not a dependency.

---

### Notes
- The app must work as a demo even without real API calls (use inline mock data as fallback)
- Keep all screens navigable — judges will tap through the whole flow
- No authentication needed — hardcode rider "Alex R." and host "Sarah M." for the demo
- An "Active ride" sticky banner should appear at the top of every screen once a booking exists, with a "Change stop" link
- Make it look polished enough to demo live on screen
