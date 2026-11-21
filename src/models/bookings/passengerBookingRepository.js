const db = require("../../config/db");

const getRideForUpdate = async (connection, rideId) => {
  const [rows] = await connection.execute(
    `SELECT id, user_id, service_type, status, available_seats, price_per_seat
     FROM rides WHERE id = ? FOR UPDATE`,
    [rideId]
  );
  return rows[0] || null;
};

const getStops = async (connection, rideId) => {
  const [rows] = await connection.execute(
    `SELECT id, stop_order, stop_type, city, state
     FROM ride_stops WHERE ride_id = ? ORDER BY stop_order`,
    [rideId]
  );
  return rows;
};

const getSegments = async (connection, rideId, pickupStopId, dropStopId) => {
  const [rows] = await connection.execute(
    `SELECT seg.id, seg.capacity_seats, seg.reserved_seats,
            fs.stop_order AS from_order, ts.stop_order AS to_order
     FROM ride_segments seg
     JOIN ride_stops fs ON fs.id = seg.from_stop_id
     JOIN ride_stops ts ON ts.id = seg.to_stop_id
     WHERE seg.ride_id = ?
       AND fs.stop_order >= (SELECT stop_order FROM ride_stops WHERE id = ? AND ride_id = ?)
       AND ts.stop_order <= (SELECT stop_order FROM ride_stops WHERE id = ? AND ride_id = ?)
     ORDER BY seg.segment_order
     FOR UPDATE`,
    [rideId, pickupStopId, rideId, dropStopId, rideId]
  );
  return rows;
};

const create = async (connection, data) => {
  // Prefer extended columns when present (customer_pay, platform_fee, taxes, total_payable).
  // Falls back to classic fare_per_seat / total_fare only schema.
  try {
    const [result] = await connection.execute(
      `INSERT INTO passenger_bookings
        (booking_reference, ride_id, passenger_id, driver_id, pickup_stop_id, drop_stop_id,
         seat_count, passenger_name, passenger_phone, fare_per_seat, total_fare,
         customer_pay, commission_percentage, commission_amount, platform_fee, taxes, total_payable,
         payment_method, payment_status, booking_status, notes)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'PENDING', 'PENDING', ?)`,
      [
        data.booking_reference, data.ride_id, data.passenger_id, data.driver_id,
        data.pickup_stop_id, data.drop_stop_id, data.seat_count, data.passenger_name,
        data.passenger_phone, data.fare_per_seat, data.total_fare,
        data.customer_pay ?? data.total_fare, data.commission_percentage ?? null,
        data.commission_amount ?? null, data.platform_fee ?? null,
        data.taxes ?? null, data.total_payable ?? data.total_fare,
        data.payment_method, data.notes,
      ]
    );
    return result.insertId;
  } catch (err) {
    // Schema without fee columns — store classic totals only
    if (err && (err.code === "ER_BAD_FIELD_ERROR" || /Unknown column/i.test(String(err.message)))) {
      const [result] = await connection.execute(
        `INSERT INTO passenger_bookings
          (booking_reference, ride_id, passenger_id, driver_id, pickup_stop_id, drop_stop_id,
           seat_count, passenger_name, passenger_phone, fare_per_seat, total_fare,
           payment_method, payment_status, booking_status, notes)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'PENDING', 'PENDING', ?)`,
        [
          data.booking_reference, data.ride_id, data.passenger_id, data.driver_id,
          data.pickup_stop_id, data.drop_stop_id, data.seat_count, data.passenger_name,
          data.passenger_phone, data.fare_per_seat, data.total_payable ?? data.total_fare,
          data.payment_method, data.notes,
        ]
      );
      return result.insertId;
    }
    throw err;
  }
};

const reserve = async (connection, bookingId, segments, seats) => {
  for (const segment of segments) {
    const [updated] = await connection.execute(
      `UPDATE ride_segments SET reserved_seats = reserved_seats + ?
       WHERE id = ? AND reserved_seats + ? <= capacity_seats`,
      [seats, segment.id, seats]
    );
    if (!updated.affectedRows) throw new Error("Seat availability changed. Please search again.");
    await connection.execute(
      `INSERT INTO passenger_booking_segments
       (passenger_booking_id, segment_id, reserved_seats) VALUES (?, ?, ?)`,
      [bookingId, segment.id, seats]
    );
  }
};

const release = async (connection, bookingId) => {
  const [rows] = await connection.execute(
    `SELECT segment_id, reserved_seats FROM passenger_booking_segments
     WHERE passenger_booking_id = ? FOR UPDATE`,
    [bookingId]
  );
  for (const row of rows) {
    await connection.execute(
      `UPDATE ride_segments SET reserved_seats = GREATEST(0, reserved_seats - ?)
       WHERE id = ?`,
      [row.reserved_seats, row.segment_id]
    );
  }
  await connection.execute(
    `DELETE FROM passenger_booking_segments WHERE passenger_booking_id = ?`,
    [bookingId]
  );
};

const getById = async (id) => {
  const [rows] = await db.execute(
    `SELECT pb.*, r.travel_date, r.departure_time, r.transport_type, r.transport_mode,
            ps.city AS pickup_city, ps.state AS pickup_state,
            ds.city AS drop_city, ds.state AS drop_state,
            u.full_name AS driver_name
     FROM passenger_bookings pb
     JOIN rides r ON r.id = pb.ride_id
     JOIN ride_stops ps ON ps.id = pb.pickup_stop_id
     JOIN ride_stops ds ON ds.id = pb.drop_stop_id
     JOIN users u ON u.user_id = pb.driver_id
     WHERE pb.id = ? LIMIT 1`,
    [id]
  );
  return rows[0] || null;
};

const listByPassenger = async (userId) => {
  const [rows] = await db.execute(
    `SELECT pb.*, r.travel_date, r.departure_time,
            ps.city AS pickup_city, ds.city AS drop_city
     FROM passenger_bookings pb
     JOIN rides r ON r.id = pb.ride_id
     JOIN ride_stops ps ON ps.id = pb.pickup_stop_id
     JOIN ride_stops ds ON ds.id = pb.drop_stop_id
     WHERE pb.passenger_id = ? ORDER BY pb.created_at DESC`,
    [userId]
  );
  return rows;
};

const listByDriver = async (userId) => {
  const [rows] = await db.execute(
    `SELECT pb.*, r.travel_date, r.departure_time,
            ps.city AS pickup_city, ds.city AS drop_city
     FROM passenger_bookings pb
     JOIN rides r ON r.id = pb.ride_id
     JOIN ride_stops ps ON ps.id = pb.pickup_stop_id
     JOIN ride_stops ds ON ds.id = pb.drop_stop_id
     WHERE pb.driver_id = ? ORDER BY pb.created_at DESC`,
    [userId]
  );
  return rows;
};

module.exports = {
  getRideForUpdate, getStops, getSegments, create, reserve, release,
  getById, listByPassenger, listByDriver,
};
