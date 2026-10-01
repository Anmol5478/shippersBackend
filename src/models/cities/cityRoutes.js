const express = require("express");
const router = express.Router();
const {
  searchCities,
} = require("./cityController");


/**
 * @swagger
 * /api/cities/search:
 *   get:
 *     summary: Search cities
 *     tags:
 *       - Cities
 *     parameters:
 *       - in: query
 *         name: search
 *         required: false
 *         schema:
 *           type: string
 *         description: City name to search
 *     responses:
 *       200:
 *         description: List of cities
 */
router.get("/search", searchCities);

module.exports = router;