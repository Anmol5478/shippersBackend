const adminRepository = require("./adminRepository");

<<<<<<< HEAD
const getDashboard = async () => adminRepository.getDashboardStats();
=======
const getDashboard = async () => {
  return adminRepository.getDashboardStats();
};
>>>>>>> d5497284ba77961a5c3e6015b603744450561203

const listUsers = async (query) => {
  const page = Math.max(1, Number(query.page) || 1);
  const limit = Math.min(100, Math.max(1, Number(query.limit) || 20));
  return adminRepository.listUsers({
    role: query.role,
    search: query.search,
<<<<<<< HEAD
    blocked: query.blocked,
=======
>>>>>>> d5497284ba77961a5c3e6015b603744450561203
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

<<<<<<< HEAD
const blockUser = async (userId) => {
  if (!userId) throw new Error("user_id is required");
  return adminRepository.setUserBlocked(userId, true);
};

const unblockUser = async (userId) => {
  if (!userId) throw new Error("user_id is required");
  return adminRepository.setUserBlocked(userId, false);
};

=======
>>>>>>> d5497284ba77961a5c3e6015b603744450561203
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
<<<<<<< HEAD
  const kyc = await adminRepository.getKycWithUrls(userId);
=======
  const kyc = await adminRepository.getKycByUserId(userId);
>>>>>>> d5497284ba77961a5c3e6015b603744450561203
  if (!kyc) throw new Error("KYC record not found");
  return kyc;
};

const approveKyc = async ({ userId, adminUserId }) => {
  if (!userId) throw new Error("user_id is required");
<<<<<<< HEAD
  const existing = await adminRepository.getKycByUserId(userId);
  if (!existing) throw new Error("KYC record not found");
=======

  const existing = await adminRepository.getKycByUserId(userId);
  if (!existing) throw new Error("KYC record not found");

>>>>>>> d5497284ba77961a5c3e6015b603744450561203
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
<<<<<<< HEAD
  const existing = await adminRepository.getKycByUserId(userId);
  if (!existing) throw new Error("KYC record not found");
=======

  const existing = await adminRepository.getKycByUserId(userId);
  if (!existing) throw new Error("KYC record not found");

>>>>>>> d5497284ba77961a5c3e6015b603744450561203
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
<<<<<<< HEAD
    proof_status: query.proof_status,
=======
>>>>>>> d5497284ba77961a5c3e6015b603744450561203
    page,
    limit,
  });
};

<<<<<<< HEAD
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

=======
>>>>>>> d5497284ba77961a5c3e6015b603744450561203
const listBookings = async (query) => {
  const page = Math.max(1, Number(query.page) || 1);
  const limit = Math.min(100, Math.max(1, Number(query.limit) || 20));
  return adminRepository.listBookings({
    status: query.status,
    page,
    limit,
  });
};

<<<<<<< HEAD
const getBooking = async (bookingId) => {
  if (!bookingId) throw new Error("booking_id is required");
  const booking = await adminRepository.getBookingDetail(Number(bookingId));
  if (!booking) throw new Error("Booking not found");
  return booking;
};

/**
 * PNR status check.
 * Uses optional RAPIDAPI_PNR_KEY env for RapidAPI Indian Railway PNR.
 * Falls back to structured manual-check payload with external links.
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

  const rapidKey = process.env.RAPIDAPI_PNR_KEY || process.env.RAPIDAPI_KEY;
  if (rapidKey) {
    try {
      const res = await fetch(
        `https://irctc1.p.rapidapi.com/api/v3/getPNRStatus?pnrNumber=${cleaned}`,
        {
          method: "GET",
          headers: {
            "x-rapidapi-host": "irctc1.p.rapidapi.com",
            "x-rapidapi-key": rapidKey,
          },
        }
      );
      if (res.ok) {
        const data = await res.json();
        const body = data?.data || data;
        result.source = "rapidapi";
        result.raw = body;
        result.status = body?.Status || body?.status || body?.ChartStatus || null;
        result.train =
          body?.TrainNo || body?.TrainNumber
            ? `${body.TrainNo || body.TrainNumber} ${body.TrainName || ""}`.trim()
            : null;
        result.from = body?.From || body?.SourceStation || body?.BoardingPoint || null;
        result.to = body?.To || body?.DestinationStation || null;
        result.journey_date =
          body?.Doj || body?.JourneyDate || body?.DepartureDate || null;
        result.chart_prepared =
          body?.ChartPrepared ?? body?.chartPrepared ?? null;
        if (Array.isArray(body?.PassengerStatus || body?.Passengers)) {
          result.passengers = body.PassengerStatus || body.Passengers;
        }
      }
    } catch (err) {
      result.api_error = err.message;
    }
  }

  return result;
};

=======
>>>>>>> d5497284ba77961a5c3e6015b603744450561203
module.exports = {
  getDashboard,
  listUsers,
  getUser,
<<<<<<< HEAD
  blockUser,
  unblockUser,
=======
>>>>>>> d5497284ba77961a5c3e6015b603744450561203
  listKyc,
  getKyc,
  approveKyc,
  rejectKyc,
  listRides,
<<<<<<< HEAD
  getRide,
  approveRideProof,
  rejectRideProof,
  listBookings,
  getBooking,
  checkPnr,
=======
  listBookings,
>>>>>>> d5497284ba77961a5c3e6015b603744450561203
};
