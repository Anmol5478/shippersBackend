const crypto = require("crypto");
const sharp = require("sharp");
const db = require("../../config/db");
const { uploadToR2, deleteFromR2 } = require("../rides/rideProofStorage");
const bookingRepository = require("./bookingRepository");

const PAYMENT_METHODS = ["CASH", "UPI", "ONLINE"];
const PAYMENT_POINTS = ["PICKUP", "DROP"];

const PACKAGE_CATEGORIES = [
  "DOCUMENTS",
  "CLOTHES",
  "ELECTRONICS",
  "FOOD",
  "MEDICINE",
  "OTHER",
];

/**
 * Generate booking reference.
 * Example: RZBK-A81F92C1
 */
const generateBookingReference = () => {
  return (
    "RZBK-" +
    crypto.randomBytes(4).toString("hex").toUpperCase()
  );
};

/**
 * Generate 6-digit OTP.
 */
const generateOtp = () => {
  return String(crypto.randomInt(100000, 1000000));
};

/**
 * Validate phone number.
 */
const validatePhone = (phone) => {
  const value = String(phone || "").trim();

  if (!/^[0-9]{10,15}$/.test(value)) {
    throw new Error("Enter a valid phone number");
  }

  return value;
};

/**
 * Create booking.
 */
const createBooking = async ({ userId, body }) => {
  if (!userId) {
    throw new Error("Authenticated user is required");
  }

  const {
    ride_id,
    package_weight_kg,
    package_category,
    package_description,
    package_count,
    sender_name,
    sender_phone,
    pickup_address,
    drop_address,
    notes,
    payment_method,
    payment_collection_point,
  } = body;

  // ==========================================
  // BASIC VALIDATION
  // ==========================================

  const rideId = Number(ride_id);

  if (!Number.isInteger(rideId) || rideId <= 0) {
    throw new Error("Valid ride ID is required");
  }

  const packageWeight = Number(package_weight_kg);

  if (!Number.isFinite(packageWeight) || packageWeight <= 0) {
    throw new Error("Package weight must be greater than 0 KG");
  }

  if (packageWeight > 1000) {
    throw new Error("Package weight cannot exceed 1000 KG");
  }

  const packageCount = Number(package_count ?? 1);

  if (!Number.isInteger(packageCount) || packageCount <= 0) {
    throw new Error("Package count must be at least 1");
  }

  const senderName = String(sender_name || "").trim();

  if (!senderName) {
    throw new Error("Sender name is required");
  }

  if (senderName.length > 150) {
    throw new Error("Sender name cannot exceed 150 characters");
  }

  const senderPhone = validatePhone(sender_phone);

  const description = package_description
    ? String(package_description).trim()
    : null;

  if (description && description.length > 500) {
    throw new Error("Package description cannot exceed 500 characters");
  }

  const category = package_category
    ? String(package_category).trim().toUpperCase()
    : null;

  if (category && !PACKAGE_CATEGORIES.includes(category)) {
    throw new Error(
      "Invalid package category. Allowed: " + PACKAGE_CATEGORIES.join(", ")
    );
  }

  const finalPaymentMethod = String(payment_method || "CASH")
    .trim()
    .toUpperCase();

  if (!PAYMENT_METHODS.includes(finalPaymentMethod)) {
    throw new Error("Invalid payment method");
  }

  const finalPaymentPoint = String(payment_collection_point || "DROP")
    .trim()
    .toUpperCase();

  if (!PAYMENT_POINTS.includes(finalPaymentPoint)) {
    throw new Error("Payment collection point must be PICKUP or DROP");
  }

  if (notes && String(notes).length > 500) {
    throw new Error("Notes cannot exceed 500 characters");
  }

  // ==========================================
  // TRANSACTION
  // ==========================================

  const connection = await db.getConnection();

  try {
    await connection.beginTransaction();

    // ========================================
    // LOCK RIDE
    // ========================================

    const ride = await bookingRepository.getRideForBooking(
      connection,
      rideId
    );

    if (!ride) {
      throw new Error("Ride not found");
    }

    // ========================================
    // CANNOT BOOK OWN RIDE
    // ========================================

    if (String(ride.user_id) === String(userId)) {
      throw new Error("You cannot book your own ride");
    }

    // ========================================
    // RIDE STATUS
    // ========================================

    if (ride.status !== "active") {
      throw new Error("This ride is no longer available");
    }

    // ========================================
    // RESERVED WEIGHT
    // ========================================

    const reservedWeight = await bookingRepository.getReservedWeight(
      connection,
      rideId
    );

    const rideCapacity = Number(ride.available_weight);
    const remainingWeight = Math.max(0, rideCapacity - reservedWeight);

    // ========================================
    // WEIGHT CHECK
    // ========================================

    if (packageWeight > remainingWeight) {
      throw new Error(
        `Only ${remainingWeight.toFixed(2)} KG is available on this ride`
      );
    }

    // ========================================
    // PRICE FROM DATABASE
    // ========================================

    const pricePerKg = Number(ride.price_per_kg);

    if (!Number.isFinite(pricePerKg) || pricePerKg < 0) {
      throw new Error("Invalid ride price");
    }

    const totalAmount = Number((packageWeight * pricePerKg).toFixed(2));

    // ========================================
    // CREATE BOOKING
    // ========================================

    const bookingReference = generateBookingReference();
    const bookingId = await bookingRepository.createBooking(connection, {
      booking_reference: bookingReference,
      ride_id: rideId,
      sender_id: String(userId),
      driver_id: String(ride.user_id),
      package_weight_kg: packageWeight,
      package_category: category,
      package_description: description,
      package_count: packageCount,
      sender_name: senderName,
      sender_phone: senderPhone,
      pickup_address: pickup_address
        ? String(pickup_address).trim()
        : null,
      drop_address: drop_address ? String(drop_address).trim() : null,
      notes: notes ? String(notes).trim() : null,
      price_per_kg: pricePerKg,
      total_amount: totalAmount,
      payment_method: finalPaymentMethod,
      payment_collection_point: finalPaymentPoint,
      pickup_otp: null,
      delivery_otp: null,
    });

    await connection.commit();

    // ========================================
    // GET COMPLETE BOOKING
    // ========================================

    const booking = await bookingRepository.getBookingById(bookingId);

    return {
      booking,
      capacity: {
        ride_capacity_kg: rideCapacity,
        reserved_before_booking_kg: reservedWeight,
        booked_weight_kg: packageWeight,
        remaining_weight_kg: Number(
          (remainingWeight - packageWeight).toFixed(2)
        ),
      },
    };
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
};

/**
 * Get single booking.
 */
const getBooking = async ({ bookingId, userId }) => {
  const id = Number(bookingId);

  if (!Number.isInteger(id) || id <= 0) {
    throw new Error("Invalid booking ID");
  }

  const booking = await bookingRepository.getBookingById(id);

  if (!booking) {
    throw new Error("Booking not found");
  }

  if (String(booking.sender_id) !== String(userId) && String(booking.driver_id) !== String(userId)) {
    throw new Error("You are not allowed to view this booking");
  }

  // OTPs are deliberately visible only to the sender in their authenticated app.
  if (String(booking.sender_id) !== String(userId)) {
    delete booking.pickup_otp;
    delete booking.delivery_otp;
  }

  return booking;
};

/**
 * Get bookings created by the current user (sender/shipper).
 */
const getUserBookings = async (userId) => {
  if (!userId) {
    throw new Error("Authenticated user is required");
  }

  return bookingRepository.getSenderBookings(userId);
};

/**
 * Get bookings received by the current user (driver/traveller).
 */
const getTravellerBookings = async (userId) => {
  if (!userId) {
    throw new Error("Authenticated user is required");
  }

  const bookings = await bookingRepository.getDriverBookings(userId);
  return bookings.map((booking) => {
    delete booking.pickup_otp;
    delete booking.delivery_otp;
    return booking;
  });
};

/**
 * Cancel booking (only by sender).
 */
const cancelBooking = async ({ bookingId, userId }) => {
  const booking = await bookingRepository.getBookingById(bookingId);

  if (!booking) {
    throw new Error("Booking not found");
  }

  if (String(booking.sender_id) !== String(userId)) {
    throw new Error("You are not allowed to cancel this booking");
  }

  if (
    ["DELIVERED", "PICKED_UP", "IN_TRANSIT"].includes(booking.booking_status)
  ) {
    throw new Error("This booking cannot be cancelled now");
  }

  await bookingRepository.updateBookingStatus(bookingId, "CANCELLED");

  return bookingRepository.getBookingById(bookingId);
};


/**
 * Upload pickup/delivery proof first, then generate the corresponding OTP.
 * Only the driver assigned to this booking may upload proof.
 */
const uploadStageProof = async ({ bookingId, userId, stage, file }) => {
  const id = Number(bookingId);
  if (!Number.isInteger(id) || id <= 0) throw new Error("Invalid booking ID");
  if (!userId) throw new Error("Authenticated user is required");
  if (!file?.buffer) throw new Error("A proof image is required");
  if (!["image/jpeg", "image/png", "image/webp"].includes(file.mimetype)) {
    throw new Error("Only JPG, PNG and WEBP images are allowed");
  }
  if (file.size > 10 * 1024 * 1024) throw new Error("Image must not exceed 10 MB");
  const normalizedStage = String(stage || "").toLowerCase();
  if (!["pickup", "delivery"].includes(normalizedStage)) throw new Error("Invalid proof stage");

  const booking = await bookingRepository.getBookingById(id);
  if (!booking) throw new Error("Booking not found");
  if (String(booking.driver_id) !== String(userId)) throw new Error("Only the assigned driver can upload proof");
  if (normalizedStage === "pickup" && booking.booking_status !== "CONFIRMED") {
    throw new Error("Pickup proof can only be uploaded for a confirmed booking");
  }
  if (normalizedStage === "delivery" && !["PICKED_UP", "IN_TRANSIT"].includes(booking.booking_status)) {
    throw new Error("Delivery proof can only be uploaded after pickup has been verified");
  }

  const processed = await sharp(file.buffer).rotate().resize({ width: 1800, height: 1800, fit: "inside", withoutEnlargement: true }).webp({ quality: 82 }).toBuffer();
  const documentType = normalizedStage === "pickup" ? "pickup-proof" : "delivery-proof";
  const key = await uploadToR2({ buffer: processed, rideId: String(id), documentType, namespace: "bookings" });
  const otp = generateOtp();
  const otpColumn = normalizedStage === "pickup" ? "pickup_otp" : "delivery_otp";
  const proofColumn = normalizedStage === "pickup" ? "pickup_proof_key" : "delivery_proof_key";
  const timestampColumn = normalizedStage === "pickup" ? "pickup_otp" : "delivery_otp";

  try {
    const allowedStatusSql = normalizedStage === "pickup"
      ? "booking_status = 'CONFIRMED'"
      : "booking_status IN ('PICKED_UP', 'IN_TRANSIT')";
    const [result] = await db.execute(
      `UPDATE bookings SET ${proofColumn} = ?, ${otpColumn} = ?, ${timestampColumn} = CURRENT_TIMESTAMP WHERE id = ? AND ${allowedStatusSql}`,
      [key, otp, id]
    );
    if (!result.affectedRows) {
      await deleteFromR2(key).catch(() => {});
      throw new Error("Booking status changed; proof was not attached and no OTP was generated");
    }
  } catch (error) {
    await deleteFromR2(key).catch(() => {});
    throw error;
  }

  // Never return the OTP from this driver-facing upload endpoint.
  return { booking_id: id, stage: normalizedStage, proof_uploaded: true, otp_generated: true, message: `Image uploaded. ${normalizedStage === "pickup" ? "Pickup" : "Delivery"} OTP is now available in the sender's authenticated booking details.` };
};

/** Driver submits the OTP that the sender sees in their authenticated app. */
const verifyStageOtp = async ({ bookingId, userId, stage, otp }) => {
  const id = Number(bookingId);
  if (!Number.isInteger(id) || id <= 0) throw new Error("Valid booking_id is required");
  if (!userId) throw new Error("Authenticated user is required");
  if (!/^\d{6}$/.test(String(otp || ""))) throw new Error("A valid 6-digit OTP is required");
  const normalizedStage = String(stage || "").toLowerCase();
  if (!["pickup", "delivery"].includes(normalizedStage)) throw new Error("Invalid verification stage");

  const booking = await bookingRepository.getBookingById(id);
  if (!booking) throw new Error("Booking not found");
  if (String(booking.driver_id) !== String(userId)) throw new Error("Only the assigned driver can verify this OTP");

  const expectedOtp = normalizedStage === "pickup" ? booking.pickup_otp : booking.delivery_otp;
  const proofKey = normalizedStage === "pickup" ? booking.pickup_proof_key : booking.delivery_proof_key;
  if (!proofKey || !expectedOtp) throw new Error("Upload the required image before generating or verifying the OTP");
  if (String(expectedOtp) !== String(otp)) throw new Error("Incorrect OTP");

  if (normalizedStage === "pickup") {
    if (booking.booking_status !== "CONFIRMED") throw new Error("Booking is not ready for pickup verification");
    const [updateResult] = await db.execute("UPDATE bookings SET booking_status = 'PICKED_UP', pickup_otp = NULL WHERE id = ? AND pickup_otp = ? AND pickup_proof_key IS NOT NULL AND booking_status = 'CONFIRMED'", [id, String(otp)]);
    if (!updateResult.affectedRows) throw new Error("Pickup OTP has already been used or booking state changed");
    return { booking_id: id, stage: "pickup", verified: true, booking_status: "PICKED_UP", can_start_ride: true };
  }

  if (!["PICKED_UP", "IN_TRANSIT"].includes(booking.booking_status)) throw new Error("Pickup must be verified before delivery verification");
  const [updateResult] = await db.execute("UPDATE bookings SET booking_status = 'DELIVERED', delivery_otp = NULL WHERE id = ? AND delivery_otp = ? AND delivery_proof_key IS NOT NULL AND booking_status IN ('PICKED_UP', 'IN_TRANSIT')", [id, String(otp)]);
  if (!updateResult.affectedRows) throw new Error("Delivery OTP has already been used or booking state changed");
  return { booking_id: id, stage: "delivery", verified: true, booking_status: "DELIVERED", delivery_complete: true };
};

module.exports = {
  createBooking,
  getBooking,
  getUserBookings,
  getTravellerBookings,
  cancelBooking,
  uploadStageProof,
  verifyStageOtp,
};
