const enterpriseService = require("./enterpriseService");

const getErrorDetails = (error) => {
  const message = error?.message || "";

  if (error?.statusCode) {
    return { status: error.statusCode, message };
  }
  if (error?.code || error?.$metadata || error?.$fault) {
    console.error("Enterprise request failed:", error);
    return { status: 500, message: "An internal error occurred" };
  }
  if (message === "Authenticated user is required") {
    return { status: 401, message };
  }
  if (/not allowed|does not belong to you|does not belong to this booking sender/i.test(message)) {
    return { status: 403, message };
  }
  if (/not found/i.test(message)) {
    return { status: 404, message };
  }
  if (/already exists|already confirmed|only be uploaded while|cannot accept|requires an uploaded purchase bill|no active purchase bill|current state|status changed/i.test(message)) {
    return { status: 409, message };
  }

  return { status: 400, message: message || "Invalid request" };
};

const getBookingIdFromRequest = (req) => {
  const id = req.params?.bookingId ?? req.body?.booking_id ?? req.query?.booking_id ?? req.query?.bookingId;
  return id;
};

const getDocumentIdFromRequest = (req) => req.params?.documentId ?? req.body?.document_id ?? req.query?.document_id ?? req.query?.documentId;

exports.getProfile = async (req, res) => {
  try {
    const result = await enterpriseService.getProfile(req.user?.user_id);
    return res.status(200).json({
      responseCode: "00",
      success: true,
      message: result.exists ? "Enterprise profile fetched successfully" : "No enterprise profile found",
      data: result.profile,
    });
  } catch (error) {
    const details = getErrorDetails(error);
    return res.status(details.status).json({ responseCode: "01", success: false, message: details.message });
  }
};

exports.createProfile = async (req, res) => {
  try {
    const data = await enterpriseService.createProfile({
      userId: req.user?.user_id,
      body: req.body,
    });

    return res.status(201).json({
      responseCode: "00",
      success: true,
      message: "Enterprise profile created successfully",
      data,
    });
  } catch (error) {
    const details = getErrorDetails(error);
    return res.status(details.status).json({ responseCode: "01", success: false, message: details.message });
  }
};

exports.updateProfile = async (req, res) => {
  try {
    const data = await enterpriseService.updateProfile({
      userId: req.user?.user_id,
      body: req.body,
    });

    return res.status(200).json({
      responseCode: "00",
      success: true,
      message: "Enterprise profile updated successfully",
      data,
    });
  } catch (error) {
    const details = getErrorDetails(error);
    return res.status(details.status).json({ responseCode: "01", success: false, message: details.message });
  }
};

exports.getProfileStatus = async (req, res) => {
  try {
    const data = await enterpriseService.getProfileStatus(req.user?.user_id);
    return res.status(200).json({
      responseCode: "00",
      success: true,
      message: "Enterprise profile status fetched successfully",
      data,
    });
  } catch (error) {
    const details = getErrorDetails(error);
    return res.status(details.status).json({ responseCode: "01", success: false, message: details.message });
  }
};

exports.uploadPurchaseBill = async (req, res) => {
  try {
    const data = await enterpriseService.uploadPurchaseBill({
      userId: req.user?.user_id,
      bookingId: getBookingIdFromRequest(req),
      file: req.file,
    });

    return res.status(200).json({
      responseCode: "00",
      success: true,
      message: data.message,
      data,
    });
  } catch (error) {
    const details = getErrorDetails(error);
    return res.status(details.status).json({ responseCode: "01", success: false, message: details.message });
  }
};

exports.listPurchaseBills = async (req, res) => {
  try {
    const data = await enterpriseService.listPurchaseBills({
      userId: req.user?.user_id,
      bookingId: getBookingIdFromRequest(req),
    });

    return res.status(200).json({
      responseCode: "00",
      success: true,
      message: "Purchase bills fetched successfully",
      data,
    });
  } catch (error) {
    const details = getErrorDetails(error);
    return res.status(details.status).json({ responseCode: "01", success: false, message: details.message });
  }
};

exports.viewDocument = async (req, res) => {
  try {
    const data = await enterpriseService.viewPurchaseBill({
      userId: req.user?.user_id,
      documentId: getDocumentIdFromRequest(req),
    });

    return res.status(200).json({
      responseCode: "00",
      success: true,
      message: "Purchase bill signed URL generated successfully",
      data,
    });
  } catch (error) {
    const details = getErrorDetails(error);
    return res.status(details.status).json({ responseCode: "01", success: false, message: details.message });
  }
};
