const db = require("../../config/db");

/**
 * Get ride and lock it during booking.
 */
const getRideForBooking = async (connection, rideId) => {
  const [rows] = await connection.execute(
    `
      SELECT
        id,
        user_id,
        transport_type,
        transport_mode,
        service_type,
        available_seats,
        price_per_seat,
        pickup_city,
        pickup_state,
        drop_city,
        drop_state,
        travel_date,
        departure_time,
        available_weight,
        status,
        price_per_kg
      FROM rides
      WHERE id = ?
      LIMIT 1
      FOR UPDATE
    `,
    [rideId]
  );

  return rows[0] || null;
};

/**
 * Calculate weight already booked for the ride.
 */
const getReservedWeight = async (connection, rideId) => {
  const [rows] = await connection.execute(
    `
      SELECT
        COALESCE(SUM(package_weight_kg), 0) AS reserved_weight
      FROM bookings
      WHERE ride_id = ?
        AND booking_status IN (
          'PENDING',
          'CONFIRMED',
          'PICKUP_PENDING',
          'PICKED_UP',
          'IN_TRANSIT'
        )
    `,
    [rideId]
  );

  return Number(rows[0]?.reserved_weight || 0);
};

/**
 * Create booking.
 */
const createBooking = async (connection, booking) => {
  // Prefer extended payable columns (same model as passenger_bookings).
  // Falls back if migration has not been applied yet.
  const classicParams = [
    booking.booking_reference,
    booking.ride_id,
    booking.pickup_stop_id,
    booking.drop_stop_id,
    booking.sender_id,
    booking.driver_id,
    booking.package_weight_kg,
    booking.package_category,
    booking.package_description,
    booking.package_count,
    booking.sender_name,
    booking.sender_phone,
    booking.pickup_address,
    booking.drop_address,
    booking.notes,
    booking.price_per_kg,
    booking.total_amount,
    booking.payment_method,
    booking.payment_collection_point,
    booking.shipment_type || "PERSONAL",
    booking.enterprise_profile_id ?? null,
    booking.business_details_snapshot ?? null,
    booking.purchase_bill_status || "NOT_REQUIRED",
    booking.pickup_otp,
    booking.delivery_otp,
  ];

  try {
    const [result] = await connection.execute(
      `
        INSERT INTO bookings (
          booking_reference,
          ride_id,
          pickup_stop_id,
          drop_stop_id,
          sender_id,
          driver_id,
          package_weight_kg,
          package_category,
          package_description,
          package_count,
          sender_name,
          sender_phone,
          pickup_address,
          drop_address,
          notes,
          price_per_kg,
          total_amount,
          customer_pay,
          commission_percentage,
          commission_amount,
          platform_fee,
          taxes,
          total_payable,
          payment_method,
          payment_collection_point,
          shipment_type,
          enterprise_profile_id,
          business_details_snapshot,
          purchase_bill_status,
          payment_status,
          booking_status,
          pickup_otp,
          delivery_otp
        )
        VALUES (
          ?, ?, ?, ?, ?, ?, ?,
          ?, ?, ?, ?, ?,
          ?, ?, ?, ?, ?,
          ?, ?, ?, ?, ?, ?,
          ?, ?, ?, ?, ?, ?,
          'PENDING',
          'PENDING',
          ?, ?
        )
      `,
      [
        booking.booking_reference,
        booking.ride_id,
        booking.pickup_stop_id,
        booking.drop_stop_id,
        booking.sender_id,
        booking.driver_id,
        booking.package_weight_kg,
        booking.package_category,
        booking.package_description,
        booking.package_count,
        booking.sender_name,
        booking.sender_phone,
        booking.pickup_address,
        booking.drop_address,
        booking.notes,
        booking.price_per_kg,
        booking.total_amount,
        booking.customer_pay ?? booking.total_amount,
        booking.commission_percentage ?? null,
        booking.commission_amount ?? null,
        booking.platform_fee ?? null,
        booking.taxes ?? null,
        booking.total_payable ?? booking.total_amount,
        booking.payment_method,
        booking.payment_collection_point,
        booking.shipment_type || "PERSONAL",
        booking.enterprise_profile_id ?? null,
        booking.business_details_snapshot ?? null,
        booking.purchase_bill_status || "NOT_REQUIRED",
        booking.pickup_otp,
        booking.delivery_otp,
      ]
    );
    return result.insertId;
  } catch (err) {
    if (err && (err.code === "ER_BAD_FIELD_ERROR" || /Unknown column/i.test(String(err.message)))) {
      const [result] = await connection.execute(
        `
          INSERT INTO bookings (
            booking_reference,
            ride_id,
            pickup_stop_id,
            drop_stop_id,
            sender_id,
            driver_id,
            package_weight_kg,
            package_category,
            package_description,
            package_count,
            sender_name,
            sender_phone,
            pickup_address,
            drop_address,
            notes,
            price_per_kg,
            total_amount,
            payment_method,
            payment_collection_point,
            shipment_type,
            enterprise_profile_id,
            business_details_snapshot,
            purchase_bill_status,
            payment_status,
            booking_status,
            pickup_otp,
            delivery_otp
          )
          VALUES (
            ?, ?, ?, ?, ?, ?, ?,
            ?, ?, ?, ?, ?,
            ?, ?, ?, ?, ?,
            ?, ?, ?, ?, ?, ?,
            'PENDING',
            'PENDING',
            ?, ?
          )
        `,
        classicParams
      );
      return result.insertId;
    }
    throw err;
  }
};

