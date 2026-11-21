const sharp = require("sharp");

const { assertUserNotBlocked } = require("../../utils/userStatus");
const rideRepository = require("./rideRepository");
const routingService = require("./routingService");
const db = require("../../config/db");
const bookingRepository = require("../bookings/bookingRepository");

const {
  uploadToR2,
  deleteFromR2,
} = require("./rideProofStorage");
const pricingService = require("../pricing/pricingService");

const ALLOWED_TRANSPORT_TYPES = [
  "PUBLIC_TRANSPORT",
  "PRIVATE_VEHICLE",
];

const ALLOWED_PUBLIC_MODES = ["TRAIN", "BUS", "FLIGHT"];
const ALLOWED_PRIVATE_MODES = ["CAR", "BIKE", "OTHER"];

const ALLOWED_MIME_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
];

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
        !Number.isFinite(minWeight) ||
        !Number.isFinite(maxWeight) ||
        minWeight < 0 ||
        maxWeight <= minWeight
      ) {
        throw new Error("Invalid weight range");
      }
    } else if (weight.endsWith("+")) {
      minWeight = Number(weight.replace("+", ""));

      if (!Number.isFinite(minWeight) || minWeight < 0) {
        throw new Error("Invalid weight");
      }
    } else {
      throw new Error("Weight must be in format like 1-3 or 5+");
    }
  }

  return rideRepository.searchRides({
    from: from.trim(),
    to: to.trim(),
    minWeight,
    maxWeight,
    date,
  });
};


const searchPassengerRides = async (query) => {
  const from = String(query.from || "").trim();
  const to = String(query.to || "").trim();
  const date = query.date || null;
  const seats = Number(query.seats || 1);
  if (!from || !to) throw new Error("From and To locations are required");
  if (from.toLowerCase() === to.toLowerCase()) throw new Error("From and To locations must be different");
  if (!Number.isInteger(seats) || seats < 1 || seats > 8) throw new Error("Seats must be between 1 and 8");
  if (date && !/^\d{4}-\d{2}-\d{2}$/.test(String(date))) throw new Error("Date must be YYYY-MM-DD");
  const rows = await rideRepository.searchPassengerRides({ from, to, date, seats });
  return (rows || []).map((ride) => {
    let pricing = null;
    try {
      pricing = computePassengerBookingBreakdown({
        price_per_seat: Number(ride.price_per_seat),
        seats,
      });
    } catch (_) {
      pricing = null;
    }
    return {
      ...ride,
      // Explicit city fields for list UI (never use street-level address here)
      pickup_city: ride.pickup_city,
      drop_city: ride.drop_city,
      requested_seats: seats,
      // Payable breakdown for the requested seat count
      customer_pay: pricing?.customer_pay ?? null,
      commission_percentage: pricing?.commission_percentage ?? null,
      commission_amount: pricing?.commission_amount ?? null,
      platform_fee: pricing?.platform_fee ?? null,
      taxes: pricing?.taxes ?? null,
      total_payable: pricing?.total_payable ?? null,
      pricing,
    };
  });
};

/**
 * Homepage discovery: cheapest upcoming rides across all routes.
 */
const getCheapestRides = async (query = {}) => {
  const serviceType = String(query.serviceType || "PARCEL").trim().toUpperCase();
  if (!["PARCEL", "PASSENGER"].includes(serviceType)) {
    throw new Error("serviceType must be PARCEL or PASSENGER");
  }

  const limit = Number(query.limit ?? 6);
  if (!Number.isInteger(limit) || limit < 1 || limit > 12) {
    throw new Error("limit must be an integer between 1 and 12");
  }

  return rideRepository.getCheapestRides({ serviceType, limit });
};

/**
 * Get rides published by user.
 */
const getUserRides = async (userId) => {
  if (!userId || !String(userId).trim()) {
    throw new Error("User ID is required");
  }

  return rideRepository.getUserRides(String(userId).trim());
};

/**
 * Convert uploaded image to WebP.
 */
