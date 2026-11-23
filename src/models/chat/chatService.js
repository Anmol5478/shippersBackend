const chatRepository = require("./chatRepository");

const roleLabel = (role) => {
  const r = Number(role);
  if (r === 1) return "driver";
  if (r === 2) return "sender";
  if (r === 3) return "admin";
  return "user";
};

const mapConversationRow = (row, currentUserId) => {
  const peerRole = roleLabel(row.peer_role);
  return {
    id: String(row.id),
    peerId: row.peer_user_id,
    peerName: row.peer_name || "User",
    peerAvatar: row.peer_avatar || null,
    peerRole,
    lastMessage: row.last_message_body || "",
    lastMessageAt: row.last_message_at
      ? new Date(row.last_message_at).toISOString()
      : row.created_at
        ? new Date(row.created_at).toISOString()
        : null,
    unreadCount: Number(row.unread_count || 0),
    online: false, // filled by socket presence layer if available
    bookingRef: row.booking_reference || null,
    routeLabel: row.route_label || null,
    isMuted: Boolean(row.is_muted),
  };
};

const mapMessageRow = (row) => ({
  id: String(row.id),
  conversationId: String(row.conversation_id),
  text: row.body,
  senderId: row.sender_id,
  messageType: row.message_type,
  status: row.status,
  callStatus: row.call_status,
  callDurationSec: row.call_duration_sec,
  createdAt: new Date(row.created_at).toISOString(),
});

/**
 * List conversations for the authenticated user.
 */
const listConversations = async (userId) => {
  const rows = await chatRepository.listConversationsForUser(userId);
  return rows.map((r) => mapConversationRow(r, userId));
};

/**
 * Open / create conversation with peer (optionally tied to a booking).
 */
const openConversation = async (currentUserId, payload) => {
  const { peerUserId, bookingReference, rideId, routeLabel } = payload || {};

  if (!peerUserId) {
    throw new Error("peerUserId is required");
  }

  if (String(peerUserId) === String(currentUserId)) {
    throw new Error("Cannot start a chat with yourself");
  }

  const peer = await chatRepository.getUserBasic(peerUserId);
  if (!peer) {
    throw new Error("Peer user not found");
  }

  const conversation = await chatRepository.getOrCreateConversation({
    userA: currentUserId,
    userB: peerUserId,
    bookingReference: bookingReference || null,
    rideId: rideId || null,
    routeLabel: routeLabel || null,
  });

  const messages = await chatRepository.getMessages(conversation.id, {
    limit: 50,
  });

  return {
    conversation: {
      id: String(conversation.id),
      peerId: peer.user_id,
      peerName: peer.full_name || "User",
      peerAvatar: peer.profile_image || null,
      peerRole: roleLabel(peer.role),
      bookingRef: conversation.booking_reference || null,
      routeLabel: conversation.route_label || null,
      lastMessageAt: conversation.last_message_at
        ? new Date(conversation.last_message_at).toISOString()
        : null,
    },
    messages: messages.map(mapMessageRow),
  };
};

/**
 * Fetch messages for a conversation (paginated).
 */
const getConversationMessages = async (currentUserId, conversationId, query) => {
  const allowed = await chatRepository.isParticipant(conversationId, currentUserId);
  if (!allowed) {
    throw new Error("Not a participant of this conversation");
  }

  const limit = Math.min(Number(query?.limit) || 50, 100);
  const beforeId = query?.beforeId ? Number(query.beforeId) : null;

  const rows = await chatRepository.getMessages(conversationId, {
    limit,
    beforeId,
  });

  return rows.map(mapMessageRow);
};

/**
 * Send a text message (REST fallback; primary path is WebSocket).
 */
const sendMessage = async (currentUserId, conversationId, body) => {
  const text = String(body?.text || "").trim();
  if (!text) {
    throw new Error("Message text is required");
  }

  const allowed = await chatRepository.isParticipant(conversationId, currentUserId);
  if (!allowed) {
    throw new Error("Not a participant of this conversation");
  }

  const message = await chatRepository.createMessage({
    conversationId,
    senderId: currentUserId,
    body: text,
    messageType: "text",
    status: "sent",
  });

  return mapMessageRow(message);
};

/**
 * Mark conversation as read.
 */
const markRead = async (currentUserId, conversationId, upToMessageId) => {
  const allowed = await chatRepository.isParticipant(conversationId, currentUserId);
  if (!allowed) {
    throw new Error("Not a participant of this conversation");
  }

  await chatRepository.markConversationRead(
    conversationId,
    currentUserId,
    upToMessageId || null
  );

  return { success: true };
};

/**
 * Create a system / call message (used by socket layer).
 */
const createCallMessage = async ({
  conversationId,
  senderId,
  body,
  callStatus,
  callDurationSec,
}) => {
  const message = await chatRepository.createMessage({
    conversationId,
    senderId,
    body,
    messageType: "call",
    status: "sent",
    callStatus,
    callDurationSec,
  });
  return mapMessageRow(message);
};

module.exports = {
  listConversations,
  openConversation,
  getConversationMessages,
  sendMessage,
  markRead,
  createCallMessage,
  mapMessageRow,
  mapConversationRow,
};
