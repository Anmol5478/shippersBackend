const db = require("../../config/db");

const saveOTP = async (email, otp, expiry) => {


    await db.query(
        `
        INSERT INTO password_reset_otps
        (email,otp,expires_at)
        VALUES(?,?,?)
        `,
        [email, otp, expiry]
    );

};

const getOTP = async (email) => {

    const [rows] = await db.query(
        `
        SELECT *
        FROM password_reset_otps
        WHERE email=?
        `,
        [email]
    );

    return rows[0];
};


module.exports = {

    saveOTP,
    getOTP,


};