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
        url: "http://localhost:8000",
      },
    ],
  },

  apis: [
    "./src/models/**/*.js",
  ],
};

module.exports = swaggerJsDoc(options);