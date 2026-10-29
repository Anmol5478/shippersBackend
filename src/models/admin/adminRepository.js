const db = require("../../config/db");
const kycStorage = require("../kyc/kycStorage");
const rideProofStorage = require("../rides/rideProofStorage");

const getDashboardStats = async () => {
  const [[users]] = await db.query(`
    SELECT
      COUNT(*) AS total_users,
      SUM(CASE WHEN role = 1 THEN 1 ELSE 0 END) AS total_drivers,
      SUM(CASE WHEN role = 2 THEN 1 ELSE 0 END) AS total_customers,
      SUM(CASE WHEN role = 3 THEN 1 ELSE 0 END) AS total_admins,
      SUM(CASE WHEN COALESCE(is_blocked, 0) = 1 THEN 1 ELSE 0 END) AS blocked_users
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
      SUM(CASE WHEN status IN ('OPEN', 'ACTIVE', 'PUBLISHED', 'active') THEN 1 ELSE 0 END) AS active_rides
    FROM rides
  `);

  let pendingProofs = 0;
  try {
    const [[proofs]] = await db.query(`
      SELECT COUNT(*) AS pending_proofs
      FROM ride_travel_proof
      WHERE verification_status = 'PENDING'
    `);
    pendingProofs = Number(proofs.pending_proofs || 0);
  } catch {
    pendingProofs = 0;
  }

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
      blocked: Number(users.blocked_users || 0),
    },
    kyc: {
      pending: Number(kyc.pending_kyc || 0),
      verified: Number(kyc.verified_kyc || 0),
      rejected: Number(kyc.rejected_kyc || 0),
    },
    rides: {
      total: Number(rides.total_rides || 0),
      active: Number(rides.active_rides || 0),
      pending_proofs: pendingProofs,
    },
    bookings: {
      total: Number(bookings.total_bookings || 0),
      pending: Number(bookings.pending_bookings || 0),
      active: Number(bookings.active_bookings || 0),
      completed: Number(bookings.completed_bookings || 0),
    },
  };
};

const listUsers = async ({ role, search, page = 1, limit = 20, blocked } = {}) => {
  const offset = (Math.max(1, page) - 1) * limit;
  const conditions = [];
  const params = [];

  if (role !== undefined && role !== null && role !== "") {
    conditions.push("u.role = ?");
    params.push(Number(role));
  }

  if (blocked === true || blocked === 1 || blocked === "1" || blocked === "true") {
    conditions.push("COALESCE(u.is_blocked, 0) = 1");
  } else if (blocked === false || blocked === 0 || blocked === "0" || blocked === "false") {
    conditions.push("COALESCE(u.is_blocked, 0) = 0");
  }

  if (search && String(search).trim()) {
    const q = "%" + String(search).trim() + "%";
    conditions.push(
      "(u.full_name LIKE ? OR u.email LIKE ? OR u.phone LIKE ? OR u.user_id LIKE ?)"
    );
    params.push(q, q, q, q);
  }

  const where = conditions.length ? "WHERE " + conditions.join(" AND ") : "";

  const [countRows] = await db.query(
    "SELECT COUNT(*) AS total FROM users u " + where,
    params
  );

  const [rows] = await db.query(
    "SELECT u.id, u.user_id, u.fk_user_id, u.full_name, u.email, u.phone, u.gender, u.role, u.profile_image, COALESCE(u.is_blocked, 0) AS is_blocked, u.created_at, k.kyc_status FROM users u LEFT JOIN user_kyc k ON k.user_id = u.user_id " +
      where +
      " ORDER BY u.id DESC LIMIT ? OFFSET ?",
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
    "SELECT u.id, u.user_id, u.fk_user_id, u.full_name, u.email, u.phone, u.gender, u.role, u.profile_image, COALESCE(u.is_blocked, 0) AS is_blocked, u.created_at, k.kyc_status, k.aadhaar_front_document_key, k.aadhaar_back_document_key, k.pan_document_key, k.selfie_document_key, k.rejection_reason, k.approved_by, k.updated_at AS kyc_updated_at FROM users u LEFT JOIN user_kyc k ON k.user_id = u.user_id WHERE u.user_id = ? LIMIT 1",
    [userId]
  );
  return rows[0] || null;
};

const setUserBlocked = async (userId, blocked) => {
  const value = blocked ? 1 : 0;
  try {
    const [result] = await db.execute(
      "UPDATE users SET is_blocked = ? WHERE user_id = ?",
      [value, userId]
    );
    if (!result.affectedRows) throw new Error("User not found");
  } catch (err) {
    if (err.message && /is_blocked|Unknown column/i.test(err.message)) {
      throw new Error(
        "Database column users.is_blocked is missing. Run: ALTER TABLE users ADD COLUMN is_blocked TINYINT(1) NOT NULL DEFAULT 0;"
      );
    }
    throw err;
  }
  return getUserById(userId);
};