/**
 * Get booking by ID (with ride details).
 */
const getBookingById = async (bookingId) => {
  const [rows] = await db.execute(
    `
      SELECT
        b.*,
        r.user_id AS driver_id_from_ride,
        r.transport_type,
        r.transport_mode,
        r.pickup_city,
        r.pickup_state,
        r.drop_city,
        r.drop_state,
        r.travel_date,
        r.departure_time,
        r.available_weight,
        r.price_per_kg AS ride_price_per_kg,
        r.route_distance_km,
        r.route_duration_minutes,
        r.route_polyline,
        ps.city AS selected_pickup_city,
        ps.state AS selected_pickup_state,
        ds.city AS selected_drop_city,
        ds.state AS selected_drop_state
      FROM bookings b
      INNER JOIN rides r ON b.ride_id = r.id
      LEFT JOIN ride_stops ps ON ps.id = b.pickup_stop_id
      LEFT JOIN ride_stops ds ON ds.id = b.drop_stop_id
      WHERE b.id = ?
      LIMIT 1
    `,
    [bookingId]
  );

  return rows[0] || null;
};

/**
 * Get bookings created by sender (shipper).
 */
const getSenderBookings = async (senderId) => {
  const [rows] = await db.execute(
    `
      SELECT
        b.*,
        r.transport_type,
        r.transport_mode,
        r.pickup_city,
        r.pickup_state,
        r.drop_city,
        r.drop_state,
        r.travel_date,
        r.departure_time,
        r.available_weight,
        r.route_distance_km,
        r.route_duration_minutes,
        r.route_polyline,
        ps.city AS selected_pickup_city,
        ps.state AS selected_pickup_state,
        ds.city AS selected_drop_city,
        ds.state AS selected_drop_state
      FROM bookings b
      INNER JOIN rides r ON b.ride_id = r.id
      LEFT JOIN ride_stops ps ON ps.id = b.pickup_stop_id
      LEFT JOIN ride_stops ds ON ds.id = b.drop_stop_id
      WHERE b.sender_id = ?
      ORDER BY b.created_at DESC
    `,
    [senderId]
  );

  return rows;
};

/**
 * Get bookings received by driver (traveller).
 */
const getDriverBookings = async (driverId) => {
  const [rows] = await db.execute(
    `
      SELECT
        b.*,
        r.transport_type,
        r.transport_mode,
        r.pickup_city,
        r.pickup_state,
        r.drop_city,
        r.drop_state,
        r.travel_date,
        r.departure_time,
        r.available_weight,
        r.route_distance_km,
        r.route_duration_minutes,
        r.route_polyline,
        ps.city AS selected_pickup_city,
        ps.state AS selected_pickup_state,
        ds.city AS selected_drop_city,
        ds.state AS selected_drop_state
      FROM bookings b
      INNER JOIN rides r ON b.ride_id = r.id
      LEFT JOIN ride_stops ps ON ps.id = b.pickup_stop_id
      LEFT JOIN ride_stops ds ON ds.id = b.drop_stop_id
      WHERE b.driver_id = ?
      ORDER BY b.created_at DESC
    `,
    [driverId]
  );

  return rows;
};

/**
 * Update booking status.
 */
const updateBookingStatus = async (bookingId, status) => {
  const [result] = await db.execute(
    `
      UPDATE bookings
      SET booking_status = ?
      WHERE id = ?
    `,
    [status, bookingId]
  );

  return result.affectedRows > 0;
};


