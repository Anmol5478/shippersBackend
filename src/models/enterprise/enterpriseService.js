const crypto = require("crypto");
const db = require("../../config/db");
const enterpriseRepository = require("./enterpriseRepository");
const {
  uploadEnterpriseDocument,
  deleteEnterpriseDocument,
  getEnterpriseDocumentSignedUrl,
} = require("./enterpriseDocumentStorage");

const decodeJsonField = (value) => {
  if (value === null || value === undefined) return null;
  if (typeof value === "string") {
    try {
      return JSON.parse(value);
    } catch (error) {
      return value;
    }
  }
  return value;
};

const isValidEmail = (email) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(email || ""));
const isValidPhone = (phone) => /^[0-9]{10,15}$/.test(String(phone || ""));
const isValidGSTIN = (value) => !value || /^[0-9A-Z]{15}$/.test(String(value).trim().toUpperCase());
const isValidPAN = (value) => !value || /^[A-Z]{5}[0-9]{4}[A-Z]$/.test(String(value).trim().toUpperCase());

const normalizeBusinessSnapshot = (payload) => {
  if (!payload || typeof payload !== "object") {
    return null;
  }

  const normalized = {
    company_name: payload.company_name || payload.companyName || null,
    billing_email: payload.billing_email || payload.billingEmail || null,
    gstin: payload.gstin || null,
    pan_number: payload.pan_number || payload.panNumber || null,
    contact_person: payload.contact_person || payload.contactPerson || null,
    contact_phone: payload.contact_phone || payload.contactPhone || null,
    billing_address: payload.billing_address || payload.billingAddress || null,
    billing_city: payload.billing_city || payload.billingCity || null,
    billing_state: payload.billing_state || payload.billingState || null,
    billing_pincode: payload.billing_pincode || payload.billingPincode || null,
  };

  return normalized;
};

const validateProfilePayload = (payload) => {
  const companyName = String(payload.company_name || payload.companyName || "").trim();
  const billingEmail = String(payload.billing_email || payload.billingEmail || "").trim();
  const gstin = payload.gstin ? String(payload.gstin).trim().toUpperCase() : null;
  const panNumber = payload.pan_number ? String(payload.pan_number).trim().toUpperCase() : null;
  const contactPhone = payload.contact_phone ? String(payload.contact_phone).trim() : null;

  if (!companyName) {
    throw new Error("Company name is required");
  }

  if (!billingEmail || !isValidEmail(billingEmail)) {
    throw new Error("A valid billing email is required");
  }

  if (gstin && !isValidGSTIN(gstin)) {
    throw new Error("GSTIN must be 15 alphanumeric characters");
  }

  if (panNumber && !isValidPAN(panNumber)) {
    throw new Error("PAN number format is invalid");
  }

  if (contactPhone && !isValidPhone(contactPhone)) {
    throw new Error("Contact phone format is invalid");
  }
};

const getProfile = async (userId) => {
  if (!userId) {
    throw new Error("Authenticated user is required");
  }

  const profile = await enterpriseRepository.getProfileByUserId(userId);

  if (!profile) {
    return {
      exists: false,
      profile: null,
    };
  }

  return {
    exists: true,
    profile,
  };
};

