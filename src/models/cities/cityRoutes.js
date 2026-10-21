const express = require("express");
const { searchCities } = require("./cityController");
const router = express.Router();

/**
 * @swagger
 * /api/cities/search-cities:
 *   post:
 *     summary: Search cities by name
 *     tags: [Cities]
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               search:
 *                 type: string
 *                 example: Ghaziabad
 *     responses:
 *       200:
 *         description: City list
 */
router.post("/search-cities", searchCities);
module.exports = router;