const listKyc = async ({ status, page = 1, limit = 20 } = {}) => {
  const offset = (Math.max(1, page) - 1) * limit;
  const conditions = [];
  const params = [];

  if (status && String(status).trim()) {
    conditions.push("k.kyc_status = ?");
    params.push(String(status).trim().toUpperCase());
  }

  const where = conditions.length ? "WHERE " + conditions.join(" AND ") : "";

  const [countRows] = await db.query(
    "SELECT COUNT(*) AS total FROM user_kyc k " + where,
    params
  );

  const [rows] = await db.query(
    "SELECT k.id, k.user_id, k.kyc_status, k.aadhaar_front_document_key, k.aadhaar_back_document_key, k.pan_document_key, k.selfie_document_key, k.rejection_reason, k.approved_by, k.created_at, k.updated_at, u.full_name, u.email, u.phone, u.role, u.profile_image FROM user_kyc k INNER JOIN users u ON u.user_id = k.user_id " +
      where +
      " ORDER BY CASE k.kyc_status WHEN 'PENDING' THEN 0 WHEN 'REJECTED' THEN 1 ELSE 2 END, k.updated_at DESC LIMIT ? OFFSET ?",
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
    "SELECT k.*, u.full_name, u.email, u.phone, u.role, u.profile_image FROM user_kyc k INNER JOIN users u ON u.user_id = k.user_id WHERE k.user_id = ? LIMIT 1",
    [userId]
  );
  return rows[0] || null;
};

const getKycWithUrls = async (userId) => {
  const kyc = await getKycByUserId(userId);
  if (!kyc) return null;

  const [aadhaar_front_url, aadhaar_back_url, pan_url, selfie_url] =
    await Promise.all([
      kycStorage.getDocumentUrl(kyc.aadhaar_front_document_key),
      kycStorage.getDocumentUrl(kyc.aadhaar_back_document_key),
      kycStorage.getDocumentUrl(kyc.pan_document_key),
      kycStorage.getDocumentUrl(kyc.selfie_document_key),
    ]);

  let profile_image_url = null;
  if (kyc.profile_image) {
    try {
      profile_image_url = await kycStorage.getDocumentUrl(kyc.profile_image);
    } catch {
      profile_image_url = kyc.profile_image;
    }
  }

  return {
    ...kyc,
    documents: {
      aadhaar_front: {
        key: kyc.aadhaar_front_document_key || null,
        url: aadhaar_front_url,
        label: "Aadhaar Front",
      },
      aadhaar_back: {
        key: kyc.aadhaar_back_document_key || null,
        url: aadhaar_back_url,
        label: "Aadhaar Back",
      },
      pan: {
        key: kyc.pan_document_key || null,
        url: pan_url,
        label: "PAN Card",
      },
      selfie: {
        key: kyc.selfie_document_key || null,
        url: selfie_url,
        label: "Selfie",
      },
      profile: {
        key: kyc.profile_image || null,
        url: profile_image_url,
        label: "Profile Photo",
      },
    },
  };
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
    "UPDATE user_kyc SET kyc_status = ?, rejection_reason = ?, approved_by = ? WHERE user_id = ?",
    [status, rejectionReason, approvedBy, userId]
  );

  return getKycWithUrls(userId);
};

const listRides = async ({ status, proof_status, page = 1, limit = 20 } = {}) => {
  const offset = (Math.max(1, page) - 1) * limit;
  const conditions = [];
  const params = [];

  if (status && String(status).trim()) {
    conditions.push("r.status = ?");
    params.push(String(status).trim());
  }

  if (proof_status && String(proof_status).trim()) {
    conditions.push("p.verification_status = ?");
    params.push(String(proof_status).trim().toUpperCase());
  }

  const where = conditions.length ? "WHERE " + conditions.join(" AND ") : "";

  const [countRows] = await db.query(
    "SELECT COUNT(*) AS total FROM rides r LEFT JOIN ride_travel_proof p ON p.ride_id = r.id " +
      where,
    params
  );

  const [rows] = await db.query(
    "SELECT r.id, r.user_id, r.transport_type, r.transport_mode, r.pickup_city, r.pickup_state, r.drop_city, r.drop_state, r.travel_date, r.departure_time, r.available_weight, r.price_per_kg, r.status, r.notes, r.created_at, u.full_name AS driver_name, u.phone AS driver_phone, u.email AS driver_email, p.pnr_number, p.vehicle_number, p.verification_status AS proof_status, p.rejection_reason AS proof_rejection_reason, p.ticket_document_key, p.vehicle_photo_key, p.dl_document_key, p.rc_document_key FROM rides r LEFT JOIN users u ON u.user_id = r.user_id LEFT JOIN ride_travel_proof p ON p.ride_id = r.id " +
      where +
      " ORDER BY CASE p.verification_status WHEN 'PENDING' THEN 0 WHEN 'REJECTED' THEN 1 ELSE 2 END, r.id DESC LIMIT ? OFFSET ?",
    [...params, Number(limit), Number(offset)]
  );

  return {
    total: Number(countRows[0]?.total || 0),
    page: Number(page),
    limit: Number(limit),
    rides: rows,
  };
};

