const bcrypt = require("bcrypt");

const authRepository = require("./authRepository");

const {
  generateAccessToken,
} = require("../../utils/jwt");

const signup = async (payload) => {
  const {
    full_name,
    email,
    phone,
    password,
    gender,
    role = 2,
  } = payload;

  if (
    !full_name ||
    !email ||
    !phone ||
    !password ||
    !role
  ) {
    throw new Error("All fields are required");
  }

  const validRoles = [1, 2, 3];

  if (!validRoles.includes(Number(role))) {
    throw new Error("Invalid role");
  }

  const validGenders = [
    "Male",
    "Female",
    "Other",
  ];

  const finalGender =
    validGenders.includes(gender)
      ? gender
      : null;

  const existingEmail =
    await authRepository.findUserByEmail(email);

  if (existingEmail) {
    throw new Error(
      "Email already registered"
    );
  }

  const existingPhone =
    await authRepository.findUserByPhone(phone);

  if (existingPhone) {
    throw new Error(
      "Phone already registered"
    );
  }

  const hashedPassword =
    await bcrypt.hash(password, 10);

  const createdUser =
    await authRepository.createUser({
      full_name,
      email,
      phone,
      password: hashedPassword,
      gender: finalGender,
      role: Number(role),
    });

  /*
   * Add user_id to JWT.
   *
   * This will be required by KYC APIs
   * and publish-ride KYC validation.
   */
  const accessToken =
    generateAccessToken({
      id: createdUser.id,
      user_id: createdUser.user_id,
      email,
      role: Number(role),
    });

  return {
    user: {
      id: createdUser.id,
      user_id: createdUser.user_id,
      full_name,
      email,
      phone,
      gender: finalGender,
      role: Number(role),
    },

    accessToken,
  };
};

const login = async (payload) => {
  const {
    email,
    password,
  } = payload;

  if (!email || !password) {
    throw new Error(
      "Email and Password are required"
    );
  }

  const user =
    await authRepository.findUserByEmail(email);

  if (!user) {
    throw new Error(
      "Invalid email or password"
    );
  }

  const isMatch =
    await bcrypt.compare(
      password,
      user.password
    );

  if (!isMatch) {
    throw new Error(
      "Invalid email or password"
    );
  }

  /*
   * ===============================
   * CHECK KYC
   * ===============================
   */

  const kycRecord =
    await authRepository.findKycByUserId(
      user.user_id
    );

  /*
   * Only VERIFIED means KYC = Y.
   *
   * PENDING, REJECTED, or no KYC record
   * means KYC = N.
   */
  const kyc =
    kycRecord?.kyc_status === "VERIFIED"
      ? "Y"
      : "N";

  /*
   * ===============================
   * JWT
   * ===============================
   */

  const accessToken =
    generateAccessToken({
      id: user.id,
      user_id: user.user_id,
      email: user.email,
      role: user.role,
    });

  return {
    user: {
      id: user.id,
      user_id: user.user_id,
      full_name: user.full_name,
      email: user.email,
      phone: user.phone,
      gender: user.gender ?? null,
      role: user.role,

      /*
       * KYC FLAG
       */
      kyc,
    },

    accessToken,
  };
};

module.exports = {
  signup,
  login,
};