const crypto = require("crypto");
const db = require("../../config/db");
const repository = require("./passengerBookingRepository");
const { computePassengerBookingBreakdown } = require("../pricing/pricingService");
const { assertUserNotBlocked } = require("../../utils/userStatus");

const reference = () => `RZPS-${crypto.randomBytes(4).toString("hex").toUpperCase()}`;
const phone = (value) => {
  const normalized = String(value || "").trim();
  if (!/^[0-9]{10,15}$/.test(normalized)) throw new Error("Enter a valid passenger phone number");
  return normalized;
};

const createPassengerBooking = async ({ userId, body }) => {
  if (!userId) throw new Error("Authenticated user is required");
  await assertUserNotBlocked(userId);

  const rideId = Number(body.ride_id);
  const pickupStopId = Number(body.pickup_stop_id);
  const dropStopId = Number(body.drop_stop_id);
  const seatCount = Number(body.seat_count || 1);
  const passengerName = String(body.passenger_name || "").trim();
  const passengerPhone = phone(body.passenger_phone);
  const paymentMethod = String(body.payment_method || "CASH").toUpperCase();
  const notes = body.notes ? String(body.notes).trim() : null;

  if (!Number.isInteger(rideId) || rideId <= 0) throw new Error("Valid ride_id is required");
  if (!Number.isInteger(pickupStopId) || pickupStopId <= 0 ||
      !Number.isInteger(dropStopId) || dropStopId <= 0) {
    throw new Error("Valid pickup_stop_id and drop_stop_id are required");
  }
  if (!Number.isInteger(seatCount) || seatCount < 1 || seatCount > 8) {
    throw new Error("Seat count must be between 1 and 8");
  }
  if (!passengerName || passengerName.length > 150) throw new Error("Passenger name is required (max 150 characters)");
  if (!["CASH", "UPI", "ONLINE"].includes(paymentMethod)) throw new Error("Invalid payment method");

  const connection = await db.getConnection();
  let bookingId;
  try {
    await connection.beginTransaction();
    const ride = await repository.getRideForUpdate(connection, rideId);
    if (!ride) throw new Error("Ride not found");
    if (String(ride.user_id) === String(userId)) throw new Error("You cannot book your own ride");
    if (ride.status !== "active") throw new Error("This ride is no longer available");
    if (!["PASSENGER", "BOTH"].includes(ride.service_type)) throw new Error("This ride does not accept passenger bookings");

    const stops = await repository.getStops(connection, rideId);
    const pickup = stops.find((s) => Number(s.id) === pickupStopId);
    const drop = stops.find((s) => Number(s.id) === dropStopId);
    if (!pickup || !drop) throw new Error("Selected pickup or drop stop does not belong to this ride");
    if (pickup.stop_order >= drop.stop_order) throw new Error("Pickup stop must come before drop stop");

    const segments = await repository.getSegments(connection, rideId, pickupStopId, dropStopId);
    if (!segments.length || segments.length !== drop.stop_order - pickup.stop_order) {
      throw new Error("Selected route segments are not available");
    }
    const insufficient = segments.find((s) => Number(s.capacity_seats) - Number(s.reserved_seats) < seatCount);
    if (insufficient) {
      const remaining = Math.max(0, Math.min(...segments.map((s) => Number(s.capacity_seats) - Number(s.reserved_seats))));
      throw new Error(`Requested seats are not available across the complete route. Maximum available: ${remaining}`);
    }

    const farePerSeat = Number(ride.price_per_seat);
    if (!Number.isFinite(farePerSeat) || farePerSeat < 0) throw new Error("Invalid ride seat price");
    const breakdown = computePassengerBookingBreakdown({
      price_per_seat: farePerSeat,
      seats: seatCount,
    });
    // total_fare kept as total_payable so existing UIs stay consistent
    const totalFare = breakdown.total_payable;
    bookingId = await repository.create(connection, {
      booking_reference: reference(), ride_id: rideId, passenger_id: String(userId),
      driver_id: String(ride.user_id), pickup_stop_id: pickupStopId, drop_stop_id: dropStopId,
      seat_count: seatCount, passenger_name: passengerName, passenger_phone: passengerPhone,
      fare_per_seat: farePerSeat, total_fare: totalFare,
      customer_pay: breakdown.customer_pay,
      commission_percentage: breakdown.commission_percentage,
      commission_amount: breakdown.commission_amount,
      platform_fee: breakdown.platform_fee,
      taxes: breakdown.taxes,
      total_payable: breakdown.total_payable,
      advance_percent: breakdown.advance_percent ?? 20,
      advance_amount: breakdown.advance_amount ?? null,
      payment_method: paymentMethod, notes,
    });
    await repository.reserve(connection, bookingId, segments, seatCount);
    await connection.commit();
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }

  return repository.getById(bookingId);
};

