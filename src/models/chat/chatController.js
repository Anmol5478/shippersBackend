const chatService = require("./chatService");

const getUserId = (req) => req.user?.user_id || req.user?.id;

exports.listConversations = async (req, res) => {
  try {
    const userId = getUserId(req);
    if (!userId) {
      return res.status(401).json({ success: false, message: "Unauthorized" });
    }

    const data = await chatService.listConversations(userId);
    return res.status(200).json({
      responseCode: "00",
      success: true,
      data,
    });
  } catch (err) {
    return res.status(400).json({
      responseCode: "01",
      success: false,
      message: err.message,
    });
  }
};

exports.openConversation = async (req, res) => {
  try {
    const userId = getUserId(req);
    if (!userId) {
      return res.status(401).json({ success: false, message: "Unauthorized" });
    }

    const data = await chatService.openConversation(userId, req.body);
    return res.status(200).json({
      responseCode: "00",
      success: true,
      data,
    });
  } catch (err) {
    return res.status(400).json({
      responseCode: "01",
      success: false,
      message: err.message,
    });
  }
};

exports.getMessages = async (req, res) => {
  try {
    const userId = getUserId(req);
    if (!userId) {
      return res.status(401).json({ success: false, message: "Unauthorized" });
    }

    const conversationId = req.params.conversationId;
    const data = await chatService.getConversationMessages(
      userId,
      conversationId,
      req.query
    );

    return res.status(200).json({
      responseCode: "00",
      success: true,
      data,
    });
  } catch (err) {
    return res.status(400).json({
      responseCode: "01",
      success: false,
      message: err.message,
    });
  }
};

exports.sendMessage = async (req, res) => {
  try {
    const userId = getUserId(req);
    if (!userId) {
      return res.status(401).json({ success: false, message: "Unauthorized" });
    }

    const conversationId = req.params.conversationId;
    const data = await chatService.sendMessage(userId, conversationId, req.body);

    // Also emit via socket if available
    const io = req.app.get("io");
    if (io && data) {
      io.to(`conversation:${conversationId}`).emit("message:new", data);
      // Notify peer rooms
      io.to(`user:${data.senderId}`).emit("conversation:updated", {
        conversationId: String(conversationId),
        lastMessage: data.text,
        lastMessageAt: data.createdAt,
      });
    }

    return res.status(201).json({
      responseCode: "00",
      success: true,
      data,
    });
  } catch (err) {
    return res.status(400).json({
      responseCode: "01",
      success: false,
      message: err.message,
    });
  }
};

exports.markRead = async (req, res) => {
  try {
    const userId = getUserId(req);
    if (!userId) {
      return res.status(401).json({ success: false, message: "Unauthorized" });
    }

    const conversationId = req.params.conversationId;
    const upToMessageId = req.body?.upToMessageId || null;

    await chatService.markRead(userId, conversationId, upToMessageId);

    const io = req.app.get("io");
    if (io) {
      io.to(`conversation:${conversationId}`).emit("message:read", {
        conversationId: String(conversationId),
        readerId: userId,
        upToMessageId,
      });
    }

    return res.status(200).json({
      responseCode: "00",
      success: true,
      message: "Marked as read",
    });
  } catch (err) {
    return res.status(400).json({
      responseCode: "01",
      success: false,
      message: err.message,
    });
  }
};
