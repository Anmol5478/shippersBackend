const bookingService = require("./bookingService");


/**
 * Create booking.
 */
exports.createBooking = async (
  req,
  res
) => {
  try {
    const userId =
      req.user?.user_id;

    if (!userId) {
      return res.status(401).json({
        responseCode: "01",
        success: false,
        message:
          "Authenticated user ID not found",
      });
    }


    const data =
      await bookingService.createBooking({
        userId,
        body: req.body,
      });


    return res.status(201).json({
      responseCode: "00",
      success: true,
      message:
        "Booking created successfully",
      data,
    });

  } catch (error) {

    console.error(
      "createBooking controller error:",
      error
    );

    return res.status(400).json({
      responseCode: "01",
      success: false,
      message:
        error.message,
    });
  }
};


/**
 * Get booking.
 */
exports.getBooking = async (
  req,
  res
) => {
  try {
    const data =
      await bookingService.getBooking({
        bookingId:
          req.params.bookingId,
      });


    return res.status(200).json({
      responseCode: "00",
      success: true,
      message:
        "Booking fetched successfully",
      data,
    });

  } catch (error) {

    return res.status(400).json({
      responseCode: "01",
      success: false,
      message:
        error.message,
    });
  }
};


/**
 * Get shipper bookings.
 */
exports.getUserBookings = async (
  req,
  res
) => {
  try {
    const userId =
      req.user?.user_id;

    const data =
      await bookingService
        .getUserBookings(userId);


    return res.status(200).json({
      responseCode: "00",
      success: true,
      message:
        "Bookings fetched successfully",
      data,
    });

  } catch (error) {

    return res.status(400).json({
      responseCode: "01",
      success: false,
      message:
        error.message,
    });
  }
};


/**
 * Get traveller bookings.
 */
exports.getTravellerBookings = async (
  req,
  res
) => {
  try {
    const userId =
      req.user?.user_id;

    const data =
      await bookingService
        .getTravellerBookings(
          userId
        );


    return res.status(200).json({
      responseCode: "00",
      success: true,
      message:
        "Traveller bookings fetched successfully",
      data,
    });

  } catch (error) {

    return res.status(400).json({
      responseCode: "01",
      success: false,
      message:
        error.message,
    });
  }
};


/**
 * Cancel booking.
 */
exports.cancelBooking = async (
  req,
  res
) => {
  try {
    const userId =
      req.user?.user_id;

    const data =
      await bookingService.cancelBooking({
        bookingId:
          req.params.bookingId,
        userId,
      });


    return res.status(200).json({
      responseCode: "00",
      success: true,
      message:
        "Booking cancelled successfully",
      data,
    });

  } catch (error) {

    return res.status(400).json({
      responseCode: "01",
      success: false,
      message:
        error.message,
    });
  }
};


/**
 * Traveller accepts/rejects booking.
 */
exports.updateBookingStatus = async (
  req,
  res
) => {
  try {
    const userId =
      req.user?.user_id;

    const data =
      await bookingService
        .updateBookingStatus({
          bookingId:
            req.params.bookingId,

          userId,

          status:
            req.body.status,
        });


    return res.status(200).json({
      responseCode: "00",
      success: true,
      message:
        "Booking status updated successfully",
      data,
    });

  } catch (error) {

    return res.status(400).json({
      responseCode: "01",
      success: false,
      message:
        error.message,
    });
  }
};