const getRideStops = async (connection, rideId) => {
  const [rows] = await connection.execute(
    `SELECT id, ride_id, stop_order, stop_type, city, state
     FROM ride_stops WHERE ride_id = ? ORDER BY stop_order ASC`,
    [rideId]
  );
  return rows;
};

const getSegmentsForStopRange = async (connection, rideId, pickupStopId, dropStopId) => {
  const [rows] = await connection.execute(
    `SELECT
       seg.id, seg.segment_order, seg.capacity_weight_kg, seg.reserved_weight_kg,
       seg.capacity_seats, seg.reserved_seats,
       fs.id AS from_stop_id, fs.stop_order AS from_order,
       ts.id AS to_stop_id, ts.stop_order AS to_order
     FROM ride_segments seg
     INNER JOIN ride_stops fs ON fs.id = seg.from_stop_id
     INNER JOIN ride_stops ts ON ts.id = seg.to_stop_id
     WHERE seg.ride_id = ?
       AND fs.stop_order >= (
         SELECT stop_order FROM ride_stops WHERE id = ? AND ride_id = ?
       )
       AND ts.stop_order <= (
         SELECT stop_order FROM ride_stops WHERE id = ? AND ride_id = ?
       )
     ORDER BY seg.segment_order
     FOR UPDATE`,
    [rideId, pickupStopId, rideId, dropStopId, rideId]
  );
  return rows;
};

const reserveParcelSegments = async (connection, segments, weight) => {
  for (const segment of segments) {
    const [result] = await connection.execute(
      `UPDATE ride_segments
       SET reserved_weight_kg = reserved_weight_kg + ?
       WHERE id = ? AND reserved_weight_kg + ? <= capacity_weight_kg`,
      [weight, segment.id, weight]
    );
    if (!result.affectedRows) {
      throw new Error("Parcel capacity is no longer available on one or more selected route segments");
    }
  }
};

const releaseParcelAllocation = async (connection, bookingId) => {
  const [allocations] = await connection.execute(
    `SELECT segment_id, reserved_weight_kg
     FROM parcel_booking_segments WHERE booking_id = ? FOR UPDATE`,
    [bookingId]
  );
  for (const allocation of allocations) {
    await connection.execute(
      `UPDATE ride_segments
       SET reserved_weight_kg = GREATEST(0, reserved_weight_kg - ?)
       WHERE id = ?`,
      [allocation.reserved_weight_kg, allocation.segment_id]
    );
  }
  await connection.execute(`DELETE FROM parcel_booking_segments WHERE booking_id = ?`, [bookingId]);
};

const insertParcelAllocations = async (connection, bookingId, segments, weight) => {
  for (const segment of segments) {
    await connection.execute(
      `INSERT INTO parcel_booking_segments (booking_id, segment_id, reserved_weight_kg)
       VALUES (?, ?, ?)`,
      [bookingId, segment.id, weight]
    );
  }
};

const assertBusinessPurchaseBill = async (connection, booking) => {
  if (String(booking.shipment_type || "PERSONAL").toUpperCase() !== "BUSINESS") {
    return;
  }

  if (String(booking.purchase_bill_status || "").toUpperCase() !== "UPLOADED") {
    throw new Error("A business booking requires an uploaded purchase bill before confirmation");
  }

  const [billRows] = await connection.execute(
    `
      SELECT id, uploaded_by, status
      FROM enterprise_bills
      WHERE booking_id = ?
        AND status IN ('UPLOADED', 'UNDER_REVIEW', 'APPROVED')
      ORDER BY uploaded_at DESC
      LIMIT 1
      FOR UPDATE
    `,
    [booking.id]
  );

  const activeBill = billRows[0];
  if (!activeBill) {
    throw new Error("No active purchase bill exists for this business booking");
  }

  if (String(activeBill.uploaded_by) !== String(booking.sender_id)) {
    throw new Error("The active purchase bill does not belong to this booking sender");
  }
};

/**
 * Update payment status.
 */
const updatePaymentStatus = async (bookingId, paymentStatus) => {
  const [result] = await db.execute(
    `
      UPDATE bookings
      SET payment_status = ?
      WHERE id = ?
    `,
    [paymentStatus, bookingId]
  );

  return result.affectedRows > 0;
};

module.exports = {
  getRideForBooking,
  getReservedWeight,
  getRideStops,
  getSegmentsForStopRange,
  reserveParcelSegments,
  releaseParcelAllocation,
  insertParcelAllocations,
  createBooking,
  getBookingById,
  getSenderBookings,
  getDriverBookings,
  updateBookingStatus,
  assertBusinessPurchaseBill,
  updatePaymentStatus,
};
