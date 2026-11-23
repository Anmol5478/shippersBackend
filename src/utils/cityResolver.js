/**
 * Resolve a free-form location string to a city from the `cities` table.
 *
 * When the client sends a full street address (e.g. "b218, ithemtower, sector 62, noida")
 * we extract and match the city name so `pickup_city` / `drop_city` stay clean for
 * search & listing, while the original text is kept as full_address.
 */

const db = require("../config/db");

/**
 * Normalize for comparison: lowercase, strip diacritics-ish punctuation, collapse spaces.
 * @param {string} s
 * @returns {string}
 */
function normalizeToken(s) {
  return String(s || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Split address into candidate tokens (prefer longer / trailing parts — city is usually last).
 * @param {string} input
 * @returns {string[]}
 */
function addressCandidates(input) {
  const raw = String(input || "").trim();
  if (!raw) return [];

  const parts = raw
    .split(/[,|/]+/)
    .map((p) => p.trim())
    .filter(Boolean);

  const candidates = [];
  // Whole string first (exact / short city name)
  candidates.push(raw);
  // Individual parts from end to start (city often last)
  for (let i = parts.length - 1; i >= 0; i--) {
    candidates.push(parts[i]);
  }
  // Last two parts joined (e.g. "New Delhi")
  if (parts.length >= 2) {
    candidates.push(`${parts[parts.length - 2]}, ${parts[parts.length - 1]}`);
    candidates.push(`${parts[parts.length - 2]} ${parts[parts.length - 1]}`);
  }
  return [...new Set(candidates)];
}

/**
 * Find best matching city row for a free-form location string.
 * @param {string} locationInput - city name or full address
 * @returns {Promise<{ city_name: string, state: string|null, id: number|null, matched: boolean }>}
 */
async function resolveCityFromInput(locationInput) {
  const input = String(locationInput || "").trim();
  if (!input) {
    return { city_name: "", state: null, id: null, matched: false };
  }

  const candidates = addressCandidates(input);
  const normalizedInput = normalizeToken(input);

  // 1) Exact match on city_name (case-insensitive) for any candidate
  for (const candidate of candidates) {
    const [rows] = await db.query(
      `SELECT id, city_name, state
       FROM cities
       WHERE is_active = 1 AND LOWER(city_name) = LOWER(?)
       ORDER BY id
       LIMIT 1`,
      [candidate]
    );
    if (rows && rows.length > 0) {
      return {
        city_name: rows[0].city_name,
        state: rows[0].state || null,
        id: rows[0].id,
        matched: true,
      };
    }
  }

  // 2) Candidate contained in city_name or city_name contained in candidate
  //    Prefer longer city names to avoid matching "Delhi" inside "New Delhi" poorly —
  //    order by length DESC.
  for (const candidate of candidates) {
    const like = `%${candidate}%`;
    const [rows] = await db.query(
      `SELECT id, city_name, state
       FROM cities
       WHERE is_active = 1
         AND (
           LOWER(city_name) LIKE LOWER(?)
           OR LOWER(?) LIKE CONCAT('%', LOWER(city_name), '%')
         )
       ORDER BY CHAR_LENGTH(city_name) DESC, id
       LIMIT 5`,
      [like, candidate]
    );
    if (rows && rows.length > 0) {
      // Prefer exact substring match on normalized tokens
      const normCand = normalizeToken(candidate);
      let best = rows[0];
      for (const row of rows) {
        const normCity = normalizeToken(row.city_name);
        if (normCand === normCity || normCand.endsWith(normCity) || normCity.endsWith(normCand)) {
          best = row;
          break;
        }
      }
      return {
        city_name: best.city_name,
        state: best.state || null,
        id: best.id,
        matched: true,
      };
    }
  }

  // 3) Token overlap: any significant word from input matches a city
  const tokens = normalizedInput.split(" ").filter((t) => t.length >= 3);
  for (const token of tokens.reverse()) {
    const [rows] = await db.query(
      `SELECT id, city_name, state
       FROM cities
       WHERE is_active = 1 AND LOWER(city_name) = LOWER(?)
       ORDER BY id
       LIMIT 1`,
      [token]
    );
    if (rows && rows.length > 0) {
      return {
        city_name: rows[0].city_name,
        state: rows[0].state || null,
        id: rows[0].id,
        matched: true,
      };
    }
  }

  // No match — keep original cleaned as city (caller may still reject)
  // Prefer last comma-segment as a best-effort city label
  const parts = input.split(/[,|/]+/).map((p) => p.trim()).filter(Boolean);
  const fallback = parts.length ? parts[parts.length - 1] : input;
  return {
    city_name: fallback.slice(0, 150),
    state: null,
    id: null,
    matched: false,
  };
}

/**
 * Resolve pickup/drop: returns city for DB city columns + full_address for display.
 * @param {string} cityOrAddress - value sent as city (may be full address)
 * @param {string|null|undefined} explicitAddress - optional dedicated address field
 * @param {string|null|undefined} explicitState
 */
async function resolveLocationFields(cityOrAddress, explicitAddress, explicitState) {
  const rawCityInput = cityOrAddress != null ? String(cityOrAddress).trim() : "";
  const rawAddress =
    explicitAddress != null && String(explicitAddress).trim()
      ? String(explicitAddress).trim()
      : rawCityInput;

  const resolved = await resolveCityFromInput(rawCityInput || rawAddress);

  return {
    city: resolved.city_name,
    state:
      explicitState != null && String(explicitState).trim()
        ? String(explicitState).trim()
        : resolved.state,
    full_address: rawAddress ? rawAddress.slice(0, 500) : resolved.city_name,
    city_id: resolved.id,
    matched: resolved.matched,
  };
}

module.exports = {
  resolveCityFromInput,
  resolveLocationFields,
  normalizeToken,
  addressCandidates,
};
