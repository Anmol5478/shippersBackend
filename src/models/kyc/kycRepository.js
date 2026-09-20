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

const updateKycStatus = async ({
  userId,
  status,
  rejectionReason = null,
  approvedBy = null,
}) => {
  const allowedStatuses = [
    "PENDING",
    "VERIFIED",
    "REJECTED",
  ];

  if (!allowedStatuses.includes(status)) {
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
    [
      status,
      rejectionReason,
      approvedBy,
      userId,
    ]
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