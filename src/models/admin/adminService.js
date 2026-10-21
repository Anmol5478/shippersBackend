const adminRepository = require("./adminRepository");

const getDashboard = async () => adminRepository.getDashboardStats();

const listUsers = async (query) => {
  const page = Math.max(1, Number(query.page) || 1);
  const limit = Math.min(100, Math.max(1, Number(query.limit) || 20));
  return adminRepository.listUsers({
    role: query.role,
    search: query.search,
    blocked: query.blocked,
    page,
    limit,
  });
};

const getUser = async (userId) => {
  if (!userId) throw new Error("user_id is required");
  const user = await adminRepository.getUserById(userId);
  if (!user) throw new Error("User not found");
  return user;
};

const blockUser = async (userId) => {
  if (!userId) throw new Error("user_id is required");
  return adminRepository.setUserBlocked(userId, true);
};

const unblockUser = async (userId) => {
  if (!userId) throw new Error("user_id is required");
  return adminRepository.setUserBlocked(userId, false);
};

const listKyc = async (query) => {
  const page = Math.max(1, Number(query.page) || 1);
  const limit = Math.min(100, Math.max(1, Number(query.limit) || 20));
  return adminRepository.listKyc({
    status: query.status,
    page,
    limit,
  });
};

const getKyc = async (userId) => {
  if (!userId) throw new Error("user_id is required");
  const kyc = await adminRepository.getKycWithUrls(userId);
  if (!kyc) throw new Error("KYC record not found");
  return kyc;
};

const approveKyc = async ({ userId, adminUserId }) => {
  if (!userId) throw new Error("user_id is required");
  const existing = await adminRepository.getKycByUserId(userId);
  if (!existing) throw new Error("KYC record not found");
  return adminRepository.updateKycStatus({
    userId,
    status: "VERIFIED",
    rejectionReason: null,
    approvedBy: adminUserId || null,
  });
};

const rejectKyc = async ({ userId, reason, adminUserId }) => {
  if (!userId) throw new Error("user_id is required");
  if (!reason || !String(reason).trim()) {
    throw new Error("Rejection reason is required");
  }
  const existing = await adminRepository.getKycByUserId(userId);
  if (!existing) throw new Error("KYC record not found");
  return adminRepository.updateKycStatus({
    userId,
    status: "REJECTED",
    rejectionReason: String(reason).trim(),
    approvedBy: adminUserId || null,
  });
};

const listRides = async (query) => {
  const page = Math.max(1, Number(query.page) || 1);
  const limit = Math.min(100, Math.max(1, Number(query.limit) || 20));
  return adminRepository.listRides({
    status: query.status,
    proof_status: query.proof_status,
    page,
    limit,
  });
};

const getRide = async (rideId) => {
  if (!rideId) throw new Error("ride_id is required");
  const ride = await adminRepository.getRideDetail(Number(rideId));
  if (!ride) throw new Error("Ride not found");
  return ride;
};

const approveRideProof = async ({ rideId, adminUserId }) => {
  if (!rideId) throw new Error("ride_id is required");
  return adminRepository.updateRideProofStatus({
    rideId: Number(rideId),
    status: "VERIFIED",
    rejectionReason: null,
    adminUserId: adminUserId || null,
  });
};

const rejectRideProof = async ({ rideId, reason, adminUserId }) => {
  if (!rideId) throw new Error("ride_id is required");
  if (!reason || !String(reason).trim()) {
    throw new Error("Rejection reason is required");
  }
  return adminRepository.updateRideProofStatus({
    rideId: Number(rideId),
    status: "REJECTED",
    rejectionReason: String(reason).trim(),
    adminUserId: adminUserId || null,
  });
};

const listBookings = async (query) => {
  const page = Math.max(1, Number(query.page) || 1);
  const limit = Math.min(100, Math.max(1, Number(query.limit) || 20));
  return adminRepository.listBookings({
    status: query.status,
    page,
    limit,
  });
};

const getBooking = async (bookingId) => {
  if (!bookingId) throw new Error("booking_id is required");
  const booking = await adminRepository.getBookingDetail(Number(bookingId));
  if (!booking) throw new Error("Booking not found");
  return booking;
};