const getPassengerBookings = async (userId) => {
  if (!userId) throw new Error("Authenticated user is required");
  return repository.listByPassenger(userId);
};

const getDriverPassengerBookings = async (userId) => {
  if (!userId) throw new Error("Authenticated user is required");
  return repository.listByDriver(userId);
};

const cancelPassengerBooking = async ({ bookingId, userId }) => {
  const id = Number(bookingId);
  if (!Number.isInteger(id) || id <= 0) throw new Error("Invalid passenger booking ID");
  const connection = await db.getConnection();
  try {
    await connection.beginTransaction();
    const [rows] = await connection.execute(
      `SELECT id, passenger_id, booking_status FROM passenger_bookings WHERE id = ? FOR UPDATE`,
      [id]
    );
    const booking = rows[0];
    if (!booking) throw new Error("Passenger booking not found");
    if (String(booking.passenger_id) !== String(userId)) throw new Error("You are not allowed to cancel this booking");
    if (!["PENDING", "CONFIRMED"].includes(booking.booking_status)) throw new Error("This passenger booking can no longer be cancelled");
    await repository.release(connection, id);
    const [updated] = await connection.execute(
      `UPDATE passenger_bookings SET booking_status = 'CANCELLED' WHERE id = ? AND booking_status IN ('PENDING','CONFIRMED')`,
      [id]
    );
    if (!updated.affectedRows) throw new Error("Booking status changed; cancellation failed");
    await connection.commit();
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
  return repository.getById(id);
};

const updatePassengerBookingStatus = async ({ bookingId, userId, status }) => {
  const id = Number(bookingId);
  const normalized = String(status || "").toUpperCase();
  if (!Number.isInteger(id) || id <= 0) throw new Error("Invalid passenger booking ID");
  if (!["CONFIRMED", "REJECTED"].includes(normalized)) throw new Error("Status must be CONFIRMED or REJECTED");

  const connection = await db.getConnection();
  try {
    await connection.beginTransaction();
    const [rows] = await connection.execute(
      `SELECT pb.id, pb.booking_status, pb.ride_id, r.user_id AS ride_owner_id
       FROM passenger_bookings pb JOIN rides r ON r.id = pb.ride_id
       WHERE pb.id = ? FOR UPDATE`,
      [id]
    );
    const booking = rows[0];
    if (!booking) throw new Error("Passenger booking not found");
    if (String(booking.ride_owner_id) !== String(userId)) throw new Error("Only the ride owner can update this booking");
    if (booking.booking_status !== "PENDING") throw new Error("Only pending passenger bookings can be updated");
    // Confirm requires 20% advance to be paid first
    if (normalized === "CONFIRMED") {
      const [payRows] = await connection.execute(
        `SELECT payment_status, advance_amount, total_payable FROM passenger_bookings WHERE id = ?`,
        [id]
      );
      const pay = payRows[0];
      const ps = String(pay?.payment_status || "PENDING").toUpperCase();
      if (ps !== "ADVANCE_PAID" && ps !== "PAID" && ps !== "FULL") {
        throw new Error("Passenger must pay the 20% advance before this booking can be confirmed. Current payment status: " + ps);
      }
    }
    if (normalized === "REJECTED") await repository.release(connection, id);
    const [updated] = await connection.execute(
      `UPDATE passenger_bookings SET booking_status = ? WHERE id = ? AND booking_status = 'PENDING'`,
      [normalized, id]
    );
    if (!updated.affectedRows) throw new Error("Passenger booking status changed; update failed");
    await connection.commit();
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
  return repository.getById(id);
};


/**
 * Passenger pays mandatory advance (default 20% of total_payable).
 * Until this is paid, booking stays PENDING and driver cannot confirm.
 * Supports WALLET debit when payment_method is WALLET/ONLINE; otherwise marks advance paid (UPI/CASH offline collection).
 */
const payPassengerBookingAdvance = async ({ bookingId, userId, body = {} }) => {
  const id = Number(bookingId);
  if (!Number.isInteger(id) || id <= 0) throw new Error("Invalid passenger booking ID");
  const paymentMethod = String(body.payment_method || "WALLET").toUpperCase();
  if (!["WALLET", "UPI", "ONLINE", "CASH"].includes(paymentMethod)) {
    throw new Error("Invalid payment method for advance");
  }

  const connection = await db.getConnection();
  try {
    await connection.beginTransaction();
    const [rows] = await connection.execute(
      `SELECT id, passenger_id, booking_status, payment_status, total_payable, total_fare, advance_amount, advance_percent
       FROM passenger_bookings WHERE id = ? FOR UPDATE`,
      [id]
    );
    const booking = rows[0];
    if (!booking) throw new Error("Passenger booking not found");
    if (String(booking.passenger_id) !== String(userId)) {
      throw new Error("You are not allowed to pay for this booking");
    }
    if (booking.booking_status !== "PENDING") {
      throw new Error("Advance can only be paid while the booking is pending");
    }
    const ps = String(booking.payment_status || "PENDING").toUpperCase();
    if (ps === "ADVANCE_PAID" || ps === "PAID" || ps === "FULL") {
      throw new Error("Advance has already been paid for this booking");
    }

    const total = Number(booking.total_payable ?? booking.total_fare ?? 0);
    let advanceAmount = Number(booking.advance_amount);
    if (!Number.isFinite(advanceAmount) || advanceAmount <= 0) {
      const pct = Number(booking.advance_percent ?? 20);
      advanceAmount = Math.round((total * pct) / 100);
    }
    if (!Number.isFinite(advanceAmount) || advanceAmount <= 0) {
      throw new Error("Invalid advance amount");
    }

    // Wallet debit path
    if (paymentMethod === "WALLET" || paymentMethod === "ONLINE") {
      const [wallets] = await connection.execute(
        `SELECT id, balance FROM wallets WHERE user_id = ? FOR UPDATE`,
        [String(userId)]
      );
      let wallet = wallets[0];
      if (!wallet) {
        const [ins] = await connection.execute(
          `INSERT INTO wallets (user_id, balance) VALUES (?, 0)`,
          [String(userId)]
        );
        wallet = { id: ins.insertId, balance: 0 };
      }
      const balance = Number(wallet.balance);
      if (balance < advanceAmount) {
        throw new Error(`Insufficient wallet balance. Advance due: ₹${advanceAmount}, available: ₹${balance}`);
      }
      const newBalance = Math.round((balance - advanceAmount) * 100) / 100;
      await connection.execute(`UPDATE wallets SET balance = ? WHERE id = ?`, [newBalance, wallet.id]);
      try {
        await connection.execute(
          `INSERT INTO wallet_transactions
            (user_id, type, amount, balance_after, reference_id, description, status)
           VALUES (?, 'DEBIT', ?, ?, ?, ?, 'COMPLETED')`,
          [
            String(userId),
            advanceAmount,
            newBalance,
            `PB-${id}`,
            `Advance payment (20%) for passenger booking #${id}`,
          ]
        );
      } catch (txErr) {
        // wallet_transactions schema may differ; continue if debit succeeded
        if (!/Unknown column|ER_BAD_FIELD/i.test(String(txErr.message))) throw txErr;
      }
    }

    const ok = await repository.markAdvancePaid(connection, id, paymentMethod);
    if (!ok) throw new Error("Could not update payment status; please try again");

    // Ensure advance_amount is persisted if column was null
    await connection.execute(
      `UPDATE passenger_bookings SET advance_amount = COALESCE(advance_amount, ?), advance_percent = COALESCE(advance_percent, 20) WHERE id = ?`,
      [advanceAmount, id]
    );

    await connection.commit();
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }

  const updated = await repository.getById(id);
  return {
    ...updated,
    message: "Advance paid successfully. Booking remains pending until the driver confirms.",
  };
};

module.exports = {
  createPassengerBooking, getPassengerBookings, getDriverPassengerBookings,
  cancelPassengerBooking, updatePassengerBookingStatus, payPassengerBookingAdvance,
};
