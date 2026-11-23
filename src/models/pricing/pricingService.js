/**
 * Ridezey Pricing Engine
 * ---------------------
 * Calculates recommended, minimum and maximum fares for parcel and passenger
 * services. Pure functions — no DB access. Configuration is centralized in
 * src/config/pricingConfig.js (PROVISIONAL rates).
 *
 * Passenger estimates are distance-based only (not seat-count dependent).
 * Parcel bookings use the same payable / commission model as passengers.
 */

const pricingConfig = require("../../config/pricingConfig");

const ALL_TRANSPORT_MODES = [
  "TRAIN",
  "BUS",
  "FLIGHT",
  "CAR",
  "BIKE",
  "OTHER",
];

/**
 * Round a monetary value consistently.
 * @param {number} value
 * @param {number} [decimals]
 * @returns {number}
 */
function roundMoney(value, decimals = pricingConfig.rounding_decimals) {
  if (!Number.isFinite(value)) return 0;
  const factor = 10 ** decimals;
  return Math.round(value * factor) / factor;
}

/**
 * Resolve mode multiplier for a service config.
 * @param {object} serviceConfig
 * @param {string} transportMode
 * @returns {number}
 */
function getModeMultiplier(serviceConfig, transportMode) {
  const mode = String(transportMode || "").toUpperCase();
  const mult = serviceConfig.mode_multipliers[mode];
  if (mult === undefined) {
    throw new Error(
      `Unsupported transport_mode "${transportMode}". Allowed: ${ALL_TRANSPORT_MODES.join(", ")}`
    );
  }
  return mult;
}

/**
 * Apply percentage adjustment and absolute floor, then enforce
 * minimum <= recommended <= maximum and non-negative values.
 *
 * @param {number} recommended
 * @param {{ min_percent: number, max_percent: number }} adjustment
 * @returns {{ minimum_fare: number, recommended_fare: number, maximum_fare: number }}
 */
function applyAdjustmentRange(recommended, adjustment) {
  const rec = roundMoney(Math.max(recommended, 0));

  let minRaw = rec * (1 + Number(adjustment.min_percent) / 100);
  let maxRaw = rec * (1 + Number(adjustment.max_percent) / 100);

  // Absolute marketplace floor
  const floor = Number(pricingConfig.absolute_minimum_fare) || 0;
  minRaw = Math.max(minRaw, floor);
  maxRaw = Math.max(maxRaw, minRaw);

  let minimum_fare = roundMoney(minRaw);
  let maximum_fare = roundMoney(maxRaw);
  let recommended_fare = roundMoney(rec);

  // Guarantee invariant after rounding
  if (minimum_fare > recommended_fare) {
    minimum_fare = recommended_fare;
  }
  if (maximum_fare < recommended_fare) {
    maximum_fare = recommended_fare;
  }
  if (minimum_fare < 0) minimum_fare = 0;
  if (recommended_fare < 0) recommended_fare = 0;
  if (maximum_fare < 0) maximum_fare = 0;

  return { minimum_fare, recommended_fare, maximum_fare };
}

/**
 * Core parcel total-fare calculation (continuous, no slabs).
 * @param {object} params
 * @param {number} params.distance_km
 * @param {string} params.transport_mode
 * @param {number} params.weight_kg
 * @returns {{ minimum_fare: number, recommended_fare: number, maximum_fare: number, adjustment_limits: object, formula_inputs: object }}
 */
function calculateParcelFare({ distance_km, transport_mode, weight_kg }) {
  const cfg = pricingConfig.parcel;

  const distance = Number(distance_km);
  const weight = Number(weight_kg);

  if (!Number.isFinite(distance) || distance < cfg.min_distance_km) {
    throw new Error(`distance_km must be a number >= ${cfg.min_distance_km}`);
  }
  if (distance > cfg.max_distance_km) {
    throw new Error(`distance_km cannot exceed ${cfg.max_distance_km}`);
  }
  if (!Number.isFinite(weight) || weight < cfg.min_weight_kg) {
    throw new Error(`weight_kg must be a number >= ${cfg.min_weight_kg}`);
  }
  if (weight > cfg.max_weight_kg) {
    throw new Error(`weight_kg cannot exceed ${cfg.max_weight_kg}`);
  }

  const modeMult = getModeMultiplier(cfg, transport_mode);

  const distanceComponent = distance * cfg.rate_per_km * modeMult;
  const weightComponent = weight * cfg.rate_per_kg * modeMult;
  let recommended = cfg.base_fare + distanceComponent + weightComponent;

  // Enforce service-level minimum recommended
  recommended = Math.max(recommended, cfg.minimum_recommended_fare);

  const range = applyAdjustmentRange(recommended, cfg.adjustment);

  return {
    ...range,
    adjustment_limits: {
      minimum_percent: cfg.adjustment.min_percent,
      maximum_percent: cfg.adjustment.max_percent,
    },
    formula_inputs: {
      base_fare: cfg.base_fare,
      rate_per_km: cfg.rate_per_km,
      rate_per_kg: cfg.rate_per_kg,
      mode_multiplier: modeMult,
      distance_component: roundMoney(distanceComponent, 2),
      weight_component: roundMoney(weightComponent, 2),
    },
  };
}

