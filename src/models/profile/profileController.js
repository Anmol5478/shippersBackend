const profileService =
  require("./profileService");


/* ================================
   GET PROFILE
================================ */

exports.getProfile = async (
  req,
  res
) => {
  try {
    const { user_id } =
      req.params;

    const data =
      await profileService.getProfile(
        user_id
      );

    return res.status(200).json({
      responseCode: "00",
      success: true,
      message:
        "Profile fetched successfully",
      data,
    });

  } catch (error) {

    return res.status(404).json({
      responseCode: "01",
      success: false,
      message: error.message,
    });

  }
};


/* ================================
   UPDATE PROFILE IMAGE
================================ */

exports.updateProfileImage = async (
  req,
  res
) => {
  try {
    const { user_id } =
      req.params;

    const { profile_image } =
      req.body;

    const data =
      await profileService.updateProfileImage(
        user_id,
        profile_image
      );

    return res.status(200).json({
      responseCode: "00",
      success: true,
      message:
        "Profile image updated successfully",
      data,
    });

  } catch (error) {

    return res.status(400).json({
      responseCode: "01",
      success: false,
      message: error.message,
    });

  }
};