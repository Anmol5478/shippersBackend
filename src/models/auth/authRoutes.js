const express = require("express");
const router = express.Router();

const {
  signup,
  login,
} = require("./authController");

// Signup
/**
/**
 * @swagger
 * /api/auth/signup:
 *   post:
 *     summary: Register a new user
 *     tags:
 *       - Authentication
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - full_name
 *               - email
 *               - gender
 *               - role
 *               - phone
 *               - password
 *             properties:
 *               full_name:
 *                 type: string
 *                 example: Anmol Gupta
 *               email:
 *                 type: string
 *                 format: email
 *                 example: anmol@gmail.com
 *               phone:
 *                 type: string
 *                 example: "9876543210"
 *               password:
 *                 type: string
 *                 example: Password@123
 *               gender:
 *                 type: string
 *                 enum:
 *                   - Male
 *                   - Female
 *                   - Other
 *                 example: Male
 *               role:
 *                 type: integer
 *                 enum:
 *                   - 1
 *                   - 2
 *                   - 3
 *                 description: "1 = Driver, 2 = User, 3 = Admin"
 *                 example: 1
 *     responses:
 *       201:
 *         description: User created successfully
 *       400:
 *         description: Bad Request
 */
router.post("/signup", signup);

/**
 * @swagger
 * /api/auth/login:
 *   post:
 *     summary: Login user
 *     tags:
 *       - Authentication
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - email
 *               - password
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *                 example: anmol@gmail.com
 *               password:
 *                 type: string
 *                 example: Password@123
 *     responses:
 *       200:
 *         description: Login successful
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
 *                   example: Login successful
 *                 data:
 *                   type: object
 *                   properties:
 *                     user:
 *                       type: object
 *                       properties:
 *                         id:
 *                           type: integer
 *                           example: 10
 *                         user_id:
 *                           type: string
 *                           example: D0001
 *                         full_name:
 *                           type: string
 *                           example: Anmol Gupta
 *                         email:
 *                           type: string
 *                           example: anmol@gmail.com
 *                         phone:
 *                           type: string
 *                           example: "9876543210"
 *                         gender:
 *                           type: string
 *                           nullable: true
 *                           example: Male
 *                         role:
 *                           type: integer
 *                           example: 1
 *                         kyc:
 *                           type: string
 *                           enum:
 *                             - Y
 *                             - N
 *                           example: N
 *                     accessToken:
 *                       type: string
 *                       example: eyJhbGciOiJIUzI1NiIs...
 *       401:
 *         description: Invalid credentials
 */
router.post("/login", login);

module.exports = router;