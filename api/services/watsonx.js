/**
 * watsonx.js — IBM watsonx.ai Granite integration
 *
 * Uses the watsonx.ai REST API to parse a rider's natural-language
 * route query and return a structured charging stop plan.
 *
 * Env vars required (see .env.example):
 *   WATSONX_API_KEY
 *   WATSONX_PROJECT_ID
 *   WATSONX_URL  (default: https://us-south.ml.cloud.ibm.com)
 */

const WATSONX_URL =
  process.env.WATSONX_URL || "https://us-south.ml.cloud.ibm.com";
const MODEL_ID = "ibm/granite-3-8b-instruct";

/**
 * Get a short-lived IAM token from an IBM API key.
 */
async function getIAMToken(apiKey) {
  const resp = await fetch("https://iam.cloud.ibm.com/identity/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: `grant_type=urn:ibm:params:oauth:grant-type:apikey&apikey=${apiKey}`,
  });
  if (!resp.ok) throw new Error(`IAM token fetch failed: ${resp.status}`);
  const data = await resp.json();
  return data.access_token;
}

/**
 * Build the prompt sent to Granite.
 */
function buildPrompt(query, locationHint = null) {
  const locationLine = locationHint
    ? `The rider's current GPS location is approximately: ${locationHint.lat.toFixed(4)}, ${locationHint.lng.toFixed(4)}.`
    : "";

  return `You are a trail route planner for LivRoch, an ebike charging network in Michigan.

A rider has asked: "${query}"
${locationLine}

Extract the following information from the request and reply ONLY with valid JSON. No explanation.

{
  "origin": "<starting city or location>",
  "destination": "<ending city or location>",
  "days": <number of days as integer>,
  "totalMilesEstimate": <estimated total miles as integer>,
  "milesPerDay": <miles per day as integer>,
  "chargingStopsNeeded": <number of charging stops needed as integer>,
  "summary": "<one sentence describing the trip>"
}`;
}

/**
 * Select hosts from our list that make sense as charging stops
 * for the parsed route. Simple strategy: space them evenly
 * across the total estimated miles.
 */
function selectChargingStops(parsedPlan, hosts) {
  const { chargingStopsNeeded, totalMilesEstimate } = parsedPlan;
  const count = Math.min(chargingStopsNeeded || 2, hosts.length);

  // Sort hosts by milesFromStart and pick evenly-spaced ones
  const sorted = [...hosts].sort((a, b) => a.milesFromStart - b.milesFromStart);
  const step = sorted.length / count;
  const selected = [];
  for (let i = 0; i < count; i++) {
    const idx = Math.round(i * step);
    selected.push(sorted[Math.min(idx, sorted.length - 1)]);
  }
  return selected;
}

/**
 * Main export: call watsonx.ai, parse the result, attach suggested hosts.
 * Falls back to a mock plan if credentials are missing (dev/demo mode).
 *
 * @param {string} query        - Rider's natural-language route request
 * @param {Array}  hosts        - Full list of charger hosts
 * @param {{ lat: number, lng: number } | null} riderLocation
 *   Pass the rider's real GPS coordinates when available.
 *   If null, mock/default coordinates are used.
 */
export async function planRouteWithWatsonx(query, hosts, riderLocation = null) {
  // ── MOCK MODE (no credentials) ──────────────────────────────────────────
  if (!process.env.WATSONX_API_KEY || !process.env.WATSONX_PROJECT_ID) {
    console.warn("⚠️  No watsonx credentials — returning mock plan");

    // If rider sent real location, use it as origin hint in the mock
    const originLabel = riderLocation
      ? `${riderLocation.lat.toFixed(4)}, ${riderLocation.lng.toFixed(4)}`
      : "Rochester, MI";

    const mockPlan = {
      origin: originLabel,
      destination: "Detroit Zoo, Royal Oak, MI",
      days: 2,
      totalMilesEstimate: 42,
      milesPerDay: 21,
      chargingStopsNeeded: 2,
      summary:
        "A 2-day ebike trip from Rochester to the Detroit Zoo along the Paint Creek and Iron Belle trails, covering approximately 42 miles.",
      riderLocation: riderLocation || null,
    };
    return {
      plan: mockPlan,
      suggestedStops: selectChargingStops(mockPlan, hosts),
      mode: "mock",
    };
  }

  // ── LIVE WATSONX.AI MODE ────────────────────────────────────────────────
  const token = await getIAMToken(process.env.WATSONX_API_KEY);

  const payload = {
    model_id: MODEL_ID,
    input: buildPrompt(query, riderLocation),
    parameters: {
      decoding_method: "greedy",
      max_new_tokens: 300,
      stop_sequences: ["}"],
    },
    project_id: process.env.WATSONX_PROJECT_ID,
  };

  const resp = await fetch(`${WATSONX_URL}/ml/v1/text/generation?version=2023-05-29`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  if (!resp.ok) {
    const text = await resp.text();
    throw new Error(`watsonx.ai returned ${resp.status}: ${text}`);
  }

  const data = await resp.json();
  const rawText = data?.results?.[0]?.generated_text ?? "";

  // Granite responds with JSON — parse it (add closing brace if truncated)
  let parsedPlan;
  try {
    const jsonStr = rawText.trim().endsWith("}") ? rawText : rawText + "}";
    parsedPlan = JSON.parse(jsonStr);
  } catch {
    throw new Error(`Could not parse Granite response as JSON: ${rawText}`);
  }

  return {
    plan: parsedPlan,
    suggestedStops: selectChargingStops(parsedPlan, hosts),
    mode: "live",
  };
}
