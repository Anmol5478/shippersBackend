const express = require("express");

const router = express.Router();

const rideController =
  require("./rideController");


/**
 * @swagger
 * /api/rides/search:
 *   get:
 *     summary: Search available rides
 *     description: Search active rides based on pickup city, destination city, available weight, and travel date.
 *     tags:
 *       - Rides
 *
 *     parameters:
 *       - in: query
 *         name: from
 *         required: true
 *         schema:
 *           type: string
 *         example: Ghaziabad
 *         description: Pickup city
 *
 *       - in: query
 *         name: to
 *         required: true
 *         schema:
 *           type: string
 *         example: Dehradun
 *         description: Destination city
 *
 *       - in: query
 *         name: weight
 *         required: false
 *         schema:
 *           type: string
 *         example: 1-3
 *         description: Weight range. Examples are 1-3, 3-5, or 5+
 *
 *       - in: query
 *         name: date
 *         required: false
 *         schema:
 *           type: string
 *           format: date
 *         example: 2026-08-30
 *         description: Travel date
 *
 *     responses:
 *       200:
 *         description: Rides fetched successfully
 */
router.get(
  "/search",
  rideController.searchRides
);


/**
 * @swagger
 * /api/rides/user/{userId}:
 *   get:
 *     summary: Get rides published by a user
 *     description: Returns all rides published by a specific user.
 *     tags:
 *       - Rides
 *
 *     parameters:
 *       - in: path
 *         name: userId
 *         required: true
 *         schema:
 *           type: string
 *         example: U0001
 *         description: User ID of the ride publisher
 *
 *     responses:
 *       200:
 *         description: User rides fetched successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *
 *                 responseCode:
 *                   type: string
 *                   example: "00"
 *
 *                 success:
 *                   type: boolean
 *                   example: true
 *
 *                 message:
 *                   type: string
 *                   example: User rides fetched successfully
 *
 *                 data:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *
 *                       id:
 *                         type: integer
 *                         example: 1
 *
 *                       user_id:
 *                         type: string
 *                         example: U0001
 *
 *                       pickup_city:
 *                         type: string
 *                         example: Ghaziabad
 *
 *                       pickup_state:
 *                         type: string
 *                         example: Uttar Pradesh
 *
 *                       drop_city:
 *                         type: string
 *                         example: Dehradun
 *
 *                       drop_state:
 *                         type: string
 *                         example: Uttarakhand
 *
 *                       travel_date:
 *                         type: string
 *                         format: date
 *                         example: "2026-08-30"
 *
 *                       departure_time:
 *                         type: string
 *                         example: "09:30:00"
 *
 *                       available_weight:
 *                         type: number
 *                         example: 5
 *
 *                       status:
 *                         type: string
 *                         example: active
 *
 *                       notes:
 *                         type: string
 *                         example: Travelling by car
 */
router.get(
  "/user/:userId",
  rideController.getUserRides
);


/**
 * @swagger
 * /api/rides:
 *   post:
 *     summary: Create a new journey
 *     description: Creates a new ride or journey.
 *     tags:
 *       - Rides
 *
 *     requestBody:
 *       required: true
 *
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *
 *             required:
 *               - user_id
 *               - pickup_city
 *               - drop_city
 *               - travel_date
 *               - departure_time
 *               - available_weight
 *
 *             properties:
 *
 *               user_id:
 *                 type: string
 *                 example: U0001
 *                 description: ID of the user creating the journey
 *
 *               pickup_city:
 *                 type: string
 *                 example: Ghaziabad
 *
 *               pickup_state:
 *                 type: string
 *                 example: Uttar Pradesh
 *
 *               drop_city:
 *                 type: string
 *                 example: Dehradun
 *
 *               drop_state:
 *                 type: string
 *                 example: Uttarakhand
 *
 *               travel_date:
 *                 type: string
 *                 format: date
 *                 example: "2026-08-30"
 *
 *               departure_time:
 *                 type: string
 *                 example: "09:30:00"
 *
 *               available_weight:
 *                 type: number
 *                 example: 5
 *
 *               notes:
 *                 type: string
 *                 maxLength: 500
 *                 example: Travelling by car and can carry small to medium parcels.
 *
 *     responses:
 *       201:
 *         description: Journey created successfully
 */
router.post(
  "/",
  rideController.createRide
);


module.exports = router;