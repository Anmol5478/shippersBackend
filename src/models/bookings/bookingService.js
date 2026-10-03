const crypto = require("crypto");

const db = require("../../config/db");
const bookingRepository = require("./bookingRepository");

const ACTIVE_BOOKING_STATUSES = [
  "PENDING",
  "CONFIRMED",
  "PICKUP_PENDING",
  "PICKED_UP",
  "IN_TRANSIT",
];

const PAYMENT_METHODS = [
  "CASH",
  "UPI",
  "ONLINE",
];

const PAYMENT_POINTS = [
  "PICKUP",
  "DROP",
];

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
 *
 * Example:
 * RZBK-A81F92C1
 */
const generateBookingReference = () => {
  return (
    "RZBK-" +
    crypto
      .randomBytes(4)
      .toString("hex")
      .toUpperCase()
  );
};


/**
 * Generate OTP.
 */
const generateOtp = () => {
  return String(
    Math.floor(
      100000 +
      Math.random() * 900000
    )
  );
};


/**
 * Validate phone.
 */
const validatePhone = (phone) => {
  const value = String(phone || "").trim();

  if (!/^[0-9]{10,15}$/.test(value)) {
    throw new Error(
      "Enter a valid phone number"
    );
  }

  return value;
};


/**
 * Create booking.
 */
