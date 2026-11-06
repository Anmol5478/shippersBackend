const db = require("../../config/db");

exports.registerDevice = async ({ userId, token, type, name }) => {
  await db.execute(`INSERT INTO user_devices
    (user_id, expo_push_token, device_type, device_name, is_active, last_seen_at)
    VALUES (?, ?, ?, ?, 1, NOW())
    ON DUPLICATE KEY UPDATE user_id=VALUES(user_id), device_type=VALUES(device_type),
    device_name=VALUES(device_name), is_active=1, last_seen_at=NOW()`,
    [userId, token, type, name || null]);
  const [rows] = await db.execute("SELECT id FROM user_devices WHERE expo_push_token=?", [token]);
  return rows[0];
};
exports.deactivateDevice = async (userId, id) => {
  const [r] = await db.execute("UPDATE user_devices SET is_active=0 WHERE user_id=? AND id=?", [userId,id]);
  return r.affectedRows > 0;
};
exports.deactivateToken = async (userId, token) => {
  const [r] = await db.execute("UPDATE user_devices SET is_active=0 WHERE user_id=? AND expo_push_token=?", [userId,token]);
  return r.affectedRows > 0;
};
exports.devices = async (userId) => {
  const [r] = await db.execute("SELECT expo_push_token FROM user_devices WHERE user_id=? AND is_active=1", [userId]);
  return r;
};
exports.create = async (n) => {
  const [r] = await db.execute(`INSERT INTO notifications
    (user_id,title,message,notification_type,reference_type,reference_id,data)
    VALUES (?,?,?,?,?,?,?)`,
    [n.userId,n.title,n.message,n.type,n.referenceType || null,
     n.referenceId == null ? null : String(n.referenceId),
     n.data == null ? null : JSON.stringify(n.data)]);
  return r.insertId;
};
exports.preferences = async (userId) => {
  await db.execute("INSERT IGNORE INTO notification_preferences (user_id) VALUES (?)",[userId]);
  const [r] = await db.execute("SELECT * FROM notification_preferences WHERE user_id=? LIMIT 1",[userId]);
  return r[0];
};
exports.updatePreferences = async (userId, body) => {
  const allowed=["push_enabled","ride_notifications","booking_notifications","parcel_notifications","payment_notifications","chat_notifications","promotional_notifications"];
  const keys=allowed.filter(k=>Object.prototype.hasOwnProperty.call(body,k));
  if (!keys.length) return exports.preferences(userId);
  const vals=keys.map(k => body[k] ? 1 : 0);
  await db.execute(`INSERT INTO notification_preferences (user_id) VALUES (?)
    ON DUPLICATE KEY UPDATE ${keys.map(k=>`${k}=?`).join(",")}`,[userId,...vals]);
  return exports.preferences(userId);
};
exports.list = async (userId, limit, offset) => {
  const safeLimit = Math.min(100, Math.max(1, parseInt(limit, 10) || 20));
  const safeOffset = Math.max(0, parseInt(offset, 10) || 0);

  const [r] = await db.query(
    `SELECT
        id,
        title,
        message,
        notification_type,
        reference_type,
        reference_id,
        data,
        is_read,
        read_at,
        created_at
     FROM notifications
     WHERE user_id = ?
     ORDER BY created_at DESC, id DESC
     LIMIT ${safeLimit} OFFSET ${safeOffset}`,
    [userId]
  );

  return r.map(x => ({
    ...x,
    data: typeof x.data === "string"
      ? (() => {
          try {
            return JSON.parse(x.data);
          } catch {
            return null;
          }
        })()
      : x.data
  }));
};
exports.unread = async (userId) => {
  const [r]=await db.execute("SELECT COUNT(*) AS count FROM notifications WHERE user_id=? AND is_read=0",[userId]);
  return Number(r[0].count);
};
exports.markRead = async (userId,id) => {
  const [r]=await db.execute("UPDATE notifications SET is_read=1,read_at=COALESCE(read_at,NOW()) WHERE user_id=? AND id=?",[userId,id]);
  return r.affectedRows>0;
};
exports.markAllRead = async (userId) => {
  const [r]=await db.execute("UPDATE notifications SET is_read=1,read_at=COALESCE(read_at,NOW()) WHERE user_id=? AND is_read=0",[userId]);
  return r.affectedRows;
};