/**
 * Core passenger fare calculation (distance-based only — independent of seats).
 * The returned range is the guide for price_per_seat the driver should set.
 *
 * @param {object} params
 * @param {number} params.distance_km
 * @param {string} params.transport_mode
 * @param {number} [params.seats] - accepted for API compatibility; ignored in formula
 * @returns {{ minimum_fare: number, recommended_fare: number, maximum_fare: number, adjustment_limits: object, formula_inputs: object }}
 */
function calculatePassengerFare({ distance_km, transport_mode, seats }) {
  const cfg = pricingConfig.passenger;

  const distance = Number(distance_km);

  if (!Number.isFinite(distance) || distance < cfg.min_distance_km) {
    throw new Error(`distance_km must be a number >= ${cfg.min_distance_km}`);
  }
  if (distance > cfg.max_distance_km) {
    throw new Error(`distance_km cannot exceed ${cfg.max_distance_km}`);
  }

  // Seats are optional for estimation and do NOT affect the recommended range.
  if (seats !== undefined && seats !== null && seats !== "") {
    const seatCount = Number(seats);
    if (!Number.isInteger(seatCount) || seatCount < cfg.min_seats) {
      throw new Error(`seats must be an integer >= ${cfg.min_seats}`);
    }
    if (seatCount > cfg.max_seats) {
      throw new Error(`seats cannot exceed ${cfg.max_seats}`);
    }
  }

  const modeMult = getModeMultiplier(cfg, transport_mode);

  const distanceComponent = distance * cfg.rate_per_km * modeMult;
  // No seat component — estimate independent of seat count
  let recommended = cfg.base_fare + distanceComponent;

  recommended = Math.max(recommended, cfg.minimum_recommended_fare);

  const range = applyAdjustmentRange(recommended, cfg.adjustment);

  return {
    ...range,
    adjustment_limits: {
      minimum_percent: cfg.adjustment.min_percent,
      maximum_percent: cfg.adjustment.max_percent,
    },
    formula_inputs: {
      base_fare: cfg.base_fare,
      rate_per_km: cfg.rate_per_km,
      rate_per_seat: 0,
      mode_multiplier: modeMult,
      distance_component: roundMoney(distanceComponent, 2),
      seat_component: 0,
    },
  };
}

/**
 * Public entry: estimate fare range for a service.
 *
 * @param {object} input
 * @param {string} input.service_type - PARCEL | PASSENGER
 * @param {number} input.distance_km
 * @param {string} input.transport_mode
 * @param {number} [input.weight_kg] - required for PARCEL
 * @param {number} [input.seats] - optional for PASSENGER (does not affect estimate)
 * @returns {object} Full estimation payload matching API contract
 */