const getRideDetail = async (rideId) => {
  const [rows] = await db.query(
    "SELECT r.*, u.full_name AS driver_name, u.phone AS driver_phone, u.email AS driver_email, u.profile_image AS driver_profile_image FROM rides r LEFT JOIN users u ON u.user_id = r.user_id WHERE r.id = ? LIMIT 1",
    [rideId]
  );

  if (!rows[0]) return null;

  const ride = rows[0];

  const [proofRows] = await db.query(
    "SELECT * FROM ride_travel_proof WHERE ride_id = ? LIMIT 1",
    [rideId]
  );
  const proof = proofRows[0] || null;

  let proofWithUrls = null;
  if (proof) {
    const [ticket_url, vehicle_photo_url, dl_url, rc_url] = await Promise.all([
      rideProofStorage.getDocumentUrl(proof.ticket_document_key),
      rideProofStorage.getDocumentUrl(proof.vehicle_photo_key),
      rideProofStorage.getDocumentUrl(proof.dl_document_key),
      rideProofStorage.getDocumentUrl(proof.rc_document_key),
    ]);

    proofWithUrls = {
      ...proof,
      documents: {
        ticket: {
          key: proof.ticket_document_key || null,
          url: ticket_url,
          label: "Travel Ticket",
        },
        vehicle_photo: {
          key: proof.vehicle_photo_key || null,
          url: vehicle_photo_url,
          label: "Vehicle Photo",
        },
        dl: {
          key: proof.dl_document_key || null,
          url: dl_url,
          label: "Driving Licence",
        },
        rc: {
          key: proof.rc_document_key || null,
          url: rc_url,
          label: "RC Document",
        },
      },
    };
  }

  const [bookingRows] = await db.query(
    "SELECT b.id, b.booking_reference, b.sender_id, b.package_weight_kg, b.package_category, b.total_amount, b.payment_status, b.booking_status, b.pickup_proof_key, b.delivery_proof_key, b.created_at FROM bookings b WHERE b.ride_id = ? ORDER BY b.id DESC",
    [rideId]
  );

  const bookings = await Promise.all(
    bookingRows.map(async (b) => {
      const [pickup_proof_url, delivery_proof_url] = await Promise.all([
        rideProofStorage.getDocumentUrl(b.pickup_proof_key),
        rideProofStorage.getDocumentUrl(b.delivery_proof_key),
      ]);
      return { ...b, pickup_proof_url, delivery_proof_url };
    })
  );

  return { ...ride, proof: proofWithUrls, bookings };
};

const updateRideProofStatus = async ({
  rideId,
  status,
  rejectionReason = null,
  adminUserId = null,
}) => {
  const allowed = ["PENDING", "VERIFIED", "REJECTED"];
  if (!allowed.includes(status)) {
    throw new Error("Invalid verification status");
  }

  const [existing] = await db.query(
    "SELECT id FROM ride_travel_proof WHERE ride_id = ? LIMIT 1",
    [rideId]
  );
  if (!existing[0]) throw new Error("Travel proof not found for this ride");

  await db.execute(
    "UPDATE ride_travel_proof SET verification_status = ?, rejection_reason = ?, verified_by = ? WHERE ride_id = ?",
    [status, rejectionReason, adminUserId, rideId]
  );

  if (status === "REJECTED") {
    await db.execute(
      "UPDATE rides SET status = 'rejected' WHERE id = ? AND status IN ('active', 'OPEN', 'ACTIVE', 'PUBLISHED')",
      [rideId]
    );
  }

  if (status === "VERIFIED") {
    await db.execute(
      "UPDATE rides SET status = 'active' WHERE id = ? AND status IN ('pending', 'PENDING')",
      [rideId]
    );
  }

  return getRideDetail(rideId);
};

