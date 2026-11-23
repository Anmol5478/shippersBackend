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
    const requestedUserId = req.body?.user_id || req.user?.user_id;
    const authenticatedUserId = req.user?.user_id;
    if (!authenticatedUserId) {
      return res.status(401).json({ responseCode: "01", success: false, message: "Authentication required" });
    }
    if (String(requestedUserId) !== String(authenticatedUserId)) {
      return res.status(403).json({ responseCode: "01", success: false, message: "You can only fetch your own profile" });
    }
    const user_id = authenticatedUserId;

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
    const user_id = req.body?.user_id || req.user?.user_id;

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