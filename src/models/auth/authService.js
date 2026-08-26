const signup = async (payload) => {
  const {
    full_name,
    email,
    phone,
    password,
    gender,
    role,
  } = payload;

  // Validation
  if (!full_name || !email || !phone || !password || !role) {
    throw new Error("All fields are required");
  }

  const numericRole = Number(role);

  // Public signup can only create User or Driver
  const validRoles = [1, 2,3];

  if (!validRoles.includes(numericRole)) {
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
      role: numericRole,
    });

  // Generate JWT
  const accessToken = generateAccessToken({
    id: createdUser.id,
    email,
    role: numericRole,
  });

  return {
    user: {
      id: createdUser.id,
      user_id: createdUser.user_id,
      full_name,
      email,
      phone,
      gender: finalGender,
      role: numericRole,
    },

    accessToken,
  };
};