const listBookings = async ({ status, page = 1, limit = 20 } = {}) => {
  const offset = (Math.max(1, page) - 1) * limit;
  const conditions = [];
  const params = [];

  if (status && String(status).trim()) {
    conditions.push("b.booking_status = ?");
    params.push(String(status).trim());
  }

  const where = conditions.length ? "WHERE " + conditions.join(" AND ") : "";

  const [countRows] = await db.query(
    "SELECT COUNT(*) AS total FROM bookings b " + where,
    params
  );

  const [rows] = await db.query(
    "SELECT b.id, b.booking_reference, b.ride_id, b.sender_id, b.driver_id, b.package_weight_kg, b.package_category, b.package_description, b.sender_name, b.sender_phone, b.pickup_address, b.drop_address, b.total_amount, b.payment_status, b.booking_status, b.pickup_proof_key, b.delivery_proof_key, b.created_at, r.pickup_city, r.drop_city, r.travel_date FROM bookings b LEFT JOIN rides r ON r.id = b.ride_id " +
      where +
      " ORDER BY b.id DESC LIMIT ? OFFSET ?",
    [...params, Number(limit), Number(offset)]
  );

  return {
    total: Number(countRows[0]?.total || 0),
    page: Number(page),
    limit: Number(limit),
    bookings: rows,
  };
};

const getBookingDetail = async (bookingId) => {
  const [rows] = await db.query(
    "SELECT b.*, r.pickup_city, r.drop_city, r.travel_date, r.departure_time, r.transport_type, r.user_id AS ride_owner_id FROM bookings b LEFT JOIN rides r ON r.id = b.ride_id WHERE b.id = ? LIMIT 1",
    [bookingId]
  );
  if (!rows[0]) return null;

  const b = rows[0];
  const [pickup_proof_url, delivery_proof_url] = await Promise.all([
    rideProofStorage.getDocumentUrl(b.pickup_proof_key),
    rideProofStorage.getDocumentUrl(b.delivery_proof_key),
  ]);

  return { ...b, pickup_proof_url, delivery_proof_url };
};


const setUserRole = async (userId, role) => {
  const r = Number(role);
  if (![1, 2, 3].includes(r)) {
    throw new Error("Invalid role. Use 1=Driver, 2=Customer, 3=Admin");
  }
  const [result] = await db.execute(
    "UPDATE users SET role = ? WHERE user_id = ?",
    [r, userId]
  );
  if (!result.affectedRows) throw new Error("User not found");
  return getUserById(userId);
};

module.exports = {
  getDashboardStats,
  listUsers,
  getUserById,
  setUserBlocked,
  setUserRole,
  listKyc,
  getKycByUserId,
  getKycWithUrls,
  updateKycStatus,
  listRides,
  getRideDetail,
  updateRideProofStatus,
  listBookings,
  getBookingDetail,
};

const listPasswordResets = async ({ search, status, page = 1, limit = 20 } = {}) => {
  const offset = (Math.max(1, page) - 1) * limit;
  const conditions = [];
  const params = [];

  if (search && String(search).trim()) {
    const q = "%" + String(search).trim() + "%";
    conditions.push("(o.email LIKE ? OR u.full_name LIKE ? OR u.user_id LIKE ?)");
    params.push(q, q, q);
  }

  if (status === "pending") {
    conditions.push("o.is_used = FALSE AND o.expires_at > NOW()");
  } else if (status === "used") {
    conditions.push("o.is_used = TRUE");
  } else if (status === "expired") {
    conditions.push("o.is_used = FALSE AND o.expires_at <= NOW()");
  }

  const where = conditions.length ? "WHERE " + conditions.join(" AND ") : "";

  const [countRows] = await db.query(
    `
    SELECT COUNT(*) AS total
    FROM otp o
    LEFT JOIN users u ON u.email = o.email
    ${where}
    `,
    params
  );
  const total = Number(countRows[0]?.total || 0);

  const [rows] = await db.query(
    `
    SELECT
      o.id,
      o.email,
      o.expires_at,
      o.is_used,
      o.created_at,
      u.user_id,
      u.full_name,
      u.phone,
      u.role,
      CASE
        WHEN o.is_used = TRUE THEN 'used'
        WHEN o.expires_at <= NOW() THEN 'expired'
        ELSE 'pending'
      END AS status
    FROM otp o
    LEFT JOIN users u ON u.email = o.email
    ${where}
    ORDER BY o.created_at DESC
    LIMIT ? OFFSET ?
    `,
    [...params, limit, offset]
  );

  return { resets: rows, total, page, limit };
};

module.exports.listPasswordResets = listPasswordResets;
