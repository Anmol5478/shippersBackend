const axios = require("axios");

const OLA_DIRECTIONS_URL =
  "https://api.olamaps.io/routing/v1/directions";

const calculateRoutes = async (pickup, drop) => {
  try {
    if (!pickup || !drop) {
      throw new Error(
        "Pickup and drop locations are required"
      );
    }

    const pickupLatitude = Number(pickup.latitude);
    const pickupLongitude = Number(pickup.longitude);

    const dropLatitude = Number(drop.latitude);
    const dropLongitude = Number(drop.longitude);

    // -----------------------------------------
    // Validate coordinates
    // -----------------------------------------

    if (
      !Number.isFinite(pickupLatitude) ||
      !Number.isFinite(pickupLongitude) ||
      !Number.isFinite(dropLatitude) ||
      !Number.isFinite(dropLongitude)
    ) {
      throw new Error(
        "Invalid pickup or drop coordinates"
      );
    }

    if (
      pickupLatitude < -90 ||
      pickupLatitude > 90 ||
      dropLatitude < -90 ||
      dropLatitude > 90
    ) {
      throw new Error("Invalid latitude");
    }

    if (
      pickupLongitude < -180 ||
      pickupLongitude > 180 ||
      dropLongitude < -180 ||
      dropLongitude > 180
    ) {
      throw new Error("Invalid longitude");
    }

    if (
      pickupLatitude === dropLatitude &&
      pickupLongitude === dropLongitude
    ) {
      throw new Error(
        "Pickup and drop locations cannot be the same"
      );
    }

    // -----------------------------------------
    // Validate Ola API key
    // -----------------------------------------

    if (!process.env.OLA_MAPS_API_KEY) {
      throw new Error(
        "OLA_MAPS_API_KEY is not configured"
      );
    }

    // -----------------------------------------
    // Ola Maps request
    // -----------------------------------------

    const params = {
      origin: `${pickupLatitude},${pickupLongitude}`,
      destination: `${dropLatitude},${dropLongitude}`,
      api_key: process.env.OLA_MAPS_API_KEY,

      // Return route geometry
      overview: "full",

      // Ask Ola for alternatives
      alternatives: true,

      // Traffic information
      traffic_metadata: true,
    };


    // IMPORTANT:
    // The working Postman request uses POST
    const response = await axios.post(
      OLA_DIRECTIONS_URL,
      null,
      {
        params,

        headers: {
          "X-Request-Id": `ride-${Date.now()}`,
        },

        timeout: 15000,
      }
    );

    const data = response?.data;

    // -----------------------------------------
    // Normalize Ola response
    // -----------------------------------------

    const routes = normalizeOlaRoutes(data);

    if (!routes.length) {
      throw new Error(
        "No routes found between the selected locations"
      );
    }

    return routes;
  } catch (error) {


    const olaMessage =
      error?.response?.data?.message ||
      error?.response?.data?.error_msg ||
      error?.response?.data?.error?.message ||
      error?.response?.data?.error ||
      error?.message;

    throw new Error(
      olaMessage ||
        "Unable to calculate routes"
    );
  }
};

/**
 * Convert Ola Maps response into
 * our application format.
 *
 * Actual Ola response:
 *
 * routes[]
 *   distance
 *   duration
 *   overview_polyline
 *   start_location
 *   end_location
 */
const normalizeOlaRoutes = (data) => {
  const olaRoutes = Array.isArray(data?.routes)
    ? data.routes
    : [];

  if (!olaRoutes.length) {
    return [];
  }

  return olaRoutes.map((route, index) => {
    // Ola Maps returns distance/duration inside legs
    const legs = Array.isArray(route?.legs)
      ? route.legs
      : [];

    // For a simple pickup -> drop route, there is normally one leg.
    // Using reduce also keeps this correct if multiple legs are returned.
    const distanceMeters = legs.reduce(
      (total, leg) =>
        total + Number(leg?.distance || 0),
      0
    );

    const durationSeconds = legs.reduce(
      (total, leg) =>
        total + Number(leg?.duration || 0),
      0
    );

    const firstLeg = legs[0] || {};
    const lastLeg = legs[legs.length - 1] || {};

    return {
      route_index: index,

      distance_km: Number(
        (distanceMeters / 1000).toFixed(2)
      ),

      duration_minutes: Math.ceil(
        durationSeconds / 60
      ),

      polyline:
        route?.overview_polyline || null,

      description:
        route?.summary || "",

      start_location:
        firstLeg?.start_location
          ? {
              latitude: Number(
                firstLeg.start_location.lat
              ),
              longitude: Number(
                firstLeg.start_location.lng
              ),
            }
          : null,

      end_location:
        lastLeg?.end_location
          ? {
              latitude: Number(
                lastLeg.end_location.lat
              ),
              longitude: Number(
                lastLeg.end_location.lng
              ),
            }
          : null,
    };
  });
};

module.exports = {
  calculateRoutes,
};