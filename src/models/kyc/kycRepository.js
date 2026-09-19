const db = require("../../config/db");

const findKycByUserId = async (userId) => {
  const [rows] = await db.execute(
    `
    SELECT *
    FROM user_kyc
    WHERE user_id = ?
    LIMIT 1
    `,
    [userId]
  );

  return rows[0] || null;
};

const createKyc = async (userId) => {
  const [result] = await db.execute(
    `
    INSERT INTO user_kyc (
      user_id,
      kyc_status
    )
    VALUES (?, 'PENDING')
    `,
    [userId]
  );

  return result.insertId;
};

const createOrGetKyc = async (userId) => {
  let kyc = await findKycByUserId(userId);

  if (!kyc) {
    await createKyc(userId);
    kyc = await findKycByUserId(userId);
  }

  return kyc;
};

const updateDocumentKey = async ({
  userId,
  documentType,
  documentKey,
}) => {
  const columns = {
    aadhaar_front: "aadhaar_front_document_key",
    aadhaar_back: "aadhaar_back_document_key",
    pan: "pan_document_key",
    selfie: "selfie_document_key",
  };

  const column = columns[documentType];

  if (!column) {
    throw new Error("Invalid document type");
  }

  await createOrGetKyc(userId);

  await db.execute(
    `
    UPDATE user_kyc
    SET
      ${column} = ?,
      kyc_status = 'PENDING',
      rejection_reason = NULL
    WHERE user_id = ?
    `,
    [documentKey, userId]
  );

  return findKycByUserId(userId);
};

const updateKycStatus = async ({
  userId,
  status,
  rejectionReason = null,
  verifiedBy = null,
}) => {
  await db.execute(
    `
    UPDATE user_kyc
    SET
      kyc_status = ?,
      rejection_reason = ?,
      verified_by = ?,
      verified_at = CASE
        WHEN ? = 'VERIFIED' THEN NOW()
        ELSE NULL
      END
    WHERE user_id = ?
    `,
    [
      status,
      rejectionReason,
      verifiedBy,
      status,
      userId,
    ]
  );

  return findKycByUserId(userId);
};

module.exports = {
  findKycByUserId,
  createKyc,
  createOrGetKyc,
  updateDocumentKey,
  updateKycStatus,
};