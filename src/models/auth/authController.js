const authService = require("./authService");

exports.signup = async (req, res) => {
  try {
    const data = await authService.signup(req.body);

    return res.status(201).json({
        responseCode:"00",
      message: "Signup successful",
      data,
    });
  } catch (err) {
    return res.status(400).json({
        responseCode:"01",
      success: false,
      message: err.message,
    });
  }
};

exports.login = async (req, res) => {
  try {
    const data = await authService.login(req.body);

    return res.status(200).json({
        responseCode:"00",
      message: "Login successful",
      data,
    });
  } catch (err) {
    return res.status(401).json({
        responseCode:"01",
      success: false,
      message: err.message,
    });
  }
};