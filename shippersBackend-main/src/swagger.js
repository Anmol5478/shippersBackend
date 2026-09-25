const swaggerJsDoc = require("swagger-jsdoc");
const path = require("path");

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
          "https://shippers-backend-slmv.onrender.com",
      },
    ],
  },

  apis: [path.resolve(__dirname, "models/**/*.js")],
};

const swaggerSpec = swaggerJsDoc(options);

console.log("Swagger Paths:", swaggerSpec.paths);

module.exports = swaggerSpec;