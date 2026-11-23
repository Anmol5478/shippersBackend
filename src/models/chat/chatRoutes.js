const express = require("express");
const router = express.Router();
const authenticate = require("../../middleware/authenticate");
const chatController = require("./chatController");

router.use(authenticate);

/**
 * GET /api/chat/conversations
 * List my conversations
 */
router.get("/conversations", chatController.listConversations);

/**
 * POST /api/chat/conversations
 * Body: { peerUserId, bookingReference?, rideId?, routeLabel? }
 * Get or create a conversation with a peer
 */
router.post("/conversations", chatController.openConversation);

/**
 * GET /api/chat/conversations/:conversationId/messages
 * Query: limit?, beforeId?
 */
router.get(
  "/conversations/:conversationId/messages",
  chatController.getMessages
);

/**
 * POST /api/chat/conversations/:conversationId/messages
 * Body: { text }
 * REST fallback for sending messages
 */
router.post(
  "/conversations/:conversationId/messages",
  chatController.sendMessage
);

/**
 * POST /api/chat/conversations/:conversationId/read
 * Body: { upToMessageId? }
 */
router.post(
  "/conversations/:conversationId/read",
  chatController.markRead
);

module.exports = router;