const processImage = async (file) => {
  if (!file) {
    return null;
  }

  if (!ALLOWED_MIME_TYPES.includes(file.mimetype)) {
    throw new Error("Only JPG, PNG and WEBP images are allowed");
  }

  if (file.size > 10 * 1024 * 1024) {
    throw new Error("Uploaded file must not exceed 10MB");
  }

  return sharp(file.buffer)
    .rotate()
    .webp({ quality: 85 })
    .toBuffer();
};

/**
 * Upload proof document to R2 under rides/{rideId}/...
 */
const uploadProofDocument = async ({ file, rideId, documentType }) => {
  if (!file) {
    return null;
  }

  const buffer = await processImage(file);

  return uploadToR2({
    buffer,
    rideId,
    documentType,
  });
};

/**
 * Validate public/private proof requirements.
 */
const validateProof = ({
  transportType,
  pnrNumber,
  ticketFile,
  vehicleNumber,
  dlFile,
  rcFile,
}) => {
  if (transportType === "PUBLIC_TRANSPORT") {
    const hasTicket = !!ticketFile;
    const hasPnr = !!pnrNumber && String(pnrNumber).trim();

    if (!hasTicket && !hasPnr) {
      throw new Error(
        "Public transport requires a ticket or PNR"
      );
    }

    if (hasPnr && String(pnrNumber).length > 100) {
      throw new Error("PNR number cannot exceed 100 characters");
    }

    return;
  }

  if (transportType === "PRIVATE_VEHICLE") {
    if (!vehicleNumber || !String(vehicleNumber).trim()) {
      throw new Error("Vehicle number is required");
    }

    if (!dlFile) {
      throw new Error("Driving Licence is required");
    }

    if (!rcFile) {
      throw new Error("RC document is required");
    }

    return;
  }
};

/**
 * Shape the API response — never expose internal R2 object keys.
 */
const shapeRideResponse = (ride) => {
  return {
    ride: {
      id: ride.id,
      stops: ride.stops || [],
      segment_count: ride.segment_count || 1,
      user_id: ride.user_id,
      transport_type: ride.transport_type,
      transport_mode: ride.transport_mode,
      service_type: ride.service_type || "PARCEL",
      available_seats: Number(ride.available_seats || 0),
      price_per_seat: ride.price_per_seat ?? null,
      pickup_city: ride.pickup_city,
      pickup_state: ride.pickup_state,
      pickup_latitude: ride.pickup_latitude,
      pickup_longitude: ride.pickup_longitude,
      pickup_address: ride.pickup_address || null,
      drop_city: ride.drop_city,
      drop_state: ride.drop_state,
      drop_latitude: ride.drop_latitude,
      drop_longitude: ride.drop_longitude,
      drop_address: ride.drop_address || null,
      travel_date: ride.travel_date,
      departure_time: ride.departure_time,
      available_weight: ride.available_weight,
      price_per_kg: ride.price_per_kg,
      route: {
        route_index: ride.route_index,
        distance_km: ride.route_distance_km,
        duration_minutes: ride.route_duration_minutes,
        polyline: ride.route_polyline,
      },
      status: ride.status || "active",
      notes: ride.notes || null,
      proof: {
        vehicle_number: ride.proof?.vehicle_number || null,
        pnr_number: ride.proof?.pnr_number || null,
        verification_status:
          ride.proof?.verification_status || "PENDING",
      },
    },
  };
};

/**
 * Create and publish ride.
 *
 * Safe order:
 * 1. Validate all fields + files
 * 2. Begin DB transaction, insert ride → get real rideId
 * 3. Upload documents to R2 using rides/{rideId}/...
 * 4. Insert ride_travel_proof
 * 5. Commit
 * On any failure after uploads → rollback + delete R2 objects
 */
