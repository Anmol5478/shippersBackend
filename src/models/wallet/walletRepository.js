const db = require("../../config/db");

const getOrCreateWallet = async (user_id) => {
  const [rows] = await db.query(
    `SELECT id, user_id, balance, currency FROM wallets WHERE user_id = ? LIMIT 1`,
    [user_id]
  );

  if (rows[0]) return rows[0];

  // auto-create empty wallet
  const [result] = await db.query(
    `INSERT INTO wallets (user_id, balance) VALUES (?, 0)`,
    [user_id]
  );

  return {
    id: result.insertId,
    user_id,
    balance: 0,
    currency: "INR",
  };
};

const getTransactions = async (user_id, limit = 50, offset = 0) => {
  const [rows] = await db.query(
    `SELECT
        id,
        type,
        amount,
        balance_after,
        reference_id,
        description,
        status,
        created_at
     FROM wallet_transactions
     WHERE user_id = ?
     ORDER BY created_at DESC
     LIMIT ? OFFSET ?`,
    [user_id, limit, offset]
  );
  return rows;
};

const getBankAccounts = async (user_id) => {
  const [rows] = await db.query(
    `SELECT
        id,
        account_holder,
        account_number,
        ifsc_code,
        bank_name,
        is_primary,
        is_verified
     FROM bank_accounts
     WHERE user_id = ?
     ORDER BY is_primary DESC, id DESC`,
    [user_id]
  );
  return rows;
};

module.exports = {
  getOrCreateWallet,
  getTransactions,
  getBankAccounts,
};