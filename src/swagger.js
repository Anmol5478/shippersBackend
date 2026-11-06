
const swaggerJsDoc = require("swagger-jsdoc");
const path = require("path");

const options = {
  definition: {
    openapi: "3.0.0",
    info: {
      title: "Shippers API",
      version: "1.1.0",
      description: "Shippers API documentation.",
    },

    servers: [
      {
        url:
          process.env.RENDER_EXTERNAL_URL ||
          "https://shippers-backend-slmv.onrender.com",
      },
    ],

    components: {
      securitySchemes: {
        bearerAuth: {
          type: "http",
          scheme: "bearer",
          bearerFormat: "JWT",
        },
      },

      schemas: {
        Notification: {
          type: "object",
          properties: {
            id: { type: "integer", example: 101 },
            title: { type: "string", example: "New booking request" },
            message: { type: "string" },
            notification_type: { type: "string", example: "booking" },
            reference_type: { type: "string", nullable: true },
            reference_id: { type: "string", nullable: true },
            data: { type: "object", nullable: true },
            is_read: { type: "integer", example: 0 },
            read_at: { type: "string", format: "date-time", nullable: true },
            created_at: { type: "string", format: "date-time" },
          },
        },

        NotificationPreferences: {
          type: "object",
          properties: {
            push_enabled: { type: "integer", example: 1 },
            ride_notifications: { type: "integer", example: 1 },
            booking_notifications: { type: "integer", example: 1 },
            parcel_notifications: { type: "integer", example: 1 },
            payment_notifications: { type: "integer", example: 1 },
            chat_notifications: { type: "integer", example: 1 },
            promotional_notifications: { type: "integer", example: 0 },
          },
        },
      },
    },
  },

  apis: [
    path.resolve(__dirname, "models/**/*.js"),
  ],
};

module.exports = swaggerJsDoc(options);
