const rideRepository = require("./rideRepository");
const routingService = require("./routingService");

/**
 * Search available rides
 */
const searchRides = async (query) => {
  const {
    from,
    to,
    weight,
    date,
  } = query;

  if (!from || !to) {
    throw new Error(
      "From and To locations are required"
    );
  }

  let minWeight = null;
  let maxWeight = null;

  // =========================
  // WEIGHT FILTER
  // =========================

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
        throw new Error(
          "Invalid weight range"
        );
      }
    } else if (weight.endsWith("+")) {
      minWeight = Number(
        weight.replace("+", "")
      );

      if (
        Number.isNaN(minWeight) ||
        minWeight < 0
      ) {
        throw new Error(
          "Invalid weight"
        );
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
 * Get all rides published by a user
 */
const getUserRides = async (user_id) => {
  if (
    !user_id ||
    !user_id.trim()
  ) {
    throw new Error(
      "User ID is required"
    );
  }

  return await rideRepository.getUserRides(
    user_id.trim()
  );
};

/**
 * Create a new ride
 */
const createRide = async (data) => {
  const {
    user_id,

    pickup_city,
    pickup_state,
    pickup_latitude,
    pickup_longitude,

    drop_city,
    drop_state,
    drop_latitude,
    drop_longitude,

    travel_date,
    departure_time,

    available_weight,
    price_per_kg,

    route_index,
    route_distance_km,
    route_duration_minutes,
    route_polyline,

    notes,
  } = data;

  // =========================
  // REQUIRED FIELD VALIDATION
  // =========================

  if (!user_id) {
    throw new Error(
      "User ID is required"
    );
  }

  if (
    !pickup_city ||
    !pickup_city.trim()
  ) {
    throw new Error(
      "Pickup city is required"
    );
  }

  if (
    !drop_city ||
    !drop_city.trim()
  ) {
    throw new Error(
      "Drop city is required"
    );
  }

  if (!travel_date) {
    throw new Error(
      "Travel date is required"
    );
  }

  if (!departure_time) {
    throw new Error(
      "Departure time is required"
    );
  }

  if (
    available_weight === undefined ||
    available_weight === null ||
    available_weight === ""
  ) {
    throw new Error(
      "Available weight is required"
    );
  }

  // =========================
  // COORDINATES
  // =========================

  const pickupLat =
    Number(pickup_latitude);

  const pickupLng =
    Number(pickup_longitude);

  const dropLat =
    Number(drop_latitude);

  const dropLng =
    Number(drop_longitude);

  if (!Number.isFinite(pickupLat)) {
    throw new Error(
      "Valid pickup latitude is required"
    );
  }

  if (!Number.isFinite(pickupLng)) {
    throw new Error(
      "Valid pickup longitude is required"
    );
  }

  if (!Number.isFinite(dropLat)) {
    throw new Error(
      "Valid drop latitude is required"
    );
  }

  if (!Number.isFinite(dropLng)) {
    throw new Error(
      "Valid drop longitude is required"
    );
  }

  if (
    pickupLat < -90 ||
    pickupLat > 90
  ) {
    throw new Error(
      "Invalid pickup latitude"
    );
  }

  if (
    pickupLng < -180 ||
    pickupLng > 180
  ) {
    throw new Error(
      "Invalid pickup longitude"
    );
  }

  if (
    dropLat < -90 ||
    dropLat > 90
  ) {
    throw new Error(
      "Invalid drop latitude"
    );
  }

  if (
    dropLng < -180 ||
    dropLng > 180
  ) {
    throw new Error(
      "Invalid drop longitude"
    );
  }

  // =========================
  // WEIGHT
  // =========================

  const weight =
    Number(available_weight);

  if (
    !Number.isFinite(weight) ||
    weight <= 0
  ) {
    throw new Error(
      "Available weight must be greater than 0"
    );
  }

  // =========================
  // PRICE
  // =========================

  const price =
    Number(price_per_kg);

  if (
    !Number.isFinite(price) ||
    price < 0
  ) {
    throw new Error(
      "Price per kg must be 0 or greater"
    );
  }

  // =========================
  // PICKUP / DROP
  // =========================

  if (
    pickup_city
      .trim()
      .toLowerCase() ===
    drop_city
      .trim()
      .toLowerCase()
  ) {
    throw new Error(
      "Pickup and drop city cannot be the same"
    );
  }

  if (
    pickupLat === dropLat &&
    pickupLng === dropLng
  ) {
    throw new Error(
      "Pickup and drop locations cannot be the same"
    );
  }

  // =========================
  // ROUTE VALIDATION
  // =========================

  const routeIndex =
    Number(route_index);

  if (
    !Number.isInteger(routeIndex) ||
    routeIndex < 0
  ) {
    throw new Error(
      "Valid route index is required"
    );
  }

  const routeDistance =
    Number(route_distance_km);

  if (
    !Number.isFinite(routeDistance) ||
    routeDistance <= 0
  ) {
    throw new Error(
      "Valid route distance is required"
    );
  }

  const routeDuration =
    Number(route_duration_minutes);

  if (
    !Number.isFinite(routeDuration) ||
    routeDuration <= 0
  ) {
    throw new Error(
      "Valid route duration is required"
    );
  }

  if (
    !route_polyline ||
    typeof route_polyline !== "string"
  ) {
    throw new Error(
      "Selected route geometry is required"
    );
  }

  // =========================
  // NOTES
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
    user_id: user_id.trim(),

    pickup_city:
      pickup_city.trim(),

    pickup_state:
      pickup_state?.trim() || null,

    pickup_latitude: pickupLat,
    pickup_longitude: pickupLng,

    drop_city:
      drop_city.trim(),

    drop_state:
      drop_state?.trim() || null,

    drop_latitude: dropLat,
    drop_longitude: dropLng,

    travel_date,
    departure_time,

    available_weight: weight,
    price_per_kg: price,

    route_index: routeIndex,
    route_distance_km: routeDistance,
    route_duration_minutes: routeDuration,
    route_polyline,

    notes:
      notes?.trim() || null,
  });
};