function estimateFare(input = {}) {
  const serviceType = String(input.service_type || "")
    .trim()
    .toUpperCase();

  if (!["PARCEL", "PASSENGER"].includes(serviceType)) {
    throw new Error("service_type must be PARCEL or PASSENGER");
  }

  const distance_km = Number(input.distance_km);
  const transport_mode = String(input.transport_mode || "")
    .trim()
    .toUpperCase();

  if (!transport_mode) {
    throw new Error("transport_mode is required");
  }
  if (!ALL_TRANSPORT_MODES.includes(transport_mode)) {
    throw new Error(
      `Unsupported transport_mode. Allowed: ${ALL_TRANSPORT_MODES.join(", ")}`
    );
  }

  let result;
  let weight_kg = null;
  let seats = null;

  if (serviceType === "PARCEL") {
    weight_kg = Number(input.weight_kg);
    result = calculateParcelFare({
      distance_km,
      transport_mode,
      weight_kg,
    });
  } else {
    seats =
      input.seats === undefined || input.seats === null || input.seats === ""
        ? 1
        : Number(input.seats);
    result = calculatePassengerFare({
      distance_km,
      transport_mode,
      seats,
    });
  }

  return {
    service_type: serviceType,
    distance_km: Number(distance_km),
    transport_mode,
    weight_kg: serviceType === "PARCEL" ? weight_kg : undefined,
    seats: serviceType === "PASSENGER" ? seats : undefined,
    currency: pricingConfig.currency,
    pricing: {
      minimum_fare: result.minimum_fare,
      recommended_fare: result.recommended_fare,
      maximum_fare: result.maximum_fare,
    },
    adjustment_limits: result.adjustment_limits,
    pricing_version: pricingConfig.pricing_version,
    // Internal diagnostic — not required by frontend, safe to omit later
    _formula: result.formula_inputs,
  };
}

/**
 * Derive the allowed unit-price range for ride publishing.
 *
 * Parcel: returns min/max for price_per_kg such that
 *   (price_per_kg * available_weight) falls inside the total-fare range
 *   calculated for that weight & distance.
 *
 * Passenger: returns min/max for price_per_seat. The estimate is independent
 *   of seat count, so the unit range equals the total recommended range
 *   (driver sets a per-seat price guided by distance, not by how many seats
 *   they list).
 *
 * @param {object} params
 * @param {"PARCEL"|"PASSENGER"} params.service_type
 * @param {number} params.distance_km
 * @param {string} params.transport_mode
 * @param {number} [params.weight_kg] - available_weight for parcel
 * @param {number} [params.seats] - available_seats for passenger (ignored for range)
 * @returns {{ minimum: number, recommended: number, maximum: number, total_range: object }}
 */
function getUnitPriceRange(params) {
  const serviceType = String(params.service_type || "")
    .trim()
    .toUpperCase();

  if (serviceType === "PARCEL") {
    const weight = Number(params.weight_kg);
    if (!Number.isFinite(weight) || weight <= 0) {
      throw new Error("weight_kg must be > 0 to derive unit price range");
    }
    const total = calculateParcelFare({
      distance_km: params.distance_km,
      transport_mode: params.transport_mode,
      weight_kg: weight,
    });
    return {
      minimum: roundMoney(total.minimum_fare / weight),
      recommended: roundMoney(total.recommended_fare / weight),
      maximum: roundMoney(total.maximum_fare / weight),
      total_range: {
        minimum_fare: total.minimum_fare,
        recommended_fare: total.recommended_fare,
        maximum_fare: total.maximum_fare,
      },
    };
  }

  if (serviceType === "PASSENGER") {
    // Distance-only estimate; seats do not scale the suggested per-seat price
    const total = calculatePassengerFare({
      distance_km: params.distance_km,
      transport_mode: params.transport_mode,
      seats: params.seats,
    });
    return {
      minimum: total.minimum_fare,
      recommended: total.recommended_fare,
      maximum: total.maximum_fare,
      total_range: {
        minimum_fare: total.minimum_fare,
        recommended_fare: total.recommended_fare,
        maximum_fare: total.maximum_fare,
      },
    };
  }

  throw new Error("service_type must be PARCEL or PASSENGER");
}

/**
 * Validate a traveler-selected unit price against the calculated range.
 * Does NOT clamp — throws a clear error on any violation.
 *
 * @param {object} params
 * @param {number} params.selected_price - price_per_kg or price_per_seat
 * @param {"PARCEL"|"PASSENGER"} params.service_type
 * @param {number} params.distance_km
 * @param {string} params.transport_mode
 * @param {number} [params.weight_kg]
 * @param {number} [params.seats]
 * @returns {{ valid: true, range: object, selected_price: number }}
 */
