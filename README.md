# LivRoch

**Michigan DevFest + AI Hackathon 2026** · Hollywood Casino Hotel at Greektown, Detroit · November 13, 2026

> An Airbnb-style ebike charging network for Michigan trail riders. Chargers (hosts) meet Chargees (riders) — powered by IBM watsonx.ai.

Live demo (front end built in Lovable): https://michigan-trail-chargefinder.lovable.app 
---

## The Problem

Long-distance ebike riders in Michigan struggle to find charging stops along trail routes because there is no network connecting willing hosts to riders who need a charge, which forces them to cut trips short, avoid rural routes, and miss out on Michigan's trail system entirely.

## The Solution

LivRoch is a two-sided marketplace and AI-powered trail assistant that connects riders who need a charge with local hosts who have one. Riders describe their route in plain English; IBM Granite plans the charging stops; hosts accept or decline; payment is handled in-app.

---

## Team

| Name | Role |
|------|------|
| Patty O'Brien Novak | Team lead, research and pitch |
| Stephen Gelhaus | Builder |
| Magi Nikolova | Builder, design and UX |

---

## Tech Stack

| Layer | Tool | What it does |
|-------|------|-------------|
| IBM | watsonx.ai + IBM Granite | Natural-language route and charging planner |
| Leaflet | OpenStreet Map | map display and route line between rider and hosts |
| Frontend | Lovable | Rider-facing UI: search, map, host listings, booking |
| Data | Michigan DNR trail data, OpenStreetMap | Trail routes and waypoints (all public) |
| Backend | Node.js (Express) | REST API connecting UI to watsonx.ai and host data |

---

## Running the API locally

```bash
cd api
cp .env.example .env
# fill in your WATSONX_API_KEY and WATSONX_PROJECT_ID
npm install
npm run dev
```

The API runs on `http://localhost:3001`.

### Endpoints

| Method | Path | Description |
|--------|------|-------------|
| `POST` | `/plan-route` | Parse a rider's natural-language query → return charging stop plan |
| `GET` | `/hosts` | List all charger hosts |
| `GET` | `/hosts/:id` | Get a single host |
| `POST` | `/bookings` | Create a booking (mock payment included) |
| `GET` | `/bookings/:id` | Look up a booking |
| `PATCH` | `/bookings/:id/accept` | Host accepts a booking |

### Example: plan a route

```bash
curl -X POST http://localhost:3001/plan-route \
  -H "Content-Type: application/json" \
  -d '{"query": "I want to ride from Rochester to the Detroit Zoo in 2 days"}'
```

**Without watsonx credentials** the API returns a realistic mock plan automatically — great for local development and demos.

---

## Data sources

- Trail routes: Michigan DNR — [michigan.gov/dnr](https://www.michigan.gov/dnr)
- Trail geodata: OpenStreetMap contributors
- Host data: fictional demo data (`api/data/hosts.json`) — no real personal information

**No API keys are committed to this repository.** All secrets are stored in `api/.env` (gitignored). See `api/.env.example` for required variables.

---

## Judging criteria

| Criterion | How LivRoch shows it |
|-----------|---------------------|
| Completeness & feasibility | Working demo: search → AI plan → host listing → booking confirmed |
| Effectiveness & efficiency | Cuts route planning from hours of Googling to a 2-minute AI conversation |
| Design & usability | Single search bar, map view, one-tap booking |
| Creativity & innovation | First LLM-powered trail planner + peer-to-peer ebike charging marketplace |
| Michigan impact | Every host is a Michigan resident earning income; every rider spends money in small-town Michigan |

---

*Submissions close 6:00 PM · Demos 6:30 PM · Winners 7:30 PM*
