const express = require("express");

const router = express.Router();

const rideController = require("./rideController");

/**
 * @swagger
 * /api/rides/search:
 *   get:
 *     summary: Search available rides
 *     description: Search for active rides based on pickup location, drop location, parcel weight, and travel date.
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
 *         example: Delhi
 *         description: Drop city
 *
 *       - in: query
 *         name: weight
 *         required: false
 *         schema:
 *           type: string
 *         example: 1-3
 *         description: Parcel weight range
 *
 *       - in: query
 *         name: date
 *         required: false
 *         schema:
 *           type: string
 *           format: date
 *         example: 2026-08-24
 *         description: Travel date
 *
 *     responses:
 *       200:
 *         description: Rides fetched successfully
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
 *                 message:
 *                   type: string
 *                   example: Rides found successfully
 *                 data:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       id:
 *                         type: integer
 *                         example: 1
 *                       traveller_id:
 *                         type: integer
 *                         example: 2
 *                       full_name:
 *                         type: string
 *                         example: Rahul Sharma
 *                       pickup_city:
 *                         type: string
 *                         example: Ghaziabad
 *                       pickup_state:
 *                         type: string
 *                         example: Uttar Pradesh
 *                       drop_city:
 *                         type: string
 *                         example: Delhi
 *                       drop_state:
 *                         type: string
 *                         example: Delhi
 *                       travel_date:
 *                         type: string
 *                         format: date
 *                         example: "2026-08-24"
 *                       departure_time:
 *                         type: string
 *                         example: "10:30:00"
 *                       available_weight:
 *                         type: number
 *                         example: 5
 *                       status:
 *                         type: string
 *                         example: active
 *                       is_verified:
 *                         type: boolean
 *                         example: true
 *
 *       400:
 *         description: Invalid search parameters
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 responseCode:
 *                   type: string
 *                   example: "01"
 *                 success:
 *                   type: boolean
 *                   example: false
 *                 message:
 *                   type: string
 *                   example: From and To locations are required
 */

router.get(
  "/search",
  rideController.searchRides
);

module.exports = router;