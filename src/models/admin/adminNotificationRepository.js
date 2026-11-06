const db = require("../../config/db");

const getAudienceUsers = async (audience) => {
  let sql = `
    SELECT DISTINCT u.user_id
    FROM users u
  `;
  const conditions = ["COALESCE(u.is_blocked, 0) = 0", "u.user_id IS NOT NULL"];

  if (audience === "all") conditions.push("u.role IN (1, 2)");
  else if (audience === "drivers") conditions.push("u.role = 1");
  else if (audience === "customers") {
    conditions.push("u.role = 2");
    conditions.push("NOT EXISTS (SELECT 1 FROM enterprise_profiles epx WHERE epx.user_id = u.user_id)");
  } else if (audience === "enterprise") {
    sql += " INNER JOIN enterprise_profiles ep ON ep.user_id = u.user_id ";
  } else {
    throw new Error("Invalid notification audience");
  }

  sql += ` WHERE ${conditions.join(" AND ")} ORDER BY u.user_id`;
  const [rows] = await db.execute(sql);
  return rows.map((row) => row.user_id);
};

const getAudienceCounts = async () => {
  const [rows] = await db.execute(`
    SELECT
      COUNT(DISTINCT CASE WHEN COALESCE(u.is_blocked, 0) = 0 AND u.role IN (1, 2) THEN u.user_id END) AS all_count,
      COUNT(DISTINCT CASE WHEN COALESCE(u.is_blocked, 0) = 0 AND u.role = 1 THEN u.user_id END) AS drivers_count,
      COUNT(DISTINCT CASE WHEN COALESCE(u.is_blocked, 0) = 0 AND u.role = 2 AND ep.user_id IS NULL THEN u.user_id END) AS customers_count,
      COUNT(DISTINCT CASE WHEN COALESCE(u.is_blocked, 0) = 0 AND ep.user_id IS NOT NULL THEN u.user_id END) AS enterprise_count
    FROM users u
    LEFT JOIN enterprise_profiles ep ON ep.user_id = u.user_id
  `);
  const row = rows[0] || {};
  return {
    all: Number(row.all_count || 0),
    drivers: Number(row.drivers_count || 0),
    customers: Number(row.customers_count || 0),
    enterprise: Number(row.enterprise_count || 0),
  };
};

const createCampaign = async ({ title, message, notificationType, audience, createdBy, recipientCount }) => {
  const [result] = await db.execute(`
    INSERT INTO admin_notification_campaigns
      (title, message, notification_type, audience, created_by, recipient_count, push_attempted_count, push_accepted_count, status)
    VALUES (?, ?, ?, ?, ?, ?, 0, 0, 'PROCESSING')
  `, [title, message, notificationType, audience, createdBy, recipientCount]);
  return result.insertId;
};

const insertNotifications = async ({ campaignId, userIds, title, message, notificationType }) => {
  if (!userIds.length) return 0;
  let inserted = 0;
  for (let i = 0; i < userIds.length; i += 500) {
    const batch = userIds.slice(i, i + 500);
    const values = [];
    const placeholders = batch.map((userId) => {
      values.push(
        userId, title, message, notificationType,
        "admin_campaign", String(campaignId),
        JSON.stringify({ screen: "Notifications", campaignId })
      );
      return "(?, ?, ?, ?, ?, ?, ?)";
    }).join(",");
    const [result] = await db.execute(`
      INSERT INTO notifications
        (user_id, title, message, notification_type, reference_type, reference_id, data)
      VALUES ${placeholders}
    `, values);
    inserted += result.affectedRows || batch.length;
  }
  return inserted;
};

const getPushTargets = async ({ userIds, notificationType }) => {
  if (!userIds.length) return [];
  const preferenceColumn = notificationType === "promotion"
    ? "promotional_notifications"
    : null;

  const targets = [];
  for (let i = 0; i < userIds.length; i += 500) {
    const batch = userIds.slice(i, i + 500);
    const placeholders = batch.map(() => "?").join(",");
    const preferenceCondition = preferenceColumn
      ? ` AND COALESCE(np.${preferenceColumn}, 0) = 1`
      : "";
    const [rows] = await db.execute(`
      SELECT ud.expo_push_token
      FROM user_devices ud
      LEFT JOIN notification_preferences np ON np.user_id = ud.user_id
      WHERE ud.user_id IN (${placeholders})
        AND ud.is_active = 1
        AND COALESCE(np.push_enabled, 1) = 1
        ${preferenceCondition}
    `, batch);
    targets.push(...rows);
  }
  return targets;
};

const updateCampaignResult = async ({ campaignId, pushAttemptedCount, pushAcceptedCount, status }) => {
  await db.execute(`
    UPDATE admin_notification_campaigns
    SET push_attempted_count = ?, push_accepted_count = ?, status = ?, completed_at = NOW()
    WHERE id = ?
  `, [pushAttemptedCount, pushAcceptedCount, status, campaignId]);
};


const listCampaigns = async ({ page, limit }) => {
  const offset = (page - 1) * limit;

  // Get total campaign count
  const [countRows] = await db.execute(
    `SELECT COUNT(*) AS total
     FROM admin_notification_campaigns`
  );

  // Get campaign history
  const [rows] = await db.execute(
    `SELECT
        id,
        title,
        message,
        notification_type,
        audience,
        created_by,
        recipient_count,
        push_attempted_count,
        push_accepted_count,
        status,
        created_at,
        completed_at
     FROM admin_notification_campaigns
     ORDER BY id DESC
     LIMIT ? OFFSET ?`,
    [Number(limit), Number(offset)]
  );

  return {
    campaigns: rows,
    total: Number(countRows[0]?.total || 0),
    page: Number(page),
    limit: Number(limit)
  };
};


module.exports = {
  getAudienceUsers, getAudienceCounts, createCampaign,
  insertNotifications, getPushTargets, updateCampaignResult, listCampaigns
};
