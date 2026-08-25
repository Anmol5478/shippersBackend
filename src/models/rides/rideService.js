const rideRepository = require("./rideRepository");

const searchRides = async (query) => {
  const { from, to, weight, date } = query;

  if (!from || !to) {
    throw new Error("From and To locations are required");
  }

  let minWeight = null;
  let maxWeight = null;

  if (weight) {
    if (weight.includes("-")) {
      const parts = weight.split("-");

      minWeight = Number(parts[0]);
      maxWeight = Number(parts[1]);

    } else if (weight.endsWith("+")) {
      minWeight = Number(weight.replace("+", ""));
    }

    if (
      Number.isNaN(minWeight) ||
      minWeight <= 0
    ) {
      throw new Error("Invalid weight");
    }
  }

  return await rideRepository.searchRides({
    from: from.trim(),
    to: to.trim(),
    minWeight,
    maxWeight,
    date,
  });
};

module.exports = {
  searchRides,
};