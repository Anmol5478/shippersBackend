const db = require("../../config/db");

/* ================================
   DASHBOARD STATS
================================ */

const getDashboardStats = async () => {
  const [[users]] = await db.query(`
    SELECT
      COUNT(*) AS total_users,
      SUM(CASE WHEN role = 1 THEN 1 ELSE 0 END) AS total_drivers,
      SUM(CASE WHEN role = 2 THEN 1 ELSE 0 END) AS total_customers,
      SUM(CASE WHEN role = 3 THEN 1 ELSE 0 END) AS total_admins
    FROM users
  `);

  const [[kyc]] = await db.query(`
    SELECT
      SUM(CASE WHEN kyc_status = 'PENDING' THEN 1 ELSE 0 END) AS pending_kyc,
      SUM(CASE WHEN kyc_status = 'VERIFIED' THEN 1 ELSE 0 END) AS verified_kyc,
      SUM(CASE WHEN kyc_status = 'REJECTED' THEN 1 ELSE 0 END) AS rejected_kyc
    FROM user_kyc
  `);

  const [[rides]] = await db.query(`
    SELECT
      COUNT(*) AS total_rides,
      SUM(CASE WHEN status IN ('OPEN', 'ACTIVE', 'PUBLISHED') THEN 1 ELSE 0 END) AS active_rides
    FROM rides
  `);

  const [[bookings]] = await db.query(`
    SELECT
      COUNT(*) AS total_bookings,
      SUM(CASE WHEN booking_status = 'PENDING' THEN 1 ELSE 0 END) AS pending_bookings,
      SUM(CASE WHEN booking_status IN ('CONFIRMED', 'PICKUP_PENDING', 'PICKED_UP', 'IN_TRANSIT') THEN 1 ELSE 0 END) AS active_bookings,
      SUM(CASE WHEN booking_status = 'DELIVERED' THEN 1 ELSE 0 END) AS completed_bookings
    FROM bookings
  `);

  return {
    users: {
      total: Number(users.total_users || 0),
      drivers: Number(users.total_drivers || 0),
      customers: Number(users.total_customers || 0),
      admins: Number(users.total_admins || 0),
    },
    kyc: {
      pending: Number(kyc.pending_kyc || 0),
      verified: Number(kyc.verified_kyc || 0),
      rejected: Number(kyc.rejected_kyc || 0),
    },
    rides: {
      total: Number(rides.total_rides || 0),
      active: Number(rides.active_rides || 0),
    },
    bookings: {
      total: Number(bookings.total_bookings || 0),
      pending: Number(bookings.pending_bookings || 0),
      active: Number(bookings.active_bookings || 0),
      completed: Number(bookings.completed_bookings || 0),
    },
  };
};

/* ================================
   USERS
================================ */

const listUsers = async ({ role, search, page = 1, limit = 20 } = {}) => {
  const offset = (Math.max(1, page) - 1) * limit;
  const conditions = [];
  const params = [];

  if (role !== undefined && role !== null && role !== "") {
    conditions.push("u.role = ?");
    params.push(Number(role));
  }

  if (search && String(search).trim()) {
    const q = `%${String(search).trim()}%`;
    conditions.push(
      "(u.full_name LIKE ? OR u.email LIKE ? OR u.phone LIKE ? OR u.user_id LIKE ?)"
    );
    params.push(q, q, q, q);
  }

  const where = conditions.length ? `WHERE ${conditions.join(" AND ")}` : "";

  const [countRows] = await db.query(
    `SELECT COUNT(*) AS total FROM users u ${where}`,
    params
  );

  const [rows] = await db.query(
    `
      SELECT
        u.id,
        u.user_id,
        u.fk_user_id,
        u.full_name,
        u.email,
        u.phone,
        u.gender,
        u.role,
        u.profile_image,
        u.created_at,
        k.kyc_status
      FROM users u
      LEFT JOIN user_kyc k ON k.user_id = u.user_id
      ${where}
      ORDER BY u.id DESC
      LIMIT ? OFFSET ?
    `,
    [...params, Number(limit), Number(offset)]
  );

  return {
    total: Number(countRows[0]?.total || 0),
    page: Number(page),
    limit: Number(limit),
    users: rows,
  };
};

const getUserById = async (userId) => {
  const [rows] = await db.query(
    `
      SELECT
        u.id,
        u.user_id,
        u.fk_user_id,
        u.full_name,
        u.email,
        u.phone,
        u.gender,
        u.role,
        u.profile_image,
        u.created_at,
        k.kyc_status,
        k.aadhaar_front_document_key,
        k.aadhaar_back_document_key,
        k.pan_document_key,
        k.selfie_document_key,
        k.rejection_reason,
        k.approved_by,
        k.updated_at AS kyc_updated_at
      FROM users u
      LEFT JOIN user_kyc k ON k.user_id = u.user_id
      WHERE u.user_id = ?
      LIMIT 1
    `,
    [userId]
  );

  return rows[0] || null;
};

/* ================================
   KYC
================================ */