const createRide = async ({ userId, body, files }) => {
  if (!userId) {
    throw new Error("Authenticated user is required");
  }
  await assertUserNotBlocked(userId);

  const {
    transport_type,
    transport_mode,
    service_type = "PARCEL",
    available_seats,
    price_per_seat,
    intermediate_stops,
    pickup_city,
    pickup_state,
    pickup_latitude,
    pickup_longitude,
    pickup_address,
    drop_city,
    drop_state,
    drop_latitude,
    drop_longitude,
    drop_address,
    travel_date,
    departure_time,
    available_weight,
    price_per_kg,
    route_index,
    route_distance_km,
    route_duration_minutes,
    route_polyline,
    notes,
    pnr_number,
    vehicle_number,
  } = body;

  if (!userId) {
    throw new Error("Authenticated user is required");
  }

  if (!ALLOWED_TRANSPORT_TYPES.includes(transport_type)) {
    throw new Error("Invalid transport type");
  }

  const normalizedServiceType = String(service_type || "PARCEL").trim().toUpperCase();
  if (!["PARCEL", "PASSENGER", "BOTH"].includes(normalizedServiceType)) {
    throw new Error("Invalid service_type. Allowed: PARCEL, PASSENGER, BOTH");
  }

  if (!transport_mode) {
    throw new Error("Transport mode is required");
  }

  if (transport_type === "PUBLIC_TRANSPORT") {
    if (!ALLOWED_PUBLIC_MODES.includes(transport_mode)) {
      throw new Error("Invalid public transport mode");
    }
  }

  if (transport_type === "PRIVATE_VEHICLE") {
    if (!ALLOWED_PRIVATE_MODES.includes(transport_mode)) {
      throw new Error("Invalid private vehicle mode");
    }
  }

  if (!pickup_city || !String(pickup_city).trim()) {
    throw new Error("Pickup city is required");
  }

  if (!drop_city || !String(drop_city).trim()) {
    throw new Error("Drop city is required");
  }

  if (
    String(pickup_city).trim().toLowerCase() ===
    String(drop_city).trim().toLowerCase()
  ) {
    throw new Error("Pickup and drop city cannot be the same");
  }

  if (!travel_date) {
    throw new Error("Travel date is required");
  }

  if (!departure_time) {
    throw new Error("Departure time is required");
  }

  // Strict timing: travel date+time must be in the future
  {
    const dateStr = String(travel_date).trim();
    const timeStr = String(departure_time).trim();
    // Accept HH:mm or HH:mm:ss
    const timeMatch = timeStr.match(/^(\d{1,2}):(\d{2})(?::\d{2})?$/);
    if (!/^\d{4}-\d{2}-\d{2}$/.test(dateStr) || !timeMatch) {
      throw new Error("Invalid travel date or departure time format");
    }
    const hours = Number(timeMatch[1]);
    const minutes = Number(timeMatch[2]);
    if (
      !Number.isFinite(hours) ||
      !Number.isFinite(minutes) ||
      hours < 0 ||
      hours > 23 ||
      minutes < 0 ||
      minutes > 59
    ) {
      throw new Error("Invalid departure time");
    }
    const departure = new Date(`${dateStr}T00:00:00`);
    if (Number.isNaN(departure.getTime())) {
      throw new Error("Invalid travel date");
    }
    departure.setHours(hours, minutes, 0, 0);
    if (departure.getTime() <= Date.now()) {
      throw new Error(
        "Travel date and departure time must be in the future"
      );
    }
  }

  const pickupLat = Number(pickup_latitude);
  const pickupLng = Number(pickup_longitude);
  const dropLat = Number(drop_latitude);
  const dropLng = Number(drop_longitude);

  if (!Number.isFinite(pickupLat)) {
    throw new Error("Valid pickup latitude is required");
  }
  if (!Number.isFinite(pickupLng)) {
    throw new Error("Valid pickup longitude is required");
  }
  if (!Number.isFinite(dropLat)) {
    throw new Error("Valid drop latitude is required");
  }
  if (!Number.isFinite(dropLng)) {
    throw new Error("Valid drop longitude is required");
  }

  if (
    pickupLat < -90 ||
    pickupLat > 90 ||
    dropLat < -90 ||
    dropLat > 90
  ) {
    throw new Error("Invalid latitude");
  }

  if (
    pickupLng < -180 ||
    pickupLng > 180 ||
    dropLng < -180 ||
    dropLng > 180
  ) {
    throw new Error("Invalid longitude");
  }

  if (pickupLat === dropLat && pickupLng === dropLng) {
    throw new Error(
      "Pickup and drop locations cannot be the same"
    );
  }

  const includesParcel = ["PARCEL", "BOTH"].includes(normalizedServiceType);
  const includesPassenger = ["PASSENGER", "BOTH"].includes(normalizedServiceType);

  const weight = includesParcel ? Number(available_weight) : null;
  if (includesParcel && (!Number.isFinite(weight) || weight <= 0)) {
    throw new Error("Available weight must be greater than 0 for parcel services");
  }

  const price = includesParcel ? Number(price_per_kg) : null;
  if (includesParcel && (!Number.isFinite(price) || price < 0)) {
    throw new Error("Price per kg must be 0 or greater for parcel services");
  }

  const seats = includesPassenger ? Number(available_seats) : 0;
  if (includesPassenger && (!Number.isInteger(seats) || seats <= 0 || seats > 100)) {
    throw new Error("Available seats must be an integer between 1 and 100");
  }

  const seatPrice = includesPassenger ? Number(price_per_seat) : null;
  if (includesPassenger && (!Number.isFinite(seatPrice) || seatPrice < 0)) {
    throw new Error("Price per seat must be 0 or greater for passenger services");
  }

  // Server-side price-range validation (never trust client).
  // Uses the same pricing engine as /api/pricing/estimate so published
  // unit prices stay inside the permitted band for this distance/mode.
  {
    const routeDistanceForPricing = Number(route_distance_km);
    if (!Number.isFinite(routeDistanceForPricing) || routeDistanceForPricing <= 0) {
      throw new Error("Valid route distance is required for price validation");
    }

    if (includesParcel) {
      pricingService.validateSelectedPrice({
        selected_price: price,
        service_type: "PARCEL",
        distance_km: routeDistanceForPricing,
        transport_mode,
        weight_kg: weight,
      });
    }

    if (includesPassenger) {
      pricingService.validateSelectedPrice({
        selected_price: seatPrice,
        service_type: "PASSENGER",
        distance_km: routeDistanceForPricing,
        transport_mode,
        seats: seats,
      });
    }
  }

  let normalizedIntermediateStops = [];
  if (intermediate_stops !== undefined && intermediate_stops !== null && intermediate_stops !== "") {
    try {
      normalizedIntermediateStops = typeof intermediate_stops === "string"
        ? JSON.parse(intermediate_stops)
        : intermediate_stops;
    } catch {
      throw new Error("intermediate_stops must be a valid JSON array");
    }
    if (!Array.isArray(normalizedIntermediateStops) || normalizedIntermediateStops.length > 20) {
      throw new Error("intermediate_stops must be an array with at most 20 stops");
    }
    normalizedIntermediateStops = normalizedIntermediateStops.map((stop, index) => {
      const city = String(stop?.city || "").trim();
      if (!city || city.length > 150) {
        throw new Error(`Intermediate stop ${index + 1} requires a city (max 150 characters)`);
      }
      const latitude = stop.latitude === null || stop.latitude === undefined || stop.latitude === "" ? null : Number(stop.latitude);
      const longitude = stop.longitude === null || stop.longitude === undefined || stop.longitude === "" ? null : Number(stop.longitude);
      if ((latitude === null) !== (longitude === null)) {
        throw new Error(`Intermediate stop ${index + 1} must provide both latitude and longitude`);
      }
      if (latitude !== null && (!Number.isFinite(latitude) || latitude < -90 || latitude > 90)) {
        throw new Error(`Intermediate stop ${index + 1} has invalid latitude`);
      }
      if (longitude !== null && (!Number.isFinite(longitude) || longitude < -180 || longitude > 180)) {
        throw new Error(`Intermediate stop ${index + 1} has invalid longitude`);
      }
      return {
        city,
        state: stop.state ? String(stop.state).trim() : null,
        address: stop.address ? String(stop.address).trim() : null,
        latitude,
        longitude,
        planned_arrival_at: stop.planned_arrival_at || null,
        planned_departure_at: stop.planned_departure_at || null,
      };
    });
  }

  const routeIndex = Number(route_index);
  if (!Number.isInteger(routeIndex) || routeIndex < 0) {
    throw new Error("Valid route index is required");
  }

  const routeDistance = Number(route_distance_km);
  if (!Number.isFinite(routeDistance) || routeDistance <= 0) {
    throw new Error("Valid route distance is required");
  }

  const routeDuration = Number(route_duration_minutes);
  if (!Number.isFinite(routeDuration) || routeDuration <= 0) {
    throw new Error("Valid route duration is required");
  }

  if (!route_polyline || typeof route_polyline !== "string") {
    throw new Error("Selected route geometry is required");
  }

  if (notes && String(notes).length > 500) {
    throw new Error("Notes cannot exceed 500 characters");
  }

  const ticketFile = files?.ticket?.[0] || null;
  const vehiclePhotoFile = files?.vehicle_photo?.[0] || null;
  const dlFile = files?.dl?.[0] || null;
  const rcFile = files?.rc?.[0] || null;

  validateProof({
    transportType: transport_type,
    pnrNumber: pnr_number,
    ticketFile,
    vehicleNumber: vehicle_number,
    dlFile,
    rcFile,
  });

  const connection = await db.getConnection();
  const uploadedKeys = [];

  try {
    await connection.beginTransaction();

    const normalizeAddress = (value, fallbackCity) => {
      const trimmed = value != null ? String(value).trim() : "";
      if (trimmed) return trimmed.slice(0, 500);
      // Always persist a usable address on stops (city is the minimum)
      return fallbackCity ? String(fallbackCity).trim().slice(0, 500) : null;
    };

    const ridePayload = {
      user_id: String(userId).trim(),
      transport_type,
      transport_mode,
      service_type: normalizedServiceType,
      available_seats: seats,
      price_per_seat: seatPrice,
      pickup_city: String(pickup_city).trim(),
      pickup_state: pickup_state
        ? String(pickup_state).trim()
        : null,
      pickup_latitude: pickupLat,
      pickup_longitude: pickupLng,
      pickup_address: normalizeAddress(pickup_address, pickup_city),
      drop_city: String(drop_city).trim(),
      drop_state: drop_state ? String(drop_state).trim() : null,
      drop_latitude: dropLat,
      drop_longitude: dropLng,
      drop_address: normalizeAddress(drop_address, drop_city),
      travel_date,
      departure_time,
      available_weight: weight,
      price_per_kg: price,
      route_index: routeIndex,
      route_distance_km: routeDistance,
      route_duration_minutes: routeDuration,
      route_polyline,
      notes: notes ? String(notes).trim() : null,
    };

    const rideId = await rideRepository.insertRideOnly(
      connection,
      ridePayload
    );

    const routeStops = await rideRepository.insertRideStopsAndSegments(
      connection,
      rideId,
      ridePayload,
      normalizedIntermediateStops
    );

    let ticketKey = null;
    let vehiclePhotoKey = null;
    let dlKey = null;
    let rcKey = null;

    if (ticketFile) {
      ticketKey = await uploadProofDocument({
        file: ticketFile,
        rideId,
        documentType: "ticket",
      });
      uploadedKeys.push(ticketKey);
    }

    if (vehiclePhotoFile) {
      vehiclePhotoKey = await uploadProofDocument({
        file: vehiclePhotoFile,
        rideId,
        documentType: "vehicle",
      });
      uploadedKeys.push(vehiclePhotoKey);
    }

    if (dlFile) {
      dlKey = await uploadProofDocument({
        file: dlFile,
        rideId,
        documentType: "dl",
      });
      uploadedKeys.push(dlKey);
    }

    if (rcFile) {
      rcKey = await uploadProofDocument({
        file: rcFile,
        rideId,
        documentType: "rc",
      });
      uploadedKeys.push(rcKey);
    }

    const proofPayload = {
      ticket_document_key: ticketKey,
      pnr_number: pnr_number
        ? String(pnr_number).trim()
        : null,
      vehicle_number: vehicle_number
        ? String(vehicle_number).trim()
        : null,
      vehicle_photo_key: vehiclePhotoKey,
      dl_document_key: dlKey,
      rc_document_key: rcKey,
    };

    await rideRepository.insertTravelProof(
      connection,
      rideId,
      proofPayload
    );

    await connection.commit();

    return shapeRideResponse({
      id: rideId,
      ...ridePayload,
      status: "active",
      stops: routeStops.stops,
      segment_count: routeStops.segment_count,
      proof: {
        pnr_number: proofPayload.pnr_number,
        vehicle_number: proofPayload.vehicle_number,
        verification_status: "PENDING",
      },
    });
  } catch (error) {
    await connection.rollback();

    await Promise.all(
      uploadedKeys.map((key) =>
        deleteFromR2(key).catch((deleteError) => {
          console.error("R2 cleanup failed:", deleteError);
        })
      )
    );

    throw error;
  } finally {
    connection.release();
  }
};

