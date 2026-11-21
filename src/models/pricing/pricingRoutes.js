const express = require("express");
const router = express.Router();
const pricingController = require("./pricingController");

/**
 * @swagger
 * tags:
 *   - name: Pricing
 *     description: Fare estimation and allowed price-range APIs
 */

/**
 * @swagger
 * /api/pricing/estimate:
 *   post:
 *     summary: Estimate fare range (minimum / recommended / maximum)
 *     description: |
 *       Calculates a recommended total fare and the permitted price band
 *       the traveler may publish. Supports both PARCEL and PASSENGER.
 *
 *       - Parcel inputs: distance_km, transport_mode, weight_kg
 *       - Passenger inputs: distance_km, transport_mode, seats (optional, default 1)
 *
 *       The returned minimum_fare and maximum_fare are derived from the
 *       recommended fare using configurable percentage adjustments.
 *       Rates are provisional (pricing_version) and subject to business validation.
 *
 *       Authentication is not required so the frontend can show live
 *       estimates while the user is composing a ride.
 *     tags:
 *       - Pricing
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - service_type
 *               - distance_km
 *               - transport_mode
 *             properties:
 *               service_type:
 *                 type: string
 *                 enum: [PARCEL, PASSENGER]
 *                 example: PARCEL
 *               distance_km:
 *                 type: number
 *                 minimum: 1
 *                 example: 240
 *               transport_mode:
 *                 type: string
 *                 enum: [TRAIN, BUS, FLIGHT, CAR, BIKE, OTHER]
 *                 example: CAR
 *               weight_kg:
 *                 type: number
 *                 description: Required when service_type is PARCEL
 *                 minimum: 0.1
 *                 example: 3
 *               seats:
 *                 type: integer
 *                 description: Optional when service_type is PASSENGER (default 1)
 *                 minimum: 1
 *                 maximum: 8
 *                 example: 2
 *           examples:
 *             parcel:
 *               summary: Parcel estimate
 *               value:
 *                 service_type: PARCEL
 *                 distance_km: 240
 *                 transport_mode: CAR
 *                 weight_kg: 3
 *             passenger:
 *               summary: Passenger estimate
 *               value:
 *                 service_type: PASSENGER
 *                 distance_km: 180
 *                 transport_mode: CAR
 *                 seats: 2
 *     responses:
 *       200:
 *         description: Fare range calculated successfully
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
 *                   example: Fare estimated successfully
 *                 data:
 *                   type: object
 *                   properties:
 *                     service_type:
 *                       type: string
 *                       example: PARCEL
 *                     distance_km:
 *                       type: number
 *                       example: 240
 *                     transport_mode:
 *                       type: string
 *                       example: CAR
 *                     weight_kg:
 *                       type: number
 *                       example: 3
 *                     seats:
 *                       type: integer
 *                       nullable: true
 *                     currency:
 *                       type: string
 *                       example: INR
 *                     pricing:
 *                       type: object
 *                       properties:
 *                         minimum_fare:
 *                           type: number
 *                           example: 280
 *                         recommended_fare:
 *                           type: number
 *                           example: 350
 *                         maximum_fare:
 *                           type: number
 *                           example: 438
 *                     adjustment_limits:
 *                       type: object
 *                       properties:
 *                         minimum_percent:
 *                           type: number
 *                           example: -20
 *                         maximum_percent:
 *                           type: number
 *                           example: 25
 *                     pricing_version:
 *                       type: string
 *                       example: v1
 *             examples:
 *               parcelSuccess:
 *                 summary: Successful parcel estimate
 *                 value:
 *                   responseCode: "00"
 *                   success: true
 *                   message: Fare estimated successfully
 *                   data:
 *                     service_type: PARCEL
 *                     distance_km: 240
 *                     transport_mode: CAR
 *                     weight_kg: 3
 *                     currency: INR
 *                     pricing:
 *                       minimum_fare: 280
 *                       recommended_fare: 350
 *                       maximum_fare: 438
 *                     adjustment_limits:
 *                       minimum_percent: -20
 *                       maximum_percent: 25
 *                     pricing_version: v1
 *       400:
 *         description: Validation error (missing/invalid inputs)
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
 *                   example: weight_kg must be a number >= 0.1
 */

router.post("/estimate", pricingController.estimateFare);

module.exports = router;
