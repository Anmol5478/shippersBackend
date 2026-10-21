const swaggerJsDoc = require("swagger-jsdoc");
const path = require("path");

const options = {
  definition: {
    openapi: "3.0.0",
    info: {
      title: "Shippers API",
      version: "1.1.0",
      description: "Shippers API documentation. Data-fetching endpoints use POST with JSON request bodies; health checks remain GET.",
    },
servers: [{ url: process.env.RENDER_EXTERNAL_URL || "https://shippers-backend-slmv.onrender.com" }],
    components: {
      securitySchemes: {
        bearerAuth: { type: "http", scheme: "bearer", bearerFormat: "JWT" },
      },
    },
  },
  apis: [path.resolve(__dirname, "models/**/*.js")],
};

module.exports = swaggerJsDoc(options);
