const crypto = require("crypto");
const { PutObjectCommand, DeleteObjectCommand, GetObjectCommand } = require("@aws-sdk/client-s3");
const { getSignedUrl } = require("@aws-sdk/s3-request-presigner");
const r2Client = require("../../config/r2");

const ALLOWED_DOCUMENT_MIME_TYPES = [
  "application/pdf",
  "image/jpeg",
  "image/png",
];

const validateDocumentBuffer = ({ buffer, mimeType }) => {
  if (!Buffer.isBuffer(buffer) || buffer.length === 0) {
    throw new Error("Document content is required");
  }

  if (!ALLOWED_DOCUMENT_MIME_TYPES.includes(mimeType)) {
    throw new Error("Only PDF, JPG and PNG files are allowed");
  }

  if (buffer.length > 10 * 1024 * 1024) {
    throw new Error("Document must not exceed 10 MB");
  }

  const signature = buffer.subarray(0, 8);

  if (mimeType === "application/pdf") {
    if (!(signature[0] === 0x25 && signature[1] === 0x50 && signature[2] === 0x44 && signature[3] === 0x46)) {
      throw new Error("Invalid PDF file signature");
    }
  }

  if (mimeType === "image/jpeg") {
    if (!(signature[0] === 0xff && signature[1] === 0xd8 && signature[2] === 0xff)) {
      throw new Error("Invalid JPG file signature");
    }
  }

  if (mimeType === "image/png") {
    if (!(signature[0] === 0x89 && signature[1] === 0x50 && signature[2] === 0x4e && signature[3] === 0x47 && signature[4] === 0x0d && signature[5] === 0x0a && signature[6] === 0x1a && signature[7] === 0x0a)) {
      throw new Error("Invalid PNG file signature");
    }
  }
};

const getExtensionFromMimeType = (mimeType) => {
  if (mimeType === "application/pdf") return "pdf";
  if (mimeType === "image/jpeg") return "jpg";
  if (mimeType === "image/png") return "png";
  return "bin";
};

const uploadEnterpriseDocument = async ({ buffer, mimeType, bookingId, userId }) => {
  validateDocumentBuffer({ buffer, mimeType });

  const extension = getExtensionFromMimeType(mimeType);
  const key = `enterprise/bills/${bookingId}/${Date.now()}-${crypto.randomBytes(8).toString("hex")}.${extension}`;

  const command = new PutObjectCommand({
    Bucket: process.env.R2_BUCKET_NAME,
    Key: key,
    Body: buffer,
    ContentType: mimeType,
    Metadata: {
      uploadedBy: String(userId || "unknown"),
    },
  });

  await r2Client.send(command);

  return key;
};

const deleteEnterpriseDocument = async (key) => {
  if (!key) return;

  const command = new DeleteObjectCommand({
    Bucket: process.env.R2_BUCKET_NAME,
    Key: key,
  });

  await r2Client.send(command);
};

const getEnterpriseDocumentSignedUrl = async (key, expiresIn = 300) => {
  if (!key) return null;

  const command = new GetObjectCommand({
    Bucket: process.env.R2_BUCKET_NAME,
    Key: key,
  });

  return getSignedUrl(r2Client, command, {
    expiresIn,
  });
};

module.exports = {
  ALLOWED_DOCUMENT_MIME_TYPES,
  validateDocumentBuffer,
  uploadEnterpriseDocument,
  deleteEnterpriseDocument,
  getEnterpriseDocumentSignedUrl,
};
