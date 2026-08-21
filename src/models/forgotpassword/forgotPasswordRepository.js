const db = require("../../config/db");

const saveOTP = async (email, otp, expiry) => {


    await db.query(
        `
        INSERT INTO otp
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
        FROM otp
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