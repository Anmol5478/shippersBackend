
const axios = require("axios");
const repo = require("./notificationRepository");

exports.processPendingReceipts = async () => {
  const pending = await repo.getPendingPushReceipts(1000);

  if (!pending.length) {
    console.log("No pending Expo push receipts.");
    return { checked: 0, deactivated: 0 };
  }

  const ticketIds = pending.map((item) => item.ticket_id);

  const response = await axios.post(
    "https://exp.host/--/api/v2/push/getReceipts",
    { ids: ticketIds },
    {
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      timeout: 20000,
    }
  );

  const receiptData = response.data?.data;

  if (!receiptData || typeof receiptData !== "object") {
    throw new Error("Invalid Expo receipt response");
  }

  const processedIds = [];
  let deactivated = 0;

  for (const item of pending) {
    const receipt = receiptData[item.ticket_id];

    // Expo may not have generated this receipt yet.
    if (!receipt) continue;

    processedIds.push(item.id);

    if (
      receipt.status === "error" &&
      receipt.details?.error === "DeviceNotRegistered"
    ) {
      await repo.deactivateToken(
        item.user_id,
        item.expo_push_token
      );

      deactivated++;
      console.log("Deactivated an unregistered Expo device.");
    } else if (receipt.status === "error") {
      console.error("Expo receipt error:", receipt.message);
    }
  }

  await repo.markPushReceiptsProcessed(processedIds);

  console.log(
    `Expo receipts checked: ${processedIds.length}, devices deactivated: ${deactivated}`
  );

  return {
    checked: processedIds.length,
    deactivated,
  };
};