/**
 * Calculate alternative routes.
 */
const calculateRoutes = async (data) => {
  const { pickup, drop } = data;

  if (!pickup) {
    throw new Error("Pickup location is required");
  }

  if (!drop) {
    throw new Error("Drop location is required");
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
    throw new Error("Invalid pickup or drop coordinates");
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

  return routingService.calculateRoutes(
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

/**
 * Driver accepts / rejects a booking received on one of their rides.
 *
 * Authorization is based on rides.user_id, not sender_id.
 * The authenticated user must be the owner/driver of the ride
 * attached to the booking.
 */
const updateBookingStatus = async ({ bookingId, userId, status }) => {
  if (!userId) {
    throw new Error("Authenticated user is required");
  }

  const id = Number(bookingId);

  if (!Number.isInteger(id) || id <= 0) {
    throw new Error("Invalid booking ID");
  }

  const finalStatus = String(status || "")
    .trim()
    .toUpperCase();

  // Keep the existing database values for compatibility.
  // APPROVED is accepted as an alias for CONFIRMED.
  const normalizedStatus =
    finalStatus === "APPROVED"
      ? "CONFIRMED"
      : finalStatus;

  const allowedStatuses = ["CONFIRMED", "REJECTED"];

  if (!allowedStatuses.includes(normalizedStatus)) {
    throw new Error(
      "Invalid booking status. Allowed: CONFIRMED, REJECTED"
    );
  }

  const connection = await db.getConnection();

  try {
    await connection.beginTransaction();

    const [bookingRows] = await connection.execute(
      `
        SELECT
          b.id,
          b.ride_id,
          b.sender_id,
          b.driver_id,
          b.booking_status,
          b.shipment_type,
          b.purchase_bill_status,
          r.user_id AS ride_owner_id
        FROM bookings b
        INNER JOIN rides r ON b.ride_id = r.id
        WHERE b.id = ?
        LIMIT 1
        FOR UPDATE
      `,
      [id]
    );

    const booking = bookingRows[0];
    if (!booking) {
      throw new Error("Booking not found");
    }

    if (String(booking.ride_owner_id) !== String(userId)) {
      throw new Error(
        "Only the driver who published this ride can approve or reject this booking"
      );
    }

    if (booking.booking_status !== "PENDING") {
      throw new Error(
        "Only pending bookings can be accepted or rejected"
      );
    }

    if (normalizedStatus === "CONFIRMED") {
      await bookingRepository.assertBusinessPurchaseBill(connection, booking);
    }

    if (normalizedStatus === "REJECTED") {
      await bookingRepository.releaseParcelAllocation(connection, id);
    }

    const [updateResult] = await connection.execute(
      `
        UPDATE bookings
        SET booking_status = ?
        WHERE id = ?
          AND booking_status = 'PENDING'
      `,
      [normalizedStatus, id]
    );

    if (!updateResult.affectedRows) {
      throw new Error(
        "Booking status could not be updated. It may no longer be pending"
      );
    }

    await connection.commit();
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }

  return bookingRepository.getBookingById(id);
};

const updateRideServices = async ({ rideId, userId, body = {} }) => {
  const parcelEnabled = Boolean(body.parcel_enabled);
  const passengerEnabled = Boolean(body.passenger_enabled);
  if (!parcelEnabled && !passengerEnabled) throw new Error("At least one service must remain enabled");
  const serviceType = parcelEnabled && passengerEnabled ? "BOTH" : parcelEnabled ? "PARCEL" : "PASSENGER";
  const connection = await db.getConnection();
  try {
    await connection.beginTransaction();
    const [rideRows] = await connection.execute("SELECT id, user_id FROM rides WHERE id = ? LIMIT 1 FOR UPDATE", [rideId]);
    const ride = rideRows[0];
    if (!ride) throw new Error("Ride not found");
    if (String(ride.user_id) !== String(userId)) throw new Error("Only the ride owner can update service settings");
    const [segments] = await connection.execute("SELECT id, reserved_weight_kg, reserved_seats FROM ride_segments WHERE ride_id = ? FOR UPDATE", [rideId]);
    if (!parcelEnabled && segments.some((s) => Number(s.reserved_weight_kg) > 0)) throw new Error("Cannot disable parcels while parcel bookings are active");
    if (!passengerEnabled && segments.some((s) => Number(s.reserved_seats) > 0)) throw new Error("Cannot disable passengers while passenger bookings are active");
    const weight = parcelEnabled ? Number(body.available_weight) : 0;
    const kgPrice = parcelEnabled ? Number(body.price_per_kg) : null;
    const seats = passengerEnabled ? Number(body.available_seats) : 0;
    const seatPrice = passengerEnabled ? Number(body.price_per_seat) : null;
    if (parcelEnabled && (!Number.isFinite(weight) || weight <= 0 || !Number.isFinite(kgPrice) || kgPrice < 0)) throw new Error("Enter valid parcel weight and price");
    if (passengerEnabled && (!Number.isInteger(seats) || seats < 1 || seats > 100 || !Number.isFinite(seatPrice) || seatPrice < 0)) throw new Error("Enter valid passenger seats and fare");

    // Re-validate unit prices against the pricing engine using the ride's
    // stored distance and transport mode.
    {
      const [metaRows] = await connection.execute(
        "SELECT transport_mode, route_distance_km FROM rides WHERE id = ? LIMIT 1",
        [rideId]
      );
      const meta = metaRows[0];
      if (!meta) throw new Error("Ride not found");
      const distanceKm = Number(meta.route_distance_km);
      const mode = meta.transport_mode;
      if (parcelEnabled) {
        pricingService.validateSelectedPrice({
          selected_price: kgPrice,
          service_type: "PARCEL",
          distance_km: distanceKm,
          transport_mode: mode,
          weight_kg: weight,
        });
      }
      if (passengerEnabled) {
        pricingService.validateSelectedPrice({
          selected_price: seatPrice,
          service_type: "PASSENGER",
          distance_km: distanceKm,
          transport_mode: mode,
          seats,
        });
      }
    }

    for (const segment of segments) {
      if (parcelEnabled && weight < Number(segment.reserved_weight_kg)) throw new Error("Parcel capacity cannot be lower than already reserved weight");
      if (passengerEnabled && seats < Number(segment.reserved_seats)) throw new Error("Seat capacity cannot be lower than already reserved seats");
    }
    await connection.execute(`UPDATE rides SET service_type = ?, available_weight = ?, price_per_kg = ?, available_seats = ?, price_per_seat = ? WHERE id = ?`, [serviceType, parcelEnabled ? weight : null, kgPrice, seats, seatPrice, rideId]);
    await connection.execute(`UPDATE ride_segments SET capacity_weight_kg = ?, capacity_seats = ? WHERE ride_id = ?`, [parcelEnabled ? weight : 0, passengerEnabled ? seats : 0, rideId]);
    await connection.commit();
    return { ride_id: Number(rideId), service_type: serviceType, parcel_enabled: parcelEnabled, passenger_enabled: passengerEnabled, available_weight: parcelEnabled ? weight : null, price_per_kg: kgPrice, available_seats: seats, price_per_seat: seatPrice };
  } catch (error) { await connection.rollback(); throw error; }
  finally { connection.release(); }
};

module.exports = {
  updateRideServices,
  searchRides,
  searchPassengerRides,
  getCheapestRides,
  getUserRides,
  createRide,
  calculateRoutes,
  updateBookingStatus,
};