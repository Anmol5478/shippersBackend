const axios = require("axios");
const repo = require("./adminNotificationRepository");

const AUDIENCES = new Set(["all", "drivers", "customers", "enterprise"]);
const TYPES = new Set(["announcement", "promotion"]);

const getAudienceCounts = () => repo.getAudienceCounts();

const sendCampaign = async ({ title, message, audience, notificationType, adminUserId }) => {
  const cleanTitle = String(title || "").trim();
  const cleanMessage = String(message || "").trim();
  const cleanAudience = String(audience || "").toLowerCase();
  const cleanType = String(notificationType || "announcement").toLowerCase();

  if (cleanTitle.length < 3 || cleanTitle.length > 100) {
    throw new Error("Title must contain between 3 and 100 characters");
  }
  if (cleanMessage.length < 3 || cleanMessage.length > 1000) {
    throw new Error("Message must contain between 3 and 1000 characters");
  }
  if (!AUDIENCES.has(cleanAudience)) throw new Error("Invalid audience");
  if (!TYPES.has(cleanType)) throw new Error("notification_type must be announcement or promotion");

  const userIds = await repo.getAudienceUsers(cleanAudience);
  if (!userIds.length) throw new Error("No eligible recipients found for this audience");

  const campaignId = await repo.createCampaign({
    title: cleanTitle,
    message: cleanMessage,
    notificationType: cleanType,
    audience: cleanAudience,
    createdBy: adminUserId || null,
    recipientCount: userIds.length,
  });

  try {
    await repo.insertNotifications({
      campaignId,
      userIds,
      title: cleanTitle,
      message: cleanMessage,
      notificationType: cleanType,
    });

    const targets = await repo.getPushTargets({ userIds, notificationType: cleanType });
    let accepted = 0;
    let attempted = 0;

    const messages = targets.map((target) => ({
      to: target.expo_push_token,
      sound: "default",
      title: cleanTitle,
      body: cleanMessage,
      data: { screen: "Notifications", campaignId },
      priority: "high",
      channelId: "default",
    }));

    for (let i = 0; i < messages.length; i += 100) {
      const batch = messages.slice(i, i + 100);
      attempted += batch.length;
      try {
        const response = await axios.post(
          "https://exp.host/--/api/v2/push/send",
          batch,
          {
            headers: { "Content-Type": "application/json", Accept: "application/json" },
            timeout: 15000,
          }
        );
        const tickets = response.data?.data || [];
        accepted += tickets.filter((ticket) => ticket.status === "ok").length;
      } catch (error) {
        console.error("Admin campaign Expo batch failed:", error.response?.data || error.message);
      }
    }

    const status = attempted === 0 ? "IN_APP_ONLY"
      : accepted === attempted ? "SENT"
      : accepted > 0 ? "PARTIAL" : "IN_APP_ONLY";

    await repo.updateCampaignResult({
      campaignId,
      pushAttemptedCount: attempted,
      pushAcceptedCount: accepted,
      status,
    });

    return {
      campaign_id: campaignId,
      recipient_count: userIds.length,
      push_attempted_count: attempted,
      push_accepted_count: accepted,
      status,
      message: `Notification saved for ${userIds.length} recipients. Expo accepted ${accepted} of ${attempted} push messages.`,
    };
  } catch (error) {
    await repo.updateCampaignResult({
      campaignId,
      pushAttemptedCount: 0,
      pushAcceptedCount: 0,
      status: "FAILED",
    });
    throw error;
  }
};

const listCampaigns = async (query = {}) => {
  const page = Math.max(1, Number(query.page) || 1);
  const limit = Math.min(50, Math.max(1, Number(query.limit) || 10));
  return repo.listCampaigns({ page, limit });
};

module.exports = { getAudienceCounts, sendCampaign, listCampaigns };
