const bcrypt = require("bcrypt");
const authRepository = require("./authRepository");
const { generateAccessToken } = require("../../utils/jwt");

const signup = async (payload) => {
const {
  full_name,
  email,
  phone,
  password,
  gender ,
  role = 2,
} = payload;

  // Validation
  if (!full_name || !email || !phone || !password ) {
  throw new Error("All fields are required");
}

  // Check if user already exists
const existingEmail = await authRepository.findUserByEmail(email);

if (existingEmail) {
  throw new Error("Email already registered");
}

const existingPhone = await authRepository.findUserByPhone(phone);

if (existingPhone) {
  throw new Error("Phone already registered");
}

  // Hash Password
  const hashedPassword = await bcrypt.hash(password, 10);

  // Save User
  const userId = await authRepository.createUser({
  full_name,
  email,
  phone,
  password: hashedPassword,
  gender : gender ?? "",
  role,
});
  // Generate JWT
  const accessToken = generateAccessToken({
    id: userId,
    email,
    role,
  });

  return {
    user: {
  id: userId,
  full_name,
  email,
  phone,
  gender : gender ?? null,
  role,
},
    accessToken,
  };
};

const login = async (payload) => {
  const { email, password } = payload;

  if (!email || !password) {
    throw new Error("Email and Password are required");
  }

  // Find user
  const user = await authRepository.findUserByEmail(email);

  if (!user) {
    throw new Error("Invalid email or password");
  }

  // Compare password
  const isMatch = await bcrypt.compare(password, user.password);

  if (!isMatch) {
    throw new Error("Invalid email or password");
  }

  // Generate JWT
  const accessToken = generateAccessToken({
    id: user.id,
    email: user.email,
    role: user.role,
  });

  return {
    user: {
      id: user.id,
      full_name: user.full_name,
      email: user.email,
      phone: user.phone,
      gender: user.gender || null,
      role: user.role,
    },
    accessToken,
  };
};

module.exports = {
  signup,
  login,
};