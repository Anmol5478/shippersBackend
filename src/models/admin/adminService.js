const adminRepository = require("./adminRepository");

const getDashboard = async () => {
  return adminRepository.getDashboardStats();
};

const listUsers = async (query) => {
  const page = Math.max(1, Number(query.page) || 1);
  const limit = Math.min(100, Math.max(1, Number(query.limit) || 20));
  return adminRepository.listUsers({
    role: query.role,
    search: query.search,
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
  const kyc = await adminRepository.getKycByUserId(userId);
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
    page,
    limit,
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

module.exports = {
  getDashboard,
  listUsers,
  getUser,
  listKyc,
  getKyc,
  approveKyc,
  rejectKyc,
  listRides,
  listBookings,
};