const listKyc = async ({ status, page = 1, limit = 20 } = {}) => {
  const offset = (Math.max(1, page) - 1) * limit;
  const conditions = [];
  const params = [];

  if (status && String(status).trim()) {
    conditions.push("k.kyc_status = ?");
    params.push(String(status).trim().toUpperCase());
  }

  const where = conditions.length ? `WHERE ${conditions.join(" AND ")}` : "";

  const [countRows] = await db.query(
    `SELECT COUNT(*) AS total FROM user_kyc k ${where}`,
    params
  );

  const [rows] = await db.query(
    `
      SELECT
        k.id,
        k.user_id,
        k.kyc_status,
        k.aadhaar_front_document_key,
        k.aadhaar_back_document_key,
        k.pan_document_key,
        k.selfie_document_key,
        k.rejection_reason,
        k.approved_by,
        k.created_at,
        k.updated_at,
        u.full_name,
        u.email,
        u.phone,
        u.role
      FROM user_kyc k
      INNER JOIN users u ON u.user_id = k.user_id
      ${where}
      ORDER BY
        CASE k.kyc_status
          WHEN 'PENDING' THEN 0
          WHEN 'REJECTED' THEN 1
          ELSE 2
        END,
        k.updated_at DESC
      LIMIT ? OFFSET ?
    `,
    [...params, Number(limit), Number(offset)]
  );

  return {
    total: Number(countRows[0]?.total || 0),
    page: Number(page),
    limit: Number(limit),
    items: rows,
  };
};

const getKycByUserId = async (userId) => {
  const [rows] = await db.query(
    `
      SELECT
        k.*,
        u.full_name,
        u.email,
        u.phone,
        u.role
      FROM user_kyc k
      INNER JOIN users u ON u.user_id = k.user_id
      WHERE k.user_id = ?
      LIMIT 1
    `,
    [userId]
  );

  return rows[0] || null;
};

const updateKycStatus = async ({
  userId,
  status,
  rejectionReason = null,
  approvedBy = null,
}) => {
  const allowed = ["PENDING", "VERIFIED", "REJECTED"];
  if (!allowed.includes(status)) {
    throw new Error("Invalid KYC status");
  }

  await db.execute(
    `
      UPDATE user_kyc
      SET
        kyc_status = ?,
        rejection_reason = ?,
        approved_by = ?
      WHERE user_id = ?
    `,
    [status, rejectionReason, approvedBy, userId]
  );

  return getKycByUserId(userId);
};

/* ================================
   RIDES
================================ */

const listRides = async ({ status, page = 1, limit = 20 } = {}) => {
  const offset = (Math.max(1, page) - 1) * limit;
  const conditions = [];
  const params = [];

  if (status && String(status).trim()) {
    conditions.push("r.status = ?");
    params.push(String(status).trim());
  }

  const where = conditions.length ? `WHERE ${conditions.join(" AND ")}` : "";

  const [countRows] = await db.query(
    `SELECT COUNT(*) AS total FROM rides r ${where}`,
    params
  );

  const [rows] = await db.query(
    `
      SELECT
        r.id,
        r.user_id,
        r.transport_type,
        r.transport_mode,
        r.pickup_city,
        r.pickup_state,
        r.drop_city,
        r.drop_state,
        r.travel_date,
        r.departure_time,
        r.available_weight,
        r.price_per_kg,
        r.status,
        r.created_at,
        u.full_name AS driver_name,
        u.phone AS driver_phone
      FROM rides r
      LEFT JOIN users u ON u.user_id = r.user_id
      ${where}
      ORDER BY r.id DESC
      LIMIT ? OFFSET ?
    `,
    [...params, Number(limit), Number(offset)]
  );

  return {
    total: Number(countRows[0]?.total || 0),
    page: Number(page),
    limit: Number(limit),
    rides: rows,
  };
};

/* ================================
   BOOKINGS
================================ */

const listBookings = async ({ status, page = 1, limit = 20 } = {}) => {
  const offset = (Math.max(1, page) - 1) * limit;
  const conditions = [];
  const params = [];

  if (status && String(status).trim()) {
    conditions.push("b.booking_status = ?");
    params.push(String(status).trim());
  }

  const where = conditions.length ? `WHERE ${conditions.join(" AND ")}` : "";

  const [countRows] = await db.query(
    `SELECT COUNT(*) AS total FROM bookings b ${where}`,
    params
  );

  const [rows] = await db.query(
    `
      SELECT
        b.id,
        b.booking_reference,
        b.ride_id,
        b.sender_id,
        b.driver_id,
        b.package_weight_kg,
        b.package_category,
        b.package_description,
        b.sender_name,
        b.sender_phone,
        b.pickup_address,
        b.drop_address,
        b.total_amount,
        b.payment_status,
        b.booking_status,
        b.created_at,
        r.pickup_city,
        r.drop_city,
        r.travel_date
      FROM bookings b
      LEFT JOIN rides r ON r.id = b.ride_id
      ${where}
      ORDER BY b.id DESC
      LIMIT ? OFFSET ?
    `,
    [...params, Number(limit), Number(offset)]
  );

  return {
    total: Number(countRows[0]?.total || 0),
    page: Number(page),
    limit: Number(limit),
    bookings: rows,
  };
};

module.exports = {
  getDashboardStats,
  listUsers,
  getUserById,
  listKyc,
  getKycByUserId,
  updateKycStatus,
  listRides,
  listBookings,
};