const createProfile = async ({ userId, body = {} }) => {
  if (!userId) {
    throw new Error("Authenticated user is required");
  }

  const existing = await enterpriseRepository.getProfileByUserId(userId);
  if (existing) {
    throw new Error("A business profile already exists for this user");
  }

  validateProfilePayload(body);

  const profile = {
    user_id: userId,
    company_name: String(body.company_name || body.companyName || "").trim(),
    billing_email: String(body.billing_email || body.billingEmail || "").trim(),
    gstin: body.gstin ? String(body.gstin).trim().toUpperCase() : null,
    pan_number: body.pan_number ? String(body.pan_number).trim().toUpperCase() : null,
    contact_person: body.contact_person ? String(body.contact_person).trim() : null,
    contact_phone: body.contact_phone ? String(body.contact_phone).trim() : null,
    billing_address: body.billing_address ? String(body.billing_address).trim() : null,
    billing_city: body.billing_city ? String(body.billing_city).trim() : null,
    billing_state: body.billing_state ? String(body.billing_state).trim() : null,
    billing_pincode: body.billing_pincode ? String(body.billing_pincode).trim() : null,
    gst_verified: 0,
    profile_status: "PENDING",
  };

  try {
    const created = await enterpriseRepository.createProfile(profile);
    return created;
  } catch (error) {
    if (error?.code === "ER_DUP_ENTRY") {
      const duplicateMessage = String(error.sqlMessage || error.message || "").toLowerCase();
      const duplicateConstraint =
        duplicateMessage.match(/for key ['"`]?([^'"`]+)['"`]?/)?.[1] || duplicateMessage;

      if (duplicateConstraint.includes("gstin")) {
        throw new Error("This GSTIN is already associated with another business profile");
      }

      if (duplicateConstraint.includes("user_id") || /(?:^|[._])user(?:$|[._])/.test(duplicateConstraint)) {
        throw new Error("A business profile already exists for this user");
      }

      throw new Error("A profile with this unique value already exists");
    }
    throw error;
  }
};

const updateProfile = async ({ userId, body = {} }) => {
  if (!userId) {
    throw new Error("Authenticated user is required");
  }

  const existing = await enterpriseRepository.getProfileByUserId(userId);
  if (!existing) {
    throw new Error("No business profile found for this user");
  }

  const updates = {};

  if (body.company_name !== undefined || body.companyName !== undefined) {
    updates.company_name = String(body.company_name || body.companyName || "").trim();
    if (!updates.company_name) throw new Error("Company name is required");
  }

  if (body.billing_email !== undefined || body.billingEmail !== undefined) {
    updates.billing_email = String(body.billing_email || body.billingEmail || "").trim();
    if (!isValidEmail(updates.billing_email)) throw new Error("A valid billing email is required");
  }

  if (body.gstin !== undefined) {
    updates.gstin = body.gstin ? String(body.gstin).trim().toUpperCase() : null;
    if (updates.gstin && !isValidGSTIN(updates.gstin)) throw new Error("GSTIN must be 15 alphanumeric characters");
  }

  if (body.pan_number !== undefined || body.panNumber !== undefined) {
    updates.pan_number = body.pan_number || body.panNumber ? String(body.pan_number || body.panNumber).trim().toUpperCase() : null;
    if (updates.pan_number && !isValidPAN(updates.pan_number)) throw new Error("PAN number format is invalid");
  }

  if (body.contact_person !== undefined || body.contactPerson !== undefined) {
    updates.contact_person = body.contact_person || body.contactPerson ? String(body.contact_person || body.contactPerson).trim() : null;
  }

  if (body.contact_phone !== undefined || body.contactPhone !== undefined) {
    updates.contact_phone = body.contact_phone || body.contactPhone ? String(body.contact_phone || body.contactPhone).trim() : null;
    if (updates.contact_phone && !isValidPhone(updates.contact_phone)) throw new Error("Contact phone format is invalid");
  }

  if (body.billing_address !== undefined || body.billingAddress !== undefined) {
    updates.billing_address = body.billing_address || body.billingAddress ? String(body.billing_address || body.billingAddress).trim() : null;
  }

  if (body.billing_city !== undefined || body.billingCity !== undefined) {
    updates.billing_city = body.billing_city || body.billingCity ? String(body.billing_city || body.billingCity).trim() : null;
  }

  if (body.billing_state !== undefined || body.billingState !== undefined) {
    updates.billing_state = body.billing_state || body.billingState ? String(body.billing_state || body.billingState).trim() : null;
  }

  if (body.billing_pincode !== undefined || body.billingPincode !== undefined) {
    updates.billing_pincode = body.billing_pincode || body.billingPincode ? String(body.billing_pincode || body.billingPincode).trim() : null;
  }

  if (!Object.keys(updates).length) {
    return existing;
  }

  await enterpriseRepository.updateProfile(userId, updates);
  return enterpriseRepository.getProfileByUserId(userId);
};

const getProfileStatus = async (userId) => {
  if (!userId) {
    throw new Error("Authenticated user is required");
  }

  const profile = await enterpriseRepository.getProfileByUserId(userId);
  if (!profile) {
    return {
      exists: false,
      profile_status: null,
      company_name: null,
      billing_email: null,
      gst_verified: 0,
    };
  }

  return {
    exists: true,
    profile_status: profile.profile_status,
    company_name: profile.company_name,
    billing_email: profile.billing_email,
    gst_verified: profile.gst_verified,
    user_id: profile.user_id,
  };
};

const uploadPurchaseBill = async ({ userId, bookingId, file }) => {
  if (!userId) {
    throw new Error("Authenticated user is required");
  }

  const bookingIdNumber = Number(bookingId);
  if (!Number.isInteger(bookingIdNumber) || bookingIdNumber <= 0) {
    throw new Error("Valid booking ID is required");
  }

  if (!file || !file.buffer) {
    throw new Error("A PDF, JPG or PNG document is required");
  }

  const fileMimeType = String(file.mimetype || "").toLowerCase();
  const checksum = crypto.createHash("sha256").update(file.buffer).digest("hex");

  const connection = await db.getConnection();
  let storageKey;

  try {
    await connection.beginTransaction();

    const booking = await enterpriseRepository.getBookingForUpdate(connection, bookingIdNumber);
    if (!booking) {
      throw new Error("Booking not found");
    }

    if (String(booking.sender_id) !== String(userId)) {
      throw new Error("You are not allowed to upload a bill for this booking");
    }

    if (String(booking.shipment_type || "PERSONAL").toUpperCase() !== "BUSINESS") {
      throw new Error("This booking is not a business shipment");
    }

    if (String(booking.booking_status || "").toUpperCase() !== "PENDING") {
      throw new Error("Purchase bills can only be uploaded while the booking is pending");
    }

    const [activeBills] = await connection.execute(
      `
        SELECT id
        FROM enterprise_bills
        WHERE booking_id = ?
          AND status IN ('UPLOADED', 'UNDER_REVIEW', 'APPROVED')
        FOR UPDATE
      `,
      [bookingIdNumber]
    );

    try {
      storageKey = await uploadEnterpriseDocument({
        buffer: file.buffer,
        mimeType: fileMimeType,
        bookingId: bookingIdNumber,
        userId,
      });
    } catch (error) {
      console.error("Purchase bill R2 upload failed:", error);
      const uploadError = new Error("Purchase bill upload failed");
      uploadError.statusCode = 500;
      throw uploadError;
    }

    if (activeBills.length) {
      await connection.execute(
        `UPDATE enterprise_bills SET status = 'REPLACED' WHERE booking_id = ? AND status IN ('UPLOADED', 'UNDER_REVIEW', 'APPROVED')`,
        [bookingIdNumber]
      );
    }

    const [insertResult] = await connection.execute(
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
        booking.enterprise_profile_id || null,
        bookingIdNumber,
        userId,
        "PURCHASE_BILL",
        String(file.originalname || "purchase_bill")
          .replace(/[\\/]/g, "_")
          .replace(/[^\w.-]/g, "_")
          .slice(0, 255) || "purchase_bill",
        storageKey,
        fileMimeType,
        Number(file.size || file.buffer.length),
        checksum,
        "UPLOADED",
        null,
        null,
        null,
      ]
    );

    await connection.execute(
      `UPDATE bookings SET purchase_bill_status = 'UPLOADED' WHERE id = ? AND shipment_type = 'BUSINESS' AND booking_status = 'PENDING'`,
      [bookingIdNumber]
    );

    await connection.commit();

    return {
      booking_id: bookingIdNumber,
      bill_id: insertResult.insertId,
      purchase_bill_status: "UPLOADED",
      status: "UPLOADED",
      message: "Purchase bill uploaded successfully",
    };
  } catch (error) {
    try {
      await connection.rollback();
    } catch (rollbackError) {
      console.error("Purchase bill database rollback failed:", rollbackError);
    }

    if (storageKey) {
      try {
        await deleteEnterpriseDocument(storageKey);
      } catch (cleanupError) {
        console.error("Purchase bill R2 cleanup failed:", cleanupError);
      }
    }
    throw error;
  } finally {
    connection.release();
  }
};

const listPurchaseBills = async ({ userId, bookingId }) => {
  if (!userId) {
    throw new Error("Authenticated user is required");
  }

  const bookingIdNumber = Number(bookingId);
  if (!Number.isInteger(bookingIdNumber) || bookingIdNumber <= 0) {
    throw new Error("Valid booking ID is required");
  }

  const booking = await enterpriseRepository.getBookingForBusinessUpload(bookingIdNumber);
  if (!booking) {
    throw new Error("Booking not found");
  }

  if (String(booking.sender_id) !== String(userId)) {
    throw new Error("You are not allowed to view purchase bills for this booking");
  }

  const bills = await enterpriseRepository.getPurchaseBillsByBookingId(bookingIdNumber);

  return bills.map((bill) => ({
    id: bill.id,
    booking_id: bill.booking_id,
    enterprise_profile_id: bill.enterprise_profile_id,
    document_type: bill.document_type,
    original_filename: bill.original_filename,
    mime_type: bill.mime_type,
    file_size: bill.file_size,
    checksum: bill.checksum,
    status: bill.status,
    rejection_reason: bill.rejection_reason,
    uploaded_at: bill.uploaded_at,
    verified_at: bill.verified_at,
    verified_by: bill.verified_by,
  }));
};

const viewPurchaseBill = async ({ userId, documentId }) => {
  if (!userId) {
    throw new Error("Authenticated user is required");
  }

  const id = Number(documentId);
  if (!Number.isInteger(id) || id <= 0) {
    throw new Error("Valid document ID is required");
  }

  const bill = await enterpriseRepository.getPurchaseBillById(id);
  if (!bill) {
    throw new Error("Document not found");
  }

  if (String(bill.sender_id) !== String(userId)) {
    throw new Error("You are not allowed to view this document");
  }

  const signedUrl = await getEnterpriseDocumentSignedUrl(bill.storage_key, 300);

  return {
    document_id: bill.id,
    booking_id: bill.booking_id,
    mime_type: bill.mime_type,
    file_size: bill.file_size,
    original_filename: bill.original_filename,
    status: bill.status,
    signed_url: signedUrl,
    expires_in: 300,
  };
};

module.exports = {
  getProfile,
  createProfile,
  updateProfile,
  getProfileStatus,
  uploadPurchaseBill,
  listPurchaseBills,
  viewPurchaseBill,
  normalizeBusinessSnapshot,
  decodeJsonField,
};
