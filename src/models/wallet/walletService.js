const walletRepository = require("./walletRepository");

const getWalletDetails = async (user_id) => {
  const wallet = await walletRepository.getOrCreateWallet(user_id);
  const transactions = await walletRepository.getTransactions(user_id);
  const bank_accounts = await walletRepository.getBankAccounts(user_id);

  return {
    balance: Number(wallet.balance),
    currency: wallet.currency || "INR",
    transactions,
    bank_accounts,
  };
};

module.exports = { getWalletDetails };