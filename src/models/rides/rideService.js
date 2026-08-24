const rideRepository = require("./rideRepository");

const searchRides = async (query) => {
  const {
    from,
    to,
    weight,
    date,
  } = query;

  if (!from || !to) {
    throw new Error(
      "From and To locations are required"
    );
  }

  let requiredWeight = null;

  /*
    Your frontend currently sends:

    weight=1-3

    For searching rides, we need to determine
    the maximum parcel weight.

    Examples:

    1-3  -> 3
    3-5  -> 5
    5-10 -> 10
  */

  if (weight) {
    if (weight.includes("-")) {
      const parts = weight.split("-");

      requiredWeight = Number(parts[1]);
    } else {
      requiredWeight = Number(weight);
    }

    if (
      Number.isNaN(requiredWeight) ||
      requiredWeight <= 0
    ) {
      throw new Error("Invalid weight");
    }
  }

  return await rideRepository.searchRides({
    from: from.trim(),
    to: to.trim(),
    weight: requiredWeight,
    date,
  });
};

module.exports = {
  searchRides,
};