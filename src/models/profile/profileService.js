const profileRepository =
  require("./profileRepository");


/* ================================
   GET PROFILE
================================ */

const getProfile = async (user_id) => {
  const profile =
    await profileRepository.getUserProfile(
      user_id
    );

  if (!profile) {
    throw new Error("User not found");
  }

  const stats =
    await profileRepository.getProfileStats(
      user_id
    );

  return {
    profile,
    stats,
  };
};


/* ================================
   UPDATE PROFILE IMAGE
================================ */

const updateProfileImage = async (
  user_id,
  profile_image
) => {
  if (!profile_image) {
    throw new Error(
      "Profile image is required"
    );
  }

  return await profileRepository.updateProfileImage(
    user_id,
    profile_image
  );
};


module.exports = {
  getProfile,
  updateProfileImage,
};