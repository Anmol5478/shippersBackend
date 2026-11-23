
const router = require("express").Router();
const auth = require("../../middleware/authenticate");
const c = require("./notificationController");

/**
 * @swagger
 * tags:
 *   name: Notifications
 *   description: Push devices, notification inbox and preferences
 *
 * components:
 *   schemas:
 *     NotificationPreferences:
 *       type: object
 *       properties:
 *         push_enabled:
 *           type: integer
 *           enum: [0, 1]
 *         ride_notifications:
 *           type: integer
 *           enum: [0, 1]
 *         booking_notifications:
 *           type: integer
 *           enum: [0, 1]
 *         parcel_notifications:
 *           type: integer
 *           enum: [0, 1]
 *         payment_notifications:
 *           type: integer
 *           enum: [0, 1]
 *         chat_notifications:
 *           type: integer
 *           enum: [0, 1]
 *         promotional_notifications:
 *           type: integer
 *           enum: [0, 1]
 */

/**
 * @swagger
 * /api/notifications/devices/register:
 *   post:
 *     summary: Register a push notification device
 *     tags: [Notifications]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - expo_push_token
 *               - device_type
 *             properties:
 *               expo_push_token:
 *                 type: string
 *                 example: ExponentPushToken[xxxxxxxxxxxxxxxxxxxxxx]
 *               device_type:
 *                 type: string
 *                 enum: [android, ios]
 *               device_name:
 *                 type: string
 *                 example: Samsung Galaxy S24
 *     responses:
 *       200:
 *         description: Device registered
 */
router.post("/devices/register", auth, c.register);

/**
 * @swagger
 * /api/notifications/devices/{deviceId}:
 *   delete:
 *     summary: Unregister a push device
 *     tags: [Notifications]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: deviceId
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Device unregistered
 */
router.delete("/devices/:deviceId", auth, c.unregister);

/**
 * @swagger
 * /api/notifications/devices/unregister-token:
 *   post:
 *     summary: Unregister device using Expo push token
 *     tags: [Notifications]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - expo_push_token
 *             properties:
 *               expo_push_token:
 *                 type: string
 *     responses:
 *       200:
 *         description: Device unregistered
 */
router.post("/devices/unregister-token", auth, c.unregister);

/**
 * @swagger
 * /api/notifications:
 *   get:
 *     summary: Get notification inbox
 *     tags: [Notifications]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 20
 *     responses:
 *       200:
 *         description: Notifications retrieved
 */
router.get("/", auth, c.list);

/**
 * @swagger
 * /api/notifications/unread-count:
 *   get:
 *     summary: Get unread notification count
 *     tags: [Notifications]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Unread count retrieved
 */
router.get("/unread-count", auth, c.unread);

/**
 * @swagger
 * /api/notifications/read-all:
 *   patch:
 *     summary: Mark all notifications as read
 *     tags: [Notifications]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: All notifications marked as read
 */
router.patch("/read-all", auth, c.readAll);

/**
 * @swagger
 * /api/notifications/{notificationId}/read:
 *   patch:
 *     summary: Mark a notification as read
 *     tags: [Notifications]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: notificationId
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Notification marked as read
 *       404:
 *         description: Notification not found
 */
router.patch("/:notificationId/read", auth, c.read);

/**
 * @swagger
 * /api/notifications/preferences:
 *   get:
 *     summary: Get notification preferences
 *     tags: [Notifications]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Preferences retrieved
 */
router.get("/preferences", auth, c.preferences);

/**
 * @swagger
 * /api/notifications/preferences:
 *   put:
 *     summary: Update notification preferences
 *     tags: [Notifications]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/NotificationPreferences'
 *     responses:
 *       200:
 *         description: Preferences updated
 */
router.put("/preferences", auth, c.updatePreferences);

module.exports = router;
