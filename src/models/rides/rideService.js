const rideRepository = require("./rideRepository");

/**
 * Search available rides
 */
const searchRides = async (query) => {
  const { from, to, weight, date } = query;

  if (!from || !to) {
    throw new Error("From and To locations are required");
  }

  let minWeight = null;
  let maxWeight = null;

  if (weight) {
    if (weight.includes("-")) {
      const parts = weight.split("-");

      minWeight = Number(parts[0]);
      maxWeight = Number(parts[1]);

      if (
        Number.isNaN(minWeight) ||
        Number.isNaN(maxWeight) ||
        minWeight < 0 ||
        maxWeight <= minWeight
      ) {
        throw new Error("Invalid weight range");
      }
    } else if (weight.endsWith("+")) {
      minWeight = Number(weight.replace("+", ""));

      if (
        Number.isNaN(minWeight) ||
        minWeight < 0
      ) {
        throw new Error("Invalid weight");
      }
    } else {
      throw new Error(
        "Weight must be in format like 1-3 or 5+"
      );
    }
  }

  return await rideRepository.searchRides({
    from: from.trim(),
    to: to.trim(),
    minWeight,
    maxWeight,
    date,
  });
};

/**
 * Create a new ride
 */
const createRide = async (data) => {
  const {
    traveller_user_id,
    pickup_city,
    pickup_state,
    drop_city,
    drop_state,
    travel_date,
    departure_time,
    available_weight,
    notes,
  } = data;

  // =========================
  // REQUIRED FIELD VALIDATION
  // =========================

  if (!traveller_user_id) {
    throw new Error("Traveller user ID is required");
  }

  if (!pickup_city || !pickup_city.trim()) {
    throw new Error("Pickup city is required");
  }

  if (!drop_city || !drop_city.trim()) {
    throw new Error("Drop city is required");
  }

  if (!travel_date) {
    throw new Error("Travel date is required");
  }

  if (!departure_time) {
    throw new Error("Departure time is required");
  }

  if (
    available_weight === undefined ||
    available_weight === null ||
    available_weight === ""
  ) {
    throw new Error("Available weight is required");
  }

  // =========================
  // VALIDATE WEIGHT
  // =========================

  const weight = Number(available_weight);

  if (
    Number.isNaN(weight) ||
    weight <= 0
  ) {
    throw new Error(
      "Available weight must be greater than 0"
    );
  }

  // =========================
  // PICKUP AND DROP VALIDATION
  // =========================

  if (
    pickup_city.trim().toLowerCase() ===
    drop_city.trim().toLowerCase()
  ) {
    throw new Error(
      "Pickup and drop city cannot be the same"
    );
  }

  // =========================
  // NOTES VALIDATION
  // =========================

  if (
    notes &&
    notes.length > 500
  ) {
    throw new Error(
      "Notes cannot exceed 500 characters"
    );
  }

  // =========================
  // CREATE RIDE
  // =========================

  return await rideRepository.createRide({
    traveller_user_id: traveller_user_id.trim(),

    pickup_city: pickup_city.trim(),

    pickup_state:
      pickup_state?.trim() || null,

    drop_city: drop_city.trim(),

    drop_state:
      drop_state?.trim() || null,

    travel_date,

    departure_time,

    available_weight: weight,

    notes:
      notes?.trim() || null,
  });
};

module.exports = {
  searchRides,
  createRide,
};