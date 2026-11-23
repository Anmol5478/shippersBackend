const service = require("./adminNotificationService");

exports.audienceCounts = async (_req, res) => {
  try {
    const counts = await service.getAudienceCounts();
    return res.status(200).json({ success: true, data: { counts } });
  } catch (error) {
    console.error("Admin notification audience counts:", error);
    return res.status(500).json({ success: false, message: "Unable to load audience counts" });
  }
};

exports.sendCampaign = async (req, res) => {
  try {
    const data = await service.sendCampaign({
      title: req.body?.title,
      message: req.body?.message,
      audience: req.body?.audience,
      notificationType: req.body?.notification_type,
      adminUserId: req.user?.user_id,
    });
    return res.status(201).json({ success: true, message: data.message, data });
  } catch (error) {
    console.error("Admin send notification campaign:", error);
    const status = /No eligible recipients/.test(error.message) ? 404 : 400;
    return res.status(status).json({ success: false, message: error.message || "Unable to send notification" });
  }
};

exports.listCampaigns = async (req, res) => {
  try {
    const data = await service.listCampaigns(req.query);

    return res.status(200).json({
      success: true,
      data
    });

  } catch (error) {
    console.error(
      "CAMPAIGN HISTORY DATABASE ERROR:",
      error
    );

    return res.status(500).json({
      success: false,
      message: "Unable to load notification campaigns",
      error: process.env.NODE_ENV === "development"
        ? error.message
        : undefined
    });
  }
};