function validateSelectedPrice(params) {
  const selected = Number(params.selected_price);

  if (!Number.isFinite(selected) || selected < 0) {
    throw new Error(
      "Selected price must be a non-negative finite number"
    );
  }

  if (Object.is(selected, NaN)) {
    throw new Error("Selected price is not a valid number");
  }

  const range = getUnitPriceRange(params);

  if (selected < range.minimum) {
    throw new Error(
      `Selected price ${selected} is below the allowed minimum of ${range.minimum} ${pricingConfig.currency}`
    );
  }
  if (selected > range.maximum) {
    throw new Error(
      `Selected price ${selected} is above the allowed maximum of ${range.maximum} ${pricingConfig.currency}`
    );
  }

  return {
    valid: true,
    selected_price: selected,
    range: {
      minimum: range.minimum,
      recommended: range.recommended,
      maximum: range.maximum,
    },
    total_range: range.total_range,
  };
}

/**
 * Passenger booking payable breakdown for search results and bookings.
 *
 * customer_pay      = price_per_seat * seats  (amount attributable to seats)
 * commission_amount = customer_pay * commission_percent / 100
 * platform_fee      = fixed fee from config
 * taxes             = (commission_amount + platform_fee) * tax_percent / 100
 * total_payable     = customer_pay + platform_fee + taxes
 *
 * @param {{ price_per_seat: number, seats?: number }} params
 */
function computePassengerBookingBreakdown(params = {}) {
  const seats = Math.max(1, Math.floor(Number(params.seats) || 1));
  const pricePerSeat = Number(params.price_per_seat);
  if (!Number.isFinite(pricePerSeat) || pricePerSeat < 0) {
    throw new Error("price_per_seat must be a non-negative number");
  }

  const cfg = pricingConfig.passenger;
  const commissionPercent = Number(cfg.commission_percent ?? 10);
  const platformFee = Number(cfg.platform_fee ?? 0);
  const taxPercent = Number(cfg.tax_percent ?? 0);

  const customerPay = roundMoney(pricePerSeat * seats);
  const commissionAmount = roundMoney((customerPay * commissionPercent) / 100);
  const taxes = roundMoney(((commissionAmount + platformFee) * taxPercent) / 100);
  const totalPayable = roundMoney(customerPay + platformFee + taxes);

  return {
    seats,
    price_per_seat: roundMoney(pricePerSeat),
    customer_pay: customerPay,
    commission_percentage: commissionPercent,
    commission_amount: commissionAmount,
    platform_fee: roundMoney(platformFee),
    taxes,
    total_payable: totalPayable,
    currency: pricingConfig.currency,
  };
}

/**
 * Parcel booking payable breakdown — same structure as passenger.
 *
 * customer_pay      = price_per_kg * weight_kg
 * commission_amount = customer_pay * commission_percent / 100
 * platform_fee      = fixed fee from config
 * taxes             = (commission_amount + platform_fee) * tax_percent / 100
 * total_payable     = customer_pay + platform_fee + taxes
 *
 * @param {{ price_per_kg: number, weight_kg?: number }} params
 */
function computeParcelBookingBreakdown(params = {}) {
  const weightKg = Math.max(0.1, Number(params.weight_kg) || 0.1);
  const pricePerKg = Number(params.price_per_kg);
  if (!Number.isFinite(pricePerKg) || pricePerKg < 0) {
    throw new Error("price_per_kg must be a non-negative number");
  }

  const cfg = pricingConfig.parcel;
  const commissionPercent = Number(cfg.commission_percent ?? 10);
  const platformFee = Number(cfg.platform_fee ?? 0);
  const taxPercent = Number(cfg.tax_percent ?? 0);

  const customerPay = roundMoney(pricePerKg * weightKg);
  const commissionAmount = roundMoney((customerPay * commissionPercent) / 100);
  const taxes = roundMoney(((commissionAmount + platformFee) * taxPercent) / 100);
  const totalPayable = roundMoney(customerPay + platformFee + taxes);

  return {
    weight_kg: roundMoney(weightKg, 2),
    price_per_kg: roundMoney(pricePerKg, 2),
    customer_pay: customerPay,
    commission_percentage: commissionPercent,
    commission_amount: commissionAmount,
    platform_fee: roundMoney(platformFee),
    taxes,
    total_payable: totalPayable,
    currency: pricingConfig.currency,
  };
}

module.exports = {
  estimateFare,
  calculateParcelFare,
  calculatePassengerFare,
  getUnitPriceRange,
  validateSelectedPrice,
  computePassengerBookingBreakdown,
  computeParcelBookingBreakdown,
  roundMoney,
  ALL_TRANSPORT_MODES,
  pricingConfig, // read-only exposure for tests / diagnostics
};
