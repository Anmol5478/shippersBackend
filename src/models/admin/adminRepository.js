const db = require("../../config/db");

const getDashboardStats = async () => {
  // Keep each query separate so schema-specific aggregate failures are easier
  // to identify and so the response contains counts, not private records.
  const [[users]] = await db.query(
    "SELECT COUNT(*) AS total FROM users"
  );
  const [[drivers]] = await db.query(
    "SELECT COUNT(*) AS total FROM users WHERE role = ?",
    [Number(process.env.DRIVER_ROLE || 1)]
  );
  const [[rides]] = await db.query(
    "SELECT COUNT(*) AS total FROM rides"
  );
  const [[activeRides]] = await db.query(
    "SELECT COUNT(*) AS total FROM rides WHERE status = 'active'"
  );
  const [[bookings]] = await db.query(
    "SELECT COUNT(*) AS total FROM bookings"
  );
  const [[pendingBookings]] = await db.query(
    "SELECT COUNT(*) AS total FROM bookings WHERE booking_status = 'PENDING'"
  );
  const [[pendingKyc]] = await db.query(
    "SELECT COUNT(*) AS total FROM user_kyc WHERE kyc_status = 'PENDING'"
  );

  return {
    users: Number(users.total || 0),
    drivers: Number(drivers.total || 0),
    rides: Number(rides.total || 0),
    activeRides: Number(activeRides.total || 0),
    bookings: Number(bookings.total || 0),
    pendingBookings: Number(pendingBookings.total || 0),
    pendingKyc: Number(pendingKyc.total || 0),
  };
};

const listUsers = async ({ limit, offset, search, role }) => {
  let where = " WHERE 1 = 1";
  const params = [];

  if (search) {
    where += " AND (full_name LIKE ? OR email LIKE ? OR phone LIKE ? OR user_id LIKE ?)";
    const term = `%${search}%`;
    params.push(term, term, term, term);
  }
  if (role !== null && role !== undefined && role !== "") {
    where += " AND role = ?";
    params.push(Number(role));
  }

  const [[countRow]] = await db.query(
    `SELECT COUNT(*) AS total FROM users${where}`,
    params
  );
  // Explicit columns: never return password hashes or other unneeded fields.
  const [rows] = await db.query(
    `SELECT id, user_id, full_name, email, phone, gender, role, created_at
     FROM users${where}
     ORDER BY id DESC LIMIT ? OFFSET ?`,
    [...params, limit, offset]
  );

  return { items: rows, total: Number(countRow.total || 0) };
};

const listRides = async ({ limit, offset, status }) => {
  let where = "";
  const params = [];
  if (status) {
    where = " WHERE r.status = ?";
    params.push(status);
  }

  const [[countRow]] = await db.query(
    `SELECT COUNT(*) AS total FROM rides r${where}`,
    params
  );
  const [rows] = await db.query(
    `SELECT r.id, r.user_id, u.full_name AS publisher_name,
            r.transport_type, r.transport_mode, r.pickup_city, r.drop_city,
            r.travel_date, r.departure_time, r.available_weight,
            r.price_per_kg, r.status, r.created_at
     FROM rides r
     LEFT JOIN users u ON u.user_id = r.user_id
     ${where}
     ORDER BY r.created_at DESC LIMIT ? OFFSET ?`,
    [...params, limit, offset]
  );

  return { items: rows, total: Number(countRow.total || 0) };
};

const listBookings = async ({ limit, offset, status }) => {
  let where = "";
  const params = [];
  if (status) {
    where = " WHERE b.booking_status = ?";
    params.push(status);
  }

  const [[countRow]] = await db.query(
    `SELECT COUNT(*) AS total FROM bookings b${where}`,
    params
  );
  // Deliberately exclude pickup_otp and delivery_otp from admin list responses.
  const [rows] = await db.query(
    `SELECT b.id, b.booking_reference, b.ride_id, b.sender_id, b.driver_id,
            b.package_weight_kg, b.package_category, b.package_count,
            b.sender_name, b.sender_phone, b.pickup_address, b.drop_address,
            b.total_amount, b.payment_method, b.payment_status,
            b.booking_status, b.created_at
     FROM bookings b
     ${where}
     ORDER BY b.created_at DESC LIMIT ? OFFSET ?`,
    [...params, limit, offset]
  );

  return { items: rows, total: Number(countRow.total || 0) };
};

const listKycApplications = async ({ limit, offset, status }) => {
  let where = "";
  const params = [];
  if (status) {
    where = " WHERE k.kyc_status = ?";
    params.push(status);
  }

  const [[countRow]] = await db.query(
    `SELECT COUNT(*) AS total FROM user_kyc k${where}`,
    params
  );
  // Do not expose document storage keys from the listing endpoint.
  const [rows] = await db.query(
    `SELECT k.id, k.user_id, u.full_name, u.email, u.phone,
            k.kyc_status, k.rejection_reason, k.approved_by,
            k.created_at, k.updated_at
     FROM user_kyc k
     LEFT JOIN users u ON u.user_id = k.user_id
     ${where}
     ORDER BY k.updated_at DESC LIMIT ? OFFSET ?`,
    [...params, limit, offset]
  );

  return { items: rows, total: Number(countRow.total || 0) };
};

module.exports = {
  getDashboardStats,
  listUsers,
  listRides,
  listBookings,
  listKycApplications,
};