/**
 * Calculate alternative routes
 */
const calculateRoutes = async (data) => {
  const {
    pickup,
    drop,
  } = data;

  if (!pickup) {
    throw new Error(
      "Pickup location is required"
    );
  }

  if (!drop) {
    throw new Error(
      "Drop location is required"
    );
  }

  const pickupLatitude =
    Number(pickup.latitude);

  const pickupLongitude =
    Number(pickup.longitude);

  const dropLatitude =
    Number(drop.latitude);

  const dropLongitude =
    Number(drop.longitude);

  // =========================
  // PICKUP COORDINATES
  // =========================

  if (
    !Number.isFinite(pickupLatitude) ||
    !Number.isFinite(pickupLongitude)
  ) {
    throw new Error(
      "Invalid pickup coordinates"
    );
  }

  // =========================
  // DROP COORDINATES
  // =========================

  if (
    !Number.isFinite(dropLatitude) ||
    !Number.isFinite(dropLongitude)
  ) {
    throw new Error(
      "Invalid drop coordinates"
    );
  }

  // =========================
  // RANGE VALIDATION
  // =========================

  if (
    pickupLatitude < -90 ||
    pickupLatitude > 90 ||
    dropLatitude < -90 ||
    dropLatitude > 90
  ) {
    throw new Error(
      "Invalid latitude"
    );
  }

  if (
    pickupLongitude < -180 ||
    pickupLongitude > 180 ||
    dropLongitude < -180 ||
    dropLongitude > 180
  ) {
    throw new Error(
      "Invalid longitude"
    );
  }

  // =========================
  // SAME LOCATION
  // =========================

  if (
    pickupLatitude === dropLatitude &&
    pickupLongitude === dropLongitude
  ) {
    throw new Error(
      "Pickup and drop locations cannot be the same"
    );
  }

  // =========================
  // CALL OLA MAPS
  // =========================

  return await routingService.calculateRoutes(
    {
      latitude: pickupLatitude,
      longitude: pickupLongitude,
    },
    {
      latitude: dropLatitude,
      longitude: dropLongitude,
    }
  );
};

module.exports = {
  searchRides,
  getUserRides,
  createRide,
  calculateRoutes,
};