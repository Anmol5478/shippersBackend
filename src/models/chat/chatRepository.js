const db = require("../../config/db");

/**
 * Build a stable conversation key from two user_ids (sorted).
 */
const buildConversationKey = (userA, userB) => {
  return [String(userA), String(userB)].sort().join("_");
};

const getUserBasic = async (userId) => {
  const [rows] = await db.execute(
    `
      SELECT
        id,
        user_id,
        full_name,
        phone,
        role,
        profile_image
      FROM users
      WHERE user_id = ?
      LIMIT 1
    `,
    [userId]
  );
  return rows[0] || null;
};

const findConversationByKey = async (conversationKey) => {
  const [rows] = await db.execute(
    `
      SELECT *
      FROM conversations
      WHERE conversation_key = ?
      LIMIT 1
    `,
    [conversationKey]
  );
  return rows[0] || null;
};

const findConversationById = async (conversationId) => {
  const [rows] = await db.execute(
    `
      SELECT *
      FROM conversations
      WHERE id = ?
      LIMIT 1
    `,
    [conversationId]
  );
  return rows[0] || null;
};

/**
 * Get or create a 1:1 conversation between two users.
 */
const getOrCreateConversation = async ({
  userA,
  userB,
  bookingReference = null,
  rideId = null,
  routeLabel = null,
}) => {
  const conversationKey = buildConversationKey(userA, userB);
  const existing = await findConversationByKey(conversationKey);

  if (existing) {
    // Optionally refresh booking/route metadata if provided
    if (bookingReference || rideId || routeLabel) {
      await db.execute(
        `
          UPDATE conversations
          SET
            booking_reference = COALESCE(?, booking_reference),
            ride_id = COALESCE(?, ride_id),
            route_label = COALESCE(?, route_label)
          WHERE id = ?
        `,
        [bookingReference, rideId, routeLabel, existing.id]
      );
      return findConversationById(existing.id);
    }
    return existing;
  }

  const [sortedA, sortedB] = [String(userA), String(userB)].sort();

  const connection = await db.getConnection();
  try {
    await connection.beginTransaction();

    const [result] = await connection.execute(
      `
        INSERT INTO conversations
          (conversation_key, participant_one_id, participant_two_id, booking_reference, ride_id, route_label)
        VALUES (?, ?, ?, ?, ?, ?)
      `,
      [conversationKey, sortedA, sortedB, bookingReference, rideId, routeLabel]
    );

    const conversationId = result.insertId;

    await connection.execute(
      `
        INSERT INTO conversation_participants (conversation_id, user_id)
        VALUES (?, ?), (?, ?)
      `,
      [conversationId, sortedA, conversationId, sortedB]
    );

    await connection.commit();
    return findConversationById(conversationId);
  } catch (err) {
    await connection.rollback();
    // Race: another request created it
    if (err.code === "ER_DUP_ENTRY") {
      return findConversationByKey(conversationKey);
    }
    throw err;
  } finally {
    connection.release();
  }
};

/**
 * List conversations for a user with peer info + last message preview.
 */
const listConversationsForUser = async (userId) => {
  const [rows] = await db.execute(
    `
      SELECT
        c.id,
        c.conversation_key,
        c.participant_one_id,
        c.participant_two_id,
        c.booking_reference,
        c.ride_id,
        c.route_label,
        c.last_message_at,
        c.created_at,
        cp.unread_count,
        cp.is_muted,
        cp.is_archived,
        m.id AS last_message_id,
        m.body AS last_message_body,
        m.message_type AS last_message_type,
        m.sender_id AS last_message_sender_id,
        m.status AS last_message_status,
        peer.user_id AS peer_user_id,
        peer.full_name AS peer_name,
        peer.role AS peer_role,
        peer.profile_image AS peer_avatar
      FROM conversation_participants cp
      INNER JOIN conversations c ON c.id = cp.conversation_id
      LEFT JOIN messages m ON m.id = c.last_message_id
      LEFT JOIN users peer ON peer.user_id = IF(
        c.participant_one_id = ?,
        c.participant_two_id,
        c.participant_one_id
      )
      WHERE cp.user_id = ?
        AND cp.is_archived = 0
      ORDER BY COALESCE(c.last_message_at, c.created_at) DESC
    `,
    [userId, userId]
  );

  return rows;
};

/**
 * Messages for a conversation (newest last for UI).
 */
