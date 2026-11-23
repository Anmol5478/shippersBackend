const service = require("./passengerBookingService");

exports.create = async (req, res) => {
  try {
    const data = await service.createPassengerBooking({ userId: req.user?.user_id, body: req.body || {} });
    return res.status(201).json({ responseCode: "00", success: true, message: "Passenger booking created successfully", data });
  } catch (error) {
    const message = error.message || "Unable to create passenger booking";
    const status = /not found/i.test(message) ? 404 : /not allowed|own ride/i.test(message) ? 403 : 400;
    return res.status(status).json({ responseCode: "01", success: false, message });
  }
};

exports.mine = async (req, res) => {
  try {
    const data = await service.getPassengerBookings(req.user?.user_id);
    return res.json({ responseCode: "00", success: true, data });
  } catch (error) {
    return res.status(400).json({ responseCode: "01", success: false, message: error.message });
  }
};

exports.received = async (req, res) => {
  try {
    const data = await service.getDriverPassengerBookings(req.user?.user_id);
    return res.json({ responseCode: "00", success: true, data });
  } catch (error) {
    return res.status(400).json({ responseCode: "01", success: false, message: error.message });
  }
};

exports.cancel = async (req, res) => {
  try {
    const data = await service.cancelPassengerBooking({ bookingId: req.params.bookingId, userId: req.user?.user_id });
    return res.json({ responseCode: "00", success: true, message: "Passenger booking cancelled", data });
  } catch (error) {
    const message = error.message || "Unable to cancel passenger booking";
    const status = /not found/i.test(message) ? 404 : /not allowed/i.test(message) ? 403 : 409;
    return res.status(status).json({ responseCode: "01", success: false, message });
  }
};

exports.updateStatus = async (req, res) => {
  try {
    const data = await service.updatePassengerBookingStatus({
      bookingId: req.params.bookingId, userId: req.user?.user_id, status: req.body?.status,
    });
    return res.json({ responseCode: "00", success: true, message: "Passenger booking status updated", data });
  } catch (error) {
    const message = error.message || "Unable to update passenger booking";
    const status = /not found/i.test(message) ? 404 : /not allowed/i.test(message) ? 403 : 409;
    return res.status(status).json({ responseCode: "01", success: false, message });
  }
};

exports.payAdvance = async (req, res) => {
  try {
    const data = await service.payPassengerBookingAdvance({
      bookingId: req.params.bookingId,
      userId: req.user?.user_id,
      body: req.body || {},
    });
    return res.json({
      responseCode: "00",
      success: true,
      message: "Advance paid successfully. Awaiting driver confirmation.",
      data,
    });
  } catch (error) {
    const message = error.message || "Unable to pay advance";
    let status = 400;
    if (/not found/i.test(message)) status = 404;
    else if (/not allowed/i.test(message)) status = 403;
    else if (/already been paid|Insufficient wallet/i.test(message)) status = 409;
    return res.status(status).json({ responseCode: "01", success: false, message });
  }
};
