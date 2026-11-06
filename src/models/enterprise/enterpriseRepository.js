const db = require("../../config/db");
const PROFILE_UPDATE_COLUMNS = new Set([
  "company_name",
  "billing_email",
  "gstin",
  "pan_number",
  "contact_person",
  "contact_phone",
  "billing_address",
  "billing_city",
  "billing_state",
  "billing_pincode",
]);

const getProfileByUserId = async (userId) => {
  const [rows] = await db.execute(
    `
      SELECT
        id,
        user_id,
        company_name,
        billing_email,
        gstin,
        pan_number,
        contact_person,
        contact_phone,
        billing_address,
        billing_city,
        billing_state,
        billing_pincode,
        gst_verified,
        profile_status,
        created_at,
        updated_at
      FROM enterprise_profiles
      WHERE user_id = ?
      LIMIT 1
    `,
    [userId]
  );

  return rows[0] || null;
};

const getProfileById = async (profileId) => {
  const [rows] = await db.execute(
    `
      SELECT
        id,
        user_id,
        company_name,
        billing_email,
        gstin,
        pan_number,
        contact_person,
        contact_phone,
        billing_address,
        billing_city,
        billing_state,
        billing_pincode,
        gst_verified,
        profile_status,
        created_at,
        updated_at
      FROM enterprise_profiles
      WHERE id = ?
      LIMIT 1
    `,
    [profileId]
  );

  return rows[0] || null;
};

const createProfile = async (profile) => {
  const [result] = await db.execute(
    `
      INSERT INTO enterprise_profiles (
        user_id,
        company_name,
        billing_email,
        gstin,
        pan_number,
        contact_person,
        contact_phone,
        billing_address,
        billing_city,
        billing_state,
        billing_pincode,
        gst_verified,
        profile_status
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `,
    [
      profile.user_id,
      profile.company_name,
      profile.billing_email,
      profile.gstin || null,
      profile.pan_number || null,
      profile.contact_person || null,
      profile.contact_phone || null,
      profile.billing_address || null,
      profile.billing_city || null,
      profile.billing_state || null,
      profile.billing_pincode || null,
      0,
      profile.profile_status || "PENDING",
    ]
  );

  return {
    id: result.insertId,
    ...profile,
    gst_verified: 0,
    profile_status: profile.profile_status || "PENDING",
  };
};

const updateProfile = async (userId, updates) => {
  const validEntries = Object.entries(updates)
    .filter(([key, value]) => PROFILE_UPDATE_COLUMNS.has(key) && value !== undefined);

  if (!validEntries.length) {
    return false;
  }

  const setClause = validEntries.map(([key]) => `${key} = ?`).join(", ");
  const values = validEntries.map(([, value]) => value);

  const [result] = await db.execute(
    `UPDATE enterprise_profiles SET ${setClause} WHERE user_id = ?`,
    [...values, userId]
  );

  return result.affectedRows > 0;
};

const getBookingForBusinessUpload = async (bookingId) => {
  const [rows] = await db.execute(
    `
      SELECT
        id,
        sender_id,
        booking_status,
        shipment_type,
        enterprise_profile_id,
        purchase_bill_status,
        business_details_snapshot,
        created_at
      FROM bookings
      WHERE id = ?
      LIMIT 1
    `,
    [bookingId]
  );

  return rows[0] || null;
};

const getBookingForUpdate = async (connection, bookingId) => {
  const [rows] = await connection.execute(
    `
      SELECT
        id,
        sender_id,
        booking_status,
        shipment_type,
        enterprise_profile_id,
        purchase_bill_status,
        business_details_snapshot
      FROM bookings
      WHERE id = ?
      LIMIT 1
      FOR UPDATE
    `,
    [bookingId]
  );

  return rows[0] || null;
};

const updateBookingPurchaseBillStatus = async (bookingId, status) => {
  const [result] = await db.execute(
    `UPDATE bookings SET purchase_bill_status = ? WHERE id = ?`,
    [status, bookingId]
  );

  return result.affectedRows > 0;
};

const updateBookingEnterpriseProfile = async (bookingId, profileId) => {
  const [result] = await db.execute(
    `UPDATE bookings SET enterprise_profile_id = ? WHERE id = ?`,
    [profileId, bookingId]
  );

  return result.affectedRows > 0;
};

const createPurchaseBill = async (billData) => {
  const [result] = await db.execute(
    `
      INSERT INTO enterprise_bills (
        enterprise_profile_id,
        booking_id,
        uploaded_by,
        document_type,
        original_filename,
        storage_key,
        mime_type,
        file_size,
        checksum,
        status,
        rejection_reason,
        verified_at,
        verified_by
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `,
    [
      billData.enterprise_profile_id || null,
      billData.booking_id,
      billData.uploaded_by,
      billData.document_type || "PURCHASE_BILL",
      billData.original_filename || null,
      billData.storage_key,
      billData.mime_type,
      billData.file_size,
      billData.checksum,
      billData.status || "UPLOADED",
      billData.rejection_reason || null,
      billData.verified_at || null,
      billData.verified_by || null,
    ]
  );

  return result.insertId;
};

const getActivePurchaseBill = async (bookingId) => {
  const [rows] = await db.execute(
    `
      SELECT
        id,
        enterprise_profile_id,
        booking_id,
        uploaded_by,
        document_type,
        original_filename,
        storage_key,
        mime_type,
        file_size,
        checksum,
        status,
        rejection_reason,
        uploaded_at,
        verified_at,
        verified_by
      FROM enterprise_bills
      WHERE booking_id = ?
        AND status IN ('UPLOADED', 'UNDER_REVIEW', 'APPROVED')
      ORDER BY uploaded_at DESC
      LIMIT 1
    `,
    [bookingId]
  );

  return rows[0] || null;
};

const getPurchaseBillsByBookingId = async (bookingId) => {
  const [rows] = await db.execute(
    `
      SELECT
        id,
        enterprise_profile_id,
        booking_id,
        uploaded_by,
        document_type,
        original_filename,
        mime_type,
        file_size,
        checksum,
        status,
        rejection_reason,
        uploaded_at,
        verified_at,
        verified_by
      FROM enterprise_bills
      WHERE booking_id = ?
      ORDER BY uploaded_at DESC
    `,
    [bookingId]
  );

  return rows;
};

const getPurchaseBillById = async (billId) => {
  const [rows] = await db.execute(
    `
      SELECT
        eb.*,
        b.sender_id,
        b.shipment_type,
        b.booking_status,
        b.enterprise_profile_id AS booking_enterprise_profile_id
      FROM enterprise_bills eb
      INNER JOIN bookings b ON b.id = eb.booking_id
      WHERE eb.id = ?
      LIMIT 1
    `,
    [billId]
  );

  return rows[0] || null;
};

const replacePreviousPurchaseBill = async (bookingId, excludeBillId) => {
  const [result] = await db.execute(
    `UPDATE enterprise_bills SET status = 'REPLACED' WHERE booking_id = ? AND status IN ('UPLOADED', 'UNDER_REVIEW', 'APPROVED') AND id != ?`,
    [bookingId, excludeBillId]
  );

  return result.affectedRows > 0;
};

module.exports = {
  getProfileByUserId,
  getProfileById,
  createProfile,
  updateProfile,
  getBookingForBusinessUpload,
  getBookingForUpdate,
  updateBookingPurchaseBillStatus,
  updateBookingEnterpriseProfile,
  createPurchaseBill,
  getActivePurchaseBill,
  getPurchaseBillsByBookingId,
  getPurchaseBillById,
  replacePreviousPurchaseBill,
};
