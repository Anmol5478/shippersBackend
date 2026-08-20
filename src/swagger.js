const swaggerJsDoc = require("swagger-jsdoc");

const options = {
  definition: {
    openapi: "3.0.0",
    info: {
      title: "Shippers API",
      version: "1.0.0",
      description: "API Documentation for Shippers",
    },
servers: [
  {
    url:
      process.env.RENDER_EXTERNAL_URL ||
      "http://localhost:8000",
  },
],
  },

apis: ["./models/**/*.js"],
};

module.exports = swaggerJsDoc(options);