const createBooking = async ({
  userId,
  body,
}) => {
  if (!userId) {
    throw new Error(
      "Authenticated user is required"
    );
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

  if (
    !Number.isInteger(rideId) ||
    rideId <= 0
  ) {
    throw new Error(
      "Valid ride ID is required"
    );
  }


  const packageWeight =
    Number(package_weight_kg);

  if (
    !Number.isFinite(packageWeight) ||
    packageWeight <= 0
  ) {
    throw new Error(
      "Package weight must be greater than 0 KG"
    );
  }


  if (packageWeight > 1000) {
    throw new Error(
      "Package weight cannot exceed 1000 KG"
    );
  }


  const packageCount =
    Number(package_count ?? 1);

  if (
    !Number.isInteger(packageCount) ||
    packageCount <= 0
  ) {
    throw new Error(
      "Package count must be at least 1"
    );
  }


  const senderName =
    String(sender_name || "").trim();

  if (!senderName) {
    throw new Error(
      "Sender name is required"
    );
  }

  if (senderName.length > 150) {
    throw new Error(
      "Sender name cannot exceed 150 characters"
    );
  }


  const senderPhone =
    validatePhone(sender_phone);


  const description =
    package_description
      ? String(package_description).trim()
      : null;

  if (
    description &&
    description.length > 500
  ) {
    throw new Error(
      "Package description cannot exceed 500 characters"
    );
  }


  const category =
    package_category
      ? String(package_category)
          .trim()
          .toUpperCase()
      : null;

  if (
    category &&
    !PACKAGE_CATEGORIES.includes(category)
  ) {
    throw new Error(
      "Invalid package category"
    );
  }


  const finalPaymentMethod =
    String(
      payment_method || "CASH"
    )
      .trim()
      .toUpperCase();

  if (
    !PAYMENT_METHODS.includes(
      finalPaymentMethod
    )
  ) {
    throw new Error(
      "Invalid payment method"
    );
  }


  const finalPaymentPoint =
    String(
      payment_collection_point || "PICKUP"
    )
      .trim()
      .toUpperCase();

  if (
    !PAYMENT_POINTS.includes(
      finalPaymentPoint
    )
  ) {
    throw new Error(
      "Payment collection point must be PICKUP or DROP"
    );
  }


  if (
    notes &&
    String(notes).length > 500
  ) {
    throw new Error(
      "Notes cannot exceed 500 characters"
    );
  }


  // ==========================================
  // TRANSACTION
  // ==========================================

  const connection =
    await db.getConnection();

  try {
    await connection.beginTransaction();


    // ========================================
    // LOCK RIDE
    // ========================================

    const ride =
      await bookingRepository
        .getRideForBooking(
          connection,
          rideId
        );


    if (!ride) {
      throw new Error(
        "Ride not found"
      );
    }


    // ========================================
    // CANNOT BOOK OWN RIDE
    // ========================================

    if (
      String(ride.user_id) ===
      String(userId)
    ) {
      throw new Error(
        "You cannot book your own ride"
      );
    }


    // ========================================
    // RIDE STATUS
    // ========================================

    if (ride.status !== "active") {
      throw new Error(
        "This ride is no longer available"
      );
    }


    // ========================================
    // RESERVED WEIGHT
    // ========================================

    const reservedWeight =
      await bookingRepository
        .getReservedWeight(
          connection,
          rideId
        );


    const rideCapacity =
      Number(
        ride.available_weight
      );


    const remainingWeight =
      Math.max(
        0,
        rideCapacity -
          reservedWeight
      );


    // ========================================
    // IMPORTANT WEIGHT CHECK
    // ========================================

    if (
      packageWeight >
      remainingWeight
    ) {
      throw new Error(
        `Only ${remainingWeight.toFixed(
          2
        )} KG is available on this ride`
      );
    }


    // ========================================
    // PRICE FROM DATABASE
    // ========================================

    const pricePerKg =
      Number(
        ride.price_per_kg
      );


    if (
      !Number.isFinite(
        pricePerKg
      ) ||
      pricePerKg < 0
    ) {
      throw new Error(
        "Invalid ride price"
      );
    }


    const estimatedAmount =
      Number(
        (
          packageWeight *
          pricePerKg
        ).toFixed(2)
      );


    // ========================================
    // CREATE BOOKING
    // ========================================

    const bookingReference =
      generateBookingReference();

    const pickupOtp =
      generateOtp();

    const deliveryOtp =
      generateOtp();


    const bookingId =
      await bookingRepository.createBooking(
        connection,
        {
          booking_reference:
            bookingReference,

          ride_id: rideId,

          shipper_user_id:
            String(userId),

          package_weight_kg:
            packageWeight,

          package_category:
            category,

          package_description:
            description,

          package_count:
            packageCount,

          sender_name:
            senderName,

          sender_phone:
            senderPhone,

          pickup_address:
            pickup_address
              ? String(
                  pickup_address
                ).trim()
              : null,

          drop_address:
            drop_address
              ? String(
                  drop_address
                ).trim()
              : null,

          notes:
            notes
              ? String(notes).trim()
              : null,

          estimated_amount:
            estimatedAmount,

          payment_method:
            finalPaymentMethod,

          payment_collection_point:
            finalPaymentPoint,

          pickup_otp:
            pickupOtp,

          delivery_otp:
            deliveryOtp,
        }
      );


    await connection.commit();


    // ========================================
    // GET COMPLETE BOOKING
    // ========================================

    const booking =
      await bookingRepository
        .getBookingById(
          bookingId
        );


    return {
      booking,
      capacity: {
        ride_capacity_kg:
          rideCapacity,

        reserved_before_booking_kg:
          reservedWeight,

        booked_weight_kg:
          packageWeight,

        remaining_weight_kg:
          Number(
            (
              remainingWeight -
              packageWeight
            ).toFixed(2)
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
 * Get booking.
 */
const getBooking = async ({
  bookingId,
}) => {
  const id =
    Number(bookingId);

  if (
    !Number.isInteger(id) ||
    id <= 0
  ) {
    throw new Error(
      "Invalid booking ID"
    );
  }

  const booking =
    await bookingRepository
      .getBookingById(id);

  if (!booking) {
    throw new Error(
      "Booking not found"
    );
  }

  return booking;
};


/**
 * User's bookings.
 */
const getUserBookings = async (
  userId
) => {
  if (!userId) {
    throw new Error(
      "Authenticated user is required"
    );
  }

  return bookingRepository
    .getUserBookings(userId);
};


/**
 * Traveller's received bookings.
 */
const getTravellerBookings = async (
  userId
) => {
  if (!userId) {
    throw new Error(
      "Authenticated user is required"
    );
  }

  return bookingRepository
    .getTravellerBookings(userId);
};


/**
 * Cancel booking.
 */
const cancelBooking = async ({
  bookingId,
  userId,
}) => {
  const booking =
    await bookingRepository
      .getBookingById(
        bookingId
      );

  if (!booking) {
    throw new Error(
      "Booking not found"
    );
  }


  if (
    String(
      booking.shipper_user_id
    ) !== String(userId)
  ) {
    throw new Error(
      "You are not allowed to cancel this booking"
    );
  }


  if (
    [
      "DELIVERED",
      "PICKED_UP",
      "IN_TRANSIT",
    ].includes(
      booking.booking_status
    )
  ) {
    throw new Error(
      "This booking cannot be cancelled now"
    );
  }


  await bookingRepository
    .updateBookingStatus(
      bookingId,
      "CANCELLED"
    );


  return bookingRepository
    .getBookingById(
      bookingId
    );
};


/**
 * Traveller accepts/rejects booking.
 */
const updateBookingStatus = async ({
  bookingId,
  userId,
  status,
}) => {
  const allowedStatuses = [
    "CONFIRMED",
    "REJECTED",
  ];

  const finalStatus =
    String(status || "")
      .trim()
      .toUpperCase();

  if (
    !allowedStatuses.includes(
      finalStatus
    )
  ) {
    throw new Error(
      "Invalid booking status"
    );
  }


  const booking =
    await bookingRepository
      .getBookingById(
        bookingId
      );

  if (!booking) {
    throw new Error(
      "Booking not found"
    );
  }


  if (
    String(
      booking.traveller_user_id
    ) !== String(userId)
  ) {
    throw new Error(
      "Only the traveller can update this booking"
    );
  }


  if (
    booking.booking_status !==
    "PENDING"
  ) {
    throw new Error(
      "Only pending bookings can be accepted or rejected"
    );
  }


  await bookingRepository
    .updateBookingStatus(
      bookingId,
      finalStatus
    );


  return bookingRepository
    .getBookingById(
      bookingId
    );
};


module.exports = {
  createBooking,
  getBooking,
  getUserBookings,
  getTravellerBookings,
  cancelBooking,
  updateBookingStatus,
};