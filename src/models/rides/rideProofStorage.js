const {
  PutObjectCommand,
  DeleteObjectCommand,
  GetObjectCommand,
} = require("@aws-sdk/client-s3");

const {
  getSignedUrl,
} = require("@aws-sdk/s3-request-presigner");

const r2Client = require("../../config/r2");

const uploadToR2 = async ({
  buffer,
  rideId,
  documentType,
  namespace = "rides",
}) => {
  const key = `${namespace}/${rideId}/${documentType}-${Date.now()}.webp`;

  const command = new PutObjectCommand({
    Bucket: process.env.R2_BUCKET_NAME,
    Key: key,
    Body: buffer,
    ContentType: "image/webp",
  });

  await r2Client.send(command);

  return key;
};

const deleteFromR2 = async (key) => {
  if (!key) return;

  const command = new DeleteObjectCommand({
    Bucket: process.env.R2_BUCKET_NAME,
    Key: key,
  });

  await r2Client.send(command);
};

const getDocumentUrl = async (key) => {
  if (!key) {
    return null;
  }

  const command = new GetObjectCommand({
    Bucket: process.env.R2_BUCKET_NAME,
    Key: key,
  });

  return getSignedUrl(r2Client, command, {
    expiresIn: 300,
  });
};

module.exports = {
  uploadToR2,
  deleteFromR2,
  getDocumentUrl,
};