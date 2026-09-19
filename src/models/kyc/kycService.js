const sharp = require("sharp");

const kycRepository = require("./kycRepository");
const {
  uploadToR2,
  deleteFromR2,
} = require("./kycStorage");

const ALLOWED_DOCUMENT_TYPES = [
  "aadhaar_front",
  "aadhaar_back",
  "pan",
  "selfie",
];

const ALLOWED_MIME_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
];

const uploadKycDocument = async ({
  userId,
  documentType,
  file,
}) => {
  if (!userId) {
    throw new Error("User ID is required");
  }

  if (!ALLOWED_DOCUMENT_TYPES.includes(documentType)) {
    throw new Error("Invalid document type");
  }

  if (!file) {
    throw new Error("Document is required");
  }

  if (!ALLOWED_MIME_TYPES.includes(file.mimetype)) {
    throw new Error(
      "Only JPG, PNG and WEBP images are allowed"
    );
  }

  const maxSize = 10 * 1024 * 1024;

  if (file.size > maxSize) {
    throw new Error(
      "Document size must not exceed 10MB"
    );
  }

  /*
   * Convert image to WebP.
   *
   * rotate() automatically handles images
   * where the camera orientation is stored in EXIF.
   */
  const webpBuffer = await sharp(file.buffer)
    .rotate()
    .webp({
      quality: 85,
    })
    .toBuffer();

  const oldKyc =
    await kycRepository.findKycByUserId(userId);

  let oldDocumentKey = null;

  if (oldKyc) {
    const oldKeys = {
      aadhaar_front:
        oldKyc.aadhaar_front_document_key,

      aadhaar_back:
        oldKyc.aadhaar_back_document_key,

      pan:
        oldKyc.pan_document_key,

      selfie:
        oldKyc.selfie_document_key,
    };

    oldDocumentKey = oldKeys[documentType];
  }

  /*
   * Upload new WebP to R2.
   */
  const documentKey = await uploadToR2({
    buffer: webpBuffer,
    userId,
    documentType,
  });

  try {
    /*
     * Save R2 key in database.
     */
    const kyc =
      await kycRepository.updateDocumentKey({
        userId,
        documentType,
        documentKey,
      });

    /*
     * Delete old document only after
     * database update succeeds.
     */
    if (
      oldDocumentKey &&
      oldDocumentKey !== documentKey
    ) {
      await deleteFromR2(oldDocumentKey);
    }

    return {
      documentType,
      documentKey,
      kycStatus: kyc.kyc_status,
    };
  } catch (error) {
    /*
     * If DB update fails, remove the newly
     * uploaded R2 object.
     */
    await deleteFromR2(documentKey);

    throw error;
  }
};

const getKycStatus = async (userId) => {
  const kyc =
    await kycRepository.findKycByUserId(userId);

  if (!kyc) {
    return {
      kyc: "N",
      status: "NOT_SUBMITTED",
      documents: {
        aadhaar_front: false,
        aadhaar_back: false,
        pan: false,
        selfie: false,
      },
    };
  }

  return {
    kyc:
      kyc.kyc_status === "VERIFIED"
        ? "Y"
        : "N",

    status: kyc.kyc_status,

    rejectionReason:
      kyc.rejection_reason || null,

    documents: {
      aadhaar_front:
        !!kyc.aadhaar_front_document_key,

      aadhaar_back:
        !!kyc.aadhaar_back_document_key,

      pan:
        !!kyc.pan_document_key,

      selfie:
        !!kyc.selfie_document_key,
    },
  };
};

module.exports = {
  uploadKycDocument,
  getKycStatus,
};