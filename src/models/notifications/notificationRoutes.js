
const router = require("express").Router();
const auth = require("../../middleware/authenticate");
const c = require("./notificationController");

router.use(auth);

/**
 * @swagger
 * tags:
 *   name: Notifications
 *   description: Ridezey notification management APIs
 */

/**
 * @swagger
 * /api/notifications/devices/register:
 *   post:
 *     summary: Register device for push notifications
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
 *                 example: ExponentPushToken[xxxxxxxxxxxxxxxxxxxx]
 *               device_type:
 *                 type: string
 *                 enum: [android, ios]
 *                 example: android
 *               device_name:
 *                 type: string
 *                 example: Samsung Galaxy S24
 *     responses:
 *       200:
 *         description: Device registered successfully
 *       400:
 *         description: Invalid device details
 *       401:
 *         description: Unauthorized
 */
router.post("/devices/register", c.register);

/**
 * @swagger
 * /api/notifications/devices/{deviceId}:
 *   delete:
 *     summary: Unregister a device
 *     tags: [Notifications]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: deviceId
 *         required: true
 *         schema:
 *           type: integer
 *         description: Device ID
 *     responses:
 *       200:
 *         description: Device deactivated successfully
 *       401:
 *         description: Unauthorized
 */
router.delete("/devices/:deviceId", c.unregister);

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
 *                 example: ExponentPushToken[xxxxxxxxxxxxxxxxxxxx]
 *     responses:
 *       200:
 *         description: Device unregistered
 *       400:
 *         description: Invalid request
 *       401:
 *         description: Unauthorized
 */
router.post("/devices/unregister-token", c.unregister);

/**
 * @swagger
 * /api/notifications:
 *   get:
 *     summary: Get notification history
 *     tags: [Notifications]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *         description: Page number
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 20
 *           maximum: 50
 *         description: Number of notifications per page
 *     responses:
 *       200:
 *         description: Notifications retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 responseCode:
 *                   type: string
 *                   example: "00"
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   type: object
 *                   properties:
 *                     notifications:
 *                       type: array
 *                       items:
 *                         $ref: '#/components/schemas/Notification'
 *                     unreadCount:
 *                       type: integer
 *                       example: 3
 *                     page:
 *                       type: integer
 *                       example: 1
 *                     limit:
 *                       type: integer
 *                       example: 20
 *       401:
 *         description: Unauthorized
 */
router.get("/", c.list);

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
 *         description: Unread count retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 responseCode:
 *                   type: string
 *                   example: "00"
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   type: object
 *                   properties:
 *                     unreadCount:
 *                       type: integer
 *                       example: 5
 *       401:
 *         description: Unauthorized
 */
router.get("/unread-count", c.unread);

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
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 responseCode:
 *                   type: string
 *                   example: "00"
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   type: object
 *                   properties:
 *                     updatedCount:
 *                       type: integer
 *                       example: 5
 *       401:
 *         description: Unauthorized
 */
router.patch("/read-all", c.readAll);

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
 *         description: Notification ID
 *     responses:
 *       200:
 *         description: Notification marked as read
 *       404:
 *         description: Notification not found
 *       401:
 *         description: Unauthorized
 */
router.patch("/:notificationId/read", c.read);

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
 *         description: Preferences retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/NotificationPreferences'
 *       401:
 *         description: Unauthorized
 */
router.get("/preferences", c.preferences);

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
 *             type: object
 *             properties:
 *               push_enabled:
 *                 type: boolean
 *                 example: true
 *               ride_notifications:
 *                 type: boolean
 *                 example: true
 *               booking_notifications:
 *                 type: boolean
 *                 example: true
 *               parcel_notifications:
 *                 type: boolean
 *                 example: true
 *               payment_notifications:
 *                 type: boolean
 *                 example: true
 *               chat_notifications:
 *                 type: boolean
 *                 example: true
 *               promotional_notifications:
 *                 type: boolean
 *                 example: false
 *     responses:
 *       200:
 *         description: Preferences updated successfully
 *       400:
 *         description: Invalid preferences
 *       401:
 *         description: Unauthorized
 */
router.put("/preferences", c.updatePreferences);

module.exports = router;
