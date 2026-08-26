const bcrypt = require("bcrypt");

const authRepository = require("./authRepository");

const { generateAccessToken } = require("../../utils/jwt");


const signup = async (payload) => {

  const {
    full_name,
    email,
    phone,
    password,
    gender,
    role = 2,
  } = payload;


  // Validation
  if (!full_name || !email || !phone || !password) {
    throw new Error("All fields are required");
  }


  // Validate role
  const validRoles = [1, 2, 3];

  if (!validRoles.includes(Number(role))) {
    throw new Error("Invalid role");
  }


  // Validate gender
  const validGenders = [
    "Male",
    "Female",
    "Other",
  ];

  const finalGender = validGenders.includes(gender)
    ? gender
    : null;


  // Check email
  const existingEmail =
    await authRepository.findUserByEmail(email);

  if (existingEmail) {
    throw new Error("Email already registered");
  }


  // Check phone
  const existingPhone =
    await authRepository.findUserByPhone(phone);

  if (existingPhone) {
    throw new Error("Phone already registered");
  }


  // Hash password
  const hashedPassword = await bcrypt.hash(
    password,
    10
  );


  // Create user
  const createdUser =
    await authRepository.createUser({
      full_name,
      email,
      phone,
      password: hashedPassword,
      gender: finalGender,
      role: Number(role),
    });


  // Generate JWT
  const accessToken = generateAccessToken({
    id: createdUser.id,
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

  const { email, password } = payload;

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


  const isMatch = await bcrypt.compare(
    password,
    user.password
  );


  if (!isMatch) {
    throw new Error(
      "Invalid email or password"
    );
  }


  const accessToken = generateAccessToken({
    id: user.id,
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
    },

    accessToken,
  };
};


module.exports = {
  signup,
  login,
};