const getMessages = async (conversationId, { limit = 50, beforeId = null } = {}) => {
  const params = [conversationId];
  let sql = `
    SELECT
      id,
      conversation_id,
      sender_id,
      message_type,
      body,
      status,
      call_status,
      call_duration_sec,
      created_at
    FROM messages
    WHERE conversation_id = ?
  `;

  if (beforeId) {
    sql += ` AND id < ?`;
    params.push(beforeId);
  }

  sql += ` ORDER BY id DESC LIMIT ?`;
  params.push(Number(limit));

  const [rows] = await db.execute(sql, params);
  return rows.reverse();
};

/**
 * Insert a message and update conversation + unread counters.
 */
const createMessage = async ({
  conversationId,
  senderId,
  body,
  messageType = "text",
  status = "sent",
  callStatus = null,
  callDurationSec = null,
}) => {
  const connection = await db.getConnection();
  try {
    await connection.beginTransaction();

    const [result] = await connection.execute(
      `
        INSERT INTO messages
          (conversation_id, sender_id, message_type, body, status, call_status, call_duration_sec)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `,
      [
        conversationId,
        senderId,
        messageType,
        body,
        status,
        callStatus,
        callDurationSec,
      ]
    );

    const messageId = result.insertId;

    await connection.execute(
      `
        UPDATE conversations
        SET last_message_id = ?, last_message_at = NOW()
        WHERE id = ?
      `,
      [messageId, conversationId]
    );

    // Increment unread for the other participant(s)
    await connection.execute(
      `
        UPDATE conversation_participants
        SET unread_count = unread_count + 1
        WHERE conversation_id = ?
          AND user_id <> ?
      `,
      [conversationId, senderId]
    );

    await connection.commit();

    const [rows] = await db.execute(
      `SELECT * FROM messages WHERE id = ? LIMIT 1`,
      [messageId]
    );
    return rows[0];
  } catch (err) {
    await connection.rollback();
    throw err;
  } finally {
    connection.release();
  }
};

/**
 * Mark messages as read for a user in a conversation.
 */
const markConversationRead = async (conversationId, userId, upToMessageId = null) => {
  await db.execute(
    `
      UPDATE conversation_participants
      SET
        unread_count = 0,
        last_read_message_id = COALESCE(?, last_read_message_id)
      WHERE conversation_id = ?
        AND user_id = ?
    `,
    [upToMessageId, conversationId, userId]
  );

  // Mark peer messages as read
  await db.execute(
    `
      UPDATE messages
      SET status = 'read'
      WHERE conversation_id = ?
        AND sender_id <> ?
        AND status IN ('sent', 'delivered')
        ${upToMessageId ? "AND id <= ?" : ""}
    `,
    upToMessageId
      ? [conversationId, userId, upToMessageId]
      : [conversationId, userId]
  );
};

/**
 * Ensure user is a participant of the conversation.
 */
const isParticipant = async (conversationId, userId) => {
  const [rows] = await db.execute(
    `
      SELECT id
      FROM conversation_participants
      WHERE conversation_id = ?
        AND user_id = ?
      LIMIT 1
    `,
    [conversationId, userId]
  );
  return rows.length > 0;
};

const createCallLog = async ({
  conversationId,
  callerId,
  calleeId,
  callType = "audio",
  status = "ringing",
}) => {
  const [result] = await db.execute(
    `
      INSERT INTO call_logs
        (conversation_id, caller_id, callee_id, call_type, status, started_at)
      VALUES (?, ?, ?, ?, ?, NOW())
    `,
    [conversationId, callerId, calleeId, callType, status]
  );
  return result.insertId;
};

const updateCallLog = async (callLogId, { status, durationSec = null }) => {
  await db.execute(
    `
      UPDATE call_logs
      SET
        status = ?,
        duration_sec = COALESCE(?, duration_sec),
        ended_at = CASE
          WHEN ? IN ('ended', 'missed', 'rejected', 'cancelled') THEN NOW()
          ELSE ended_at
        END
      WHERE id = ?
    `,
    [status, durationSec, status, callLogId]
  );
};

module.exports = {
  buildConversationKey,
  getUserBasic,
  findConversationByKey,
  findConversationById,
  getOrCreateConversation,
  listConversationsForUser,
  getMessages,
  createMessage,
  markConversationRead,
  isParticipant,
  createCallLog,
  updateCallLog,
};
