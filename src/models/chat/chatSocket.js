const jwt = require("jsonwebtoken");
const chatRepository = require("./chatRepository");
const chatService = require("./chatService");

/**
 * In-memory presence: userId -> Set of socket ids
 */
const onlineUsers = new Map();

const addOnline = (userId, socketId) => {
  if (!onlineUsers.has(userId)) {
    onlineUsers.set(userId, new Set());
  }
  onlineUsers.get(userId).add(socketId);
};

const removeOnline = (userId, socketId) => {
  const set = onlineUsers.get(userId);
  if (!set) return;
  set.delete(socketId);
  if (set.size === 0) {
    onlineUsers.delete(userId);
  }
};

const isOnline = (userId) => onlineUsers.has(String(userId));

/**
 * Attach Socket.IO handlers for chat + call signaling.
 * @param {import('socket.io').Server} io
 */
const registerChatSockets = (io) => {
  // Auth middleware for sockets
  io.use((socket, next) => {
    try {
      const token =
        socket.handshake.auth?.token ||
        socket.handshake.headers?.authorization?.replace("Bearer ", "");

      if (!token) {
        return next(new Error("Authentication required"));
      }

      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      socket.user = decoded;
      socket.userId = decoded.user_id || String(decoded.id);
      next();
    } catch (err) {
      next(new Error("Invalid or expired token"));
    }
  });

  io.on("connection", (socket) => {
    const userId = socket.userId;
    console.log(`[socket] connected user=${userId} sid=${socket.id}`);

    // Join personal room
    socket.join(`user:${userId}`);
    addOnline(userId, socket.id);

    // Broadcast online status to contacts (best-effort)
    socket.broadcast.emit("presence:update", { userId, online: true });

    /**
     * Join a conversation room for live messages.
     */
    socket.on("conversation:join", async (payload, ack) => {
      try {
        const conversationId = String(payload?.conversationId || "");
        if (!conversationId) {
          ack?.({ success: false, message: "conversationId required" });
          return;
        }

        const allowed = await chatRepository.isParticipant(
          conversationId,
          userId
        );
        if (!allowed) {
          ack?.({ success: false, message: "Not a participant" });
          return;
        }

        socket.join(`conversation:${conversationId}`);
        ack?.({ success: true });
      } catch (err) {
        ack?.({ success: false, message: err.message });
      }
    });

    socket.on("conversation:leave", (payload) => {
      const conversationId = String(payload?.conversationId || "");
      if (conversationId) {
        socket.leave(`conversation:${conversationId}`);
      }
    });

    /**
     * Send a chat message in real time.
     * payload: { conversationId, text }
     */
    socket.on("message:send", async (payload, ack) => {
      try {
        const conversationId = String(payload?.conversationId || "");
        const text = String(payload?.text || "").trim();

        if (!conversationId || !text) {
          ack?.({ success: false, message: "conversationId and text required" });
          return;
        }

        const allowed = await chatRepository.isParticipant(
          conversationId,
          userId
        );
        if (!allowed) {
          ack?.({ success: false, message: "Not a participant" });
          return;
        }

        const message = await chatRepository.createMessage({
          conversationId,
          senderId: userId,
          body: text,
          messageType: "text",
          status: "sent",
        });

        const mapped = chatService.mapMessageRow(message);

        // Emit to everyone in the conversation room (including sender for multi-device)
        io.to(`conversation:${conversationId}`).emit("message:new", mapped);

        // Also push conversation list update to both participants
        const conv = await chatRepository.findConversationById(conversationId);
        if (conv) {
          const peerId =
            conv.participant_one_id === userId
              ? conv.participant_two_id
              : conv.participant_one_id;

          const listUpdate = {
            conversationId: String(conversationId),
            lastMessage: mapped.text,
            lastMessageAt: mapped.createdAt,
            senderId: userId,
          };

          io.to(`user:${userId}`).emit("conversation:updated", listUpdate);
          io.to(`user:${peerId}`).emit("conversation:updated", {
            ...listUpdate,
            // peer should bump unread if not in room — client handles
          });
        }

        ack?.({ success: true, data: mapped });
      } catch (err) {
        console.error("[socket] message:send error", err);
        ack?.({ success: false, message: err.message });
      }
    });

    /**
     * Typing indicator
     */
    socket.on("typing:start", (payload) => {
      const conversationId = String(payload?.conversationId || "");
      if (!conversationId) return;
      socket.to(`conversation:${conversationId}`).emit("typing:start", {
        conversationId,
        userId,
      });
    });

    socket.on("typing:stop", (payload) => {
      const conversationId = String(payload?.conversationId || "");
      if (!conversationId) return;
      socket.to(`conversation:${conversationId}`).emit("typing:stop", {
        conversationId,
        userId,
      });
    });

    /**
     * Mark read
     */
    socket.on("message:read", async (payload, ack) => {
      try {
        const conversationId = String(payload?.conversationId || "");
        const upToMessageId = payload?.upToMessageId || null;
        if (!conversationId) {
          ack?.({ success: false, message: "conversationId required" });
          return;
        }

        await chatService.markRead(userId, conversationId, upToMessageId);

        socket.to(`conversation:${conversationId}`).emit("message:read", {
          conversationId,
          readerId: userId,
          upToMessageId,
        });

        ack?.({ success: true });
      } catch (err) {
        ack?.({ success: false, message: err.message });
      }
    });

    // ========== CALL SIGNALING ==========

    /**
     * Initiate a call
     * payload: { conversationId, callType: 'audio'|'video', calleeId }
     */
    socket.on("call:initiate", async (payload, ack) => {
      try {
        const conversationId = String(payload?.conversationId || "");
        const callType = payload?.callType === "video" ? "video" : "audio";
        let calleeId = payload?.calleeId;

        if (!conversationId) {
          ack?.({ success: false, message: "conversationId required" });
          return;
        }

        const allowed = await chatRepository.isParticipant(
          conversationId,
          userId
        );
        if (!allowed) {
          ack?.({ success: false, message: "Not a participant" });
          return;
        }

        const conv = await chatRepository.findConversationById(conversationId);
        if (!calleeId) {
          calleeId =
            conv.participant_one_id === userId
              ? conv.participant_two_id
              : conv.participant_one_id;
        }

        if (!isOnline(calleeId)) {
          // Create missed call message
          const msg = await chatService.createCallMessage({
            conversationId,
            senderId: userId,
            body: `${callType === "video" ? "Video" : "Audio"} call`,
            callStatus: "missed",
            callDurationSec: 0,
          });
          io.to(`conversation:${conversationId}`).emit("message:new", msg);
          ack?.({ success: false, message: "User is offline", code: "OFFLINE" });
          return;
        }

        const callLogId = await chatRepository.createCallLog({
          conversationId,
          callerId: userId,
          calleeId,
          callType,
          status: "ringing",
        });

        const callPayload = {
          callId: String(callLogId),
          conversationId: String(conversationId),
          callerId: userId,
          calleeId,
          callType,
        };

        // Notify callee
        io.to(`user:${calleeId}`).emit("call:incoming", callPayload);
        // Confirm to caller
        socket.emit("call:ringing", callPayload);

        ack?.({ success: true, data: callPayload });
      } catch (err) {
        console.error("[socket] call:initiate", err);
        ack?.({ success: false, message: err.message });
      }
    });

    /**
     * Accept call
     */
    socket.on("call:accept", async (payload, ack) => {
      try {
        const { callId, conversationId, callerId } = payload || {};
        if (!callId || !callerId) {
          ack?.({ success: false, message: "callId and callerId required" });
          return;
        }

        await chatRepository.updateCallLog(callId, { status: "answered" });

        io.to(`user:${callerId}`).emit("call:accepted", {
          callId: String(callId),
          conversationId: String(conversationId),
          calleeId: userId,
        });

        ack?.({ success: true });
      } catch (err) {
        ack?.({ success: false, message: err.message });
      }
    });

    /**
     * Reject call
     */
    socket.on("call:reject", async (payload, ack) => {
      try {
        const { callId, conversationId, callerId, callType } = payload || {};
        if (callId) {
          await chatRepository.updateCallLog(callId, { status: "rejected" });
        }

        if (conversationId) {
          const msg = await chatService.createCallMessage({
            conversationId,
            senderId: userId,
            body: `${callType === "video" ? "Video" : "Audio"} call`,
            callStatus: "rejected",
            callDurationSec: 0,
          });
          io.to(`conversation:${conversationId}`).emit("message:new", msg);
        }

        if (callerId) {
          io.to(`user:${callerId}`).emit("call:rejected", {
            callId: String(callId),
            conversationId: String(conversationId),
            calleeId: userId,
          });
        }

        ack?.({ success: true });
      } catch (err) {
        ack?.({ success: false, message: err.message });
      }
    });

    /**
     * End / cancel call
     */
    socket.on("call:end", async (payload, ack) => {
      try {
        const {
          callId,
          conversationId,
          peerId,
          callType,
          durationSec = 0,
          wasAnswered = false,
        } = payload || {};

        const status = wasAnswered
          ? "ended"
          : durationSec > 0
            ? "ended"
            : "cancelled";

        if (callId) {
          await chatRepository.updateCallLog(callId, {
            status,
            durationSec: Number(durationSec) || 0,
          });
        }

        if (conversationId) {
          const msg = await chatService.createCallMessage({
            conversationId,
            senderId: userId,
            body: `${callType === "video" ? "Video" : "Audio"} call`,
            callStatus: wasAnswered ? "answered" : "cancelled",
            callDurationSec: Number(durationSec) || 0,
          });
          io.to(`conversation:${conversationId}`).emit("message:new", msg);
        }

        if (peerId) {
          io.to(`user:${peerId}`).emit("call:ended", {
            callId: callId ? String(callId) : null,
            conversationId: conversationId ? String(conversationId) : null,
            endedBy: userId,
            durationSec: Number(durationSec) || 0,
          });
        }

        ack?.({ success: true });
      } catch (err) {
        ack?.({ success: false, message: err.message });
      }
    });

    /**
     * WebRTC signaling relay (offer / answer / ice)
     * payload: { toUserId, conversationId, type: 'offer'|'answer'|'ice-candidate', sdp?, candidate? }
     */
    socket.on("call:signal", (payload) => {
      const toUserId = payload?.toUserId;
      if (!toUserId) return;

      io.to(`user:${toUserId}`).emit("call:signal", {
        fromUserId: userId,
        conversationId: payload?.conversationId
          ? String(payload.conversationId)
          : null,
        type: payload?.type,
        sdp: payload?.sdp,
        candidate: payload?.candidate,
        callId: payload?.callId ? String(payload.callId) : null,
      });
    });

    /**
     * Presence query
     */
    socket.on("presence:query", (payload, ack) => {
      const ids = Array.isArray(payload?.userIds) ? payload.userIds : [];
      const result = {};
      for (const id of ids) {
        result[String(id)] = isOnline(id);
      }
      ack?.({ success: true, data: result });
    });

    socket.on("disconnect", () => {
      removeOnline(userId, socket.id);
      if (!isOnline(userId)) {
        socket.broadcast.emit("presence:update", {
          userId,
          online: false,
        });
      }
      console.log(`[socket] disconnected user=${userId} sid=${socket.id}`);
    });
  });
};

module.exports = {
  registerChatSockets,
  isOnline,
  onlineUsers,
};
