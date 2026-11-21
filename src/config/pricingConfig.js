/**
 * Ridezey Pricing Configuration (PROVISIONAL)
 * ---------------------------------------------------------------------------
 * These rates are provisional starting values for the marketplace and MUST be
 * validated / adjusted by the business before production launch.
 *
 * - All monetary values are in INR.
 * - Adjustment percentages are applied to the recommended (base) fare.
 * - Change values here only; calculation logic lives in pricingService.
 * ---------------------------------------------------------------------------
 */

module.exports = {
  currency: "INR",
  pricing_version: "v1",

  /**
   * Rounding: 0 = whole rupees (recommended for INR consumer prices).
   */
  rounding_decimals: 0,

  /**
   * Absolute floor applied after percentage adjustment so prices never go
   * below a sensible marketplace minimum.
   */
  absolute_minimum_fare: 50,

  parcel: {
    /**
     * total = base_fare
     *       + (distance_km * rate_per_km * mode_multiplier)
     *       + (weight_kg  * rate_per_kg  * mode_multiplier)
     *
     * Continuous formula — no weight slabs — so increasing weight never
     * decreases total fare and there are no cliff discontinuities.
     */
    base_fare: 40,
    rate_per_km: 1.25,
    rate_per_kg: 8,

    /** Minimum recommended total before adjustment (after formula). */
    minimum_recommended_fare: 80,

    /**
     * Mode multipliers relative to CAR baseline.
     * Keys must match ALLOWED_PUBLIC_MODES + ALLOWED_PRIVATE_MODES.
     */
    mode_multipliers: {
      CAR: 1.0,
      BIKE: 0.85,
      OTHER: 1.0,
      TRAIN: 0.7,
      BUS: 0.75,
      FLIGHT: 2.2,
    },

    /** Allowed deviation from recommended when traveler sets their price. */
    adjustment: {
      min_percent: -20,
      max_percent: 25,
    },

    /** Practical bounds for estimation inputs. */
    min_weight_kg: 0.1,
    max_weight_kg: 100,
    min_distance_km: 1,
    max_distance_km: 3000,
  },

  passenger: {
    /**
     * total = base_fare
     *       + (distance_km * rate_per_km * mode_multiplier)
     *       + (seats * rate_per_seat * mode_multiplier)
     */
    base_fare: 60,
    rate_per_km: 1.8,
    rate_per_seat: 40,

    minimum_recommended_fare: 120,

    mode_multipliers: {
      CAR: 1.0,
      BIKE: 0.9,
      OTHER: 1.0,
      TRAIN: 0.65,
      BUS: 0.7,
      FLIGHT: 2.5,
    },

    adjustment: {
      min_percent: -15,
      max_percent: 20,
    },

    min_seats: 1,
    max_seats: 8,
    min_distance_km: 1,
    max_distance_km: 3000,
  },
};
