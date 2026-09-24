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

    const params = {
      origin: `${pickupLatitude},${pickupLongitude}`,
      destination: `${dropLatitude},${dropLongitude}`,

      api_key: process.env.OLA_MAPS_API_KEY,

      // Ask Ola for alternative routes
      alternatives: true,

      // Use traffic-aware routing
      traffic_metadata: true,

      // Return route geometry
      overview: "full",
    };

    const response = await axios.get(
      OLA_DIRECTIONS_URL,
      {
        params,

        headers: {
          "X-Request-Id": `ride-${Date.now()}`,
        },

        timeout: 15000,
      }
    );

    const data = response?.data;

    console.log(
      "Ola Maps Directions Response:",
      JSON.stringify(data, null, 2)
    );

    const routes = normalizeOlaRoutes(data);

    if (!routes.length) {
      throw new Error(
        "No routes found between the selected locations"
      );
    }

    return routes;
  } catch (error) {
    console.error(
      "Ola Maps routing error:",
      error?.response?.data || error.message
    );

    const olaMessage =
      error?.response?.data?.message ||
      error?.response?.data?.error;

    throw new Error(
      olaMessage ||
        "Unable to calculate routes"
    );
  }
};


/**
 * Convert Ola Maps response into our own
 * application format.
 */
const normalizeOlaRoutes = (data) => {
  const olaRoutes = data?.routes || [];

  if (!Array.isArray(olaRoutes)) {
    return [];
  }

  return olaRoutes.map((route, index) => {
    const distanceMeters = Number(route.distance || 0);
    const durationSeconds = Number(route.duration || 0);

    return {
      route_index: index,

      distance_km: Number(
        (distanceMeters / 1000).toFixed(2)
      ),

      duration_minutes: Math.ceil(
        durationSeconds / 60
      ),

      polyline: route.overview_polyline || null,

      description: route.summary || null,

      start_location: route.start_location
        ? {
            latitude: Number(route.start_location.lat),
            longitude: Number(route.start_location.lng),
          }
        : null,

      end_location: route.end_location
        ? {
            latitude: Number(route.end_location.lat),
            longitude: Number(route.end_location.lng),
          }
        : null,
    };
  });
};


/**
 * Handles:
 *
 * 1200
 * "1200"
 * "1200s"
 * "20m"
 */
const parseDuration = (duration) => {
  if (duration === null || duration === undefined) {
    return 0;
  }

  if (typeof duration === "number") {
    return duration;
  }

  const value = String(duration).trim();

  if (/^\d+(\.\d+)?$/.test(value)) {
    return Number(value);
  }

  const secondsMatch =
    value.match(/^([\d.]+)s$/i);

  if (secondsMatch) {
    return Number(secondsMatch[1]);
  }

  const minutesMatch =
    value.match(/^([\d.]+)m$/i);

  if (minutesMatch) {
    return Number(minutesMatch[1]) * 60;
  }

  return 0;
};


module.exports = {
  calculateRoutes,
};