/**
 * PNR status check via RapidAPI:
 * real-time-pnr-status-api-for-indian-railways
 * GET /name/{pnr}  (PNR Status With Name)
 *
 * Env:
 *   RAPIDAPI_PNR_KEY  (required for live data)
 *   RAPIDAPI_PNR_HOST (optional override)
 */
const checkPnr = async (pnr) => {
  const cleaned = String(pnr || "")
    .trim()
    .toUpperCase()
    .replace(/\s+/g, "");

  if (!/^[A-Z0-9]{10}$/.test(cleaned)) {
    throw new Error("PNR must be a 10-character alphanumeric code");
  }

  const result = {
    pnr: cleaned,
    source: "manual",
    checked_at: new Date().toISOString(),
    status: null,
    train: null,
    from: null,
    to: null,
    journey_date: null,
    passengers: [],
    chart_prepared: null,
    raw: null,
    external_links: {
      confirmTkt: `https://www.confirmtkt.com/pnr-status/${cleaned}`,
      trainman: `https://www.trainman.in/pnr/${cleaned}`,
      railYatri: `https://www.railyatri.in/pnr-status/${cleaned}`,
    },
  };

  const rapidKey =
    process.env.RAPIDAPI_PNR_KEY ||
    process.env.RAPIDAPI_KEY ||
    "";

  const host =
    process.env.RAPIDAPI_PNR_HOST ||
    "real-time-pnr-status-api-for-indian-railways.p.rapidapi.com";

  if (!rapidKey) {
    result.message =
      "Set RAPIDAPI_PNR_KEY in backend .env for live PNR data. Using external links for manual check.";
    return result;
  }

  try {
    // Endpoint from RapidAPI: GET PNR Status With Name → /name/{pnr}
    const url = `https://${host}/name/${cleaned}`;
    const res = await fetch(url, {
      method: "GET",
      headers: {
        Accept: "application/json",
        "x-rapidapi-host": host,
        "x-rapidapi-key": rapidKey,
      },
    });

    const data = await res.json().catch(() => null);

    if (!res.ok) {
      result.source = "rapidapi";
      result.api_error =
        (data && (data.message || data.error)) ||
        `RapidAPI HTTP ${res.status}`;
      result.raw = data;
      return result;
    }

    const body = data?.data ?? data ?? {};
    result.source = "rapidapi";
    result.raw = body;

    // Map common field names from this API family
    result.status =
      body.Status ||
      body.status ||
      body.ChartStatus ||
      body.pnr_status ||
      body.CurrentStatus ||
      null;

    const trainNo =
      body.TrainNo || body.TrainNumber || body.train_number || body.trainNumber;
    const trainName =
      body.TrainName || body.train_name || body.trainName || "";
    result.train = trainNo
      ? `${trainNo} ${trainName}`.trim()
      : trainName || null;

    result.from =
      body.From ||
      body.SourceStation ||
      body.BoardingPoint ||
      body.from ||
      body.source ||
      null;

    result.to =
      body.To ||
      body.DestinationStation ||
      body.to ||
      body.destination ||
      null;

    result.journey_date =
      body.Doj ||
      body.JourneyDate ||
      body.DepartureDate ||
      body.journey_date ||
      body.date ||
      null;

    result.chart_prepared =
      body.ChartPrepared ?? body.chartPrepared ?? body.chart_prepared ?? null;

    const passengers =
      body.PassengerStatus ||
      body.Passengers ||
      body.passenger ||
      body.passengers ||
      [];
    if (Array.isArray(passengers)) {
      result.passengers = passengers;
    } else if (passengers && typeof passengers === "object") {
      result.passengers = [passengers];
    }

    // Some responses nest under "name" or similar
    if (!result.status && body.name) {
      result.status = body.name;
    }
  } catch (err) {
    result.source = "rapidapi";
    result.api_error = err.message || String(err);
  }

  return result;
};

module.exports = {
  getDashboard,
  listUsers,
  getUser,
  blockUser,
  unblockUser,
  listKyc,
  getKyc,
  approveKyc,
  rejectKyc,
  listRides,
  getRide,
  approveRideProof,
  rejectRideProof,
  listBookings,
  getBooking,
  checkPnr,
};
