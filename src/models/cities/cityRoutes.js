const express = require("express");
const router = express.Router();
const {
  searchCities,
} = require("./cityController");

router.get("/search", searchCities);

module.exports = router;