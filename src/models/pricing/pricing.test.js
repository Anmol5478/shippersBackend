/**
 * Lightweight pricing engine self-test (no external test runner required).
 * Run: node src/models/pricing/pricing.test.js
 */

const pricingService = require("./pricingService");

let passed = 0;
let failed = 0;

function assert(condition, message) {
  if (condition) {
    passed += 1;
    console.log(`  ✓ ${message}`);
  } else {
    failed += 1;
    console.error(`  ✗ ${message}`);
  }
}

function assertThrows(fn, message) {
  try {
    fn();
    failed += 1;
    console.error(`  ✗ ${message} (expected throw)`);
  } catch {
    passed += 1;
    console.log(`  ✓ ${message}`);
  }
}

console.log("\n=== Pricing Engine Tests ===\n");

// --- Parcel basics ---
console.log("Parcel – normal case");
{
  const r = pricingService.estimateFare({
    service_type: "PARCEL",
    distance_km: 240,
    transport_mode: "CAR",
    weight_kg: 3,
  });
  assert(r.service_type === "PARCEL", "service_type is PARCEL");
  assert(r.currency === "INR", "currency INR");
  assert(r.pricing_version === "v2", "pricing_version v2");
  const { minimum_fare, recommended_fare, maximum_fare } = r.pricing;
  assert(
    minimum_fare <= recommended_fare && recommended_fare <= maximum_fare,
    `invariant min(${minimum_fare}) <= rec(${recommended_fare}) <= max(${maximum_fare})`
  );
  assert(minimum_fare > 0, "minimum > 0");
  assert(recommended_fare > 0, "recommended > 0");
}

console.log("\nParcel – all transport modes");
for (const mode of pricingService.ALL_TRANSPORT_MODES) {
  const r = pricingService.estimateFare({
    service_type: "PARCEL",
    distance_km: 100,
    transport_mode: mode,
    weight_kg: 2,
  });
  const { minimum_fare, recommended_fare, maximum_fare } = r.pricing;
  assert(
    minimum_fare <= recommended_fare && recommended_fare <= maximum_fare,
    `${mode}: invariant holds (${minimum_fare}/${recommended_fare}/${maximum_fare})`
  );
}

console.log("\nParcel – weight extremes");
{
  const light = pricingService.estimateFare({
    service_type: "PARCEL",
    distance_km: 50,
    transport_mode: "BIKE",
    weight_kg: 0.1,
  });
  const heavy = pricingService.estimateFare({
    service_type: "PARCEL",
    distance_km: 50,
    transport_mode: "BIKE",
    weight_kg: 50,
  });
  assert(
    heavy.pricing.recommended_fare > light.pricing.recommended_fare,
    "heavier parcel costs more (no negative weight slope)"
  );
}

console.log("\nParcel – distance extremes");
{
  const short = pricingService.estimateFare({
    service_type: "PARCEL",
    distance_km: 1,
    transport_mode: "CAR",
    weight_kg: 1,
  });
  const long = pricingService.estimateFare({
    service_type: "PARCEL",
    distance_km: 500,
    transport_mode: "CAR",
    weight_kg: 1,
  });
  assert(
    long.pricing.recommended_fare > short.pricing.recommended_fare,
    "longer distance costs more"
  );
}

console.log("\nPassenger – normal case");
{
  const r = pricingService.estimateFare({
    service_type: "PASSENGER",
    distance_km: 180,
    transport_mode: "CAR",
    seats: 2,
  });
  const { minimum_fare, recommended_fare, maximum_fare } = r.pricing;
  assert(
    minimum_fare <= recommended_fare && recommended_fare <= maximum_fare,
    `passenger invariant (${minimum_fare}/${recommended_fare}/${maximum_fare})`
  );
}

console.log("\nPassenger – estimate independent of seats + ~250km range");
{
  const one = pricingService.estimateFare({
    service_type: "PASSENGER",
    distance_km: 250,
    transport_mode: "CAR",
    seats: 1,
  });
  const four = pricingService.estimateFare({
    service_type: "PASSENGER",
    distance_km: 250,
    transport_mode: "CAR",
    seats: 4,
  });
  assert(
    one.pricing.recommended_fare === four.pricing.recommended_fare,
    "recommended fare does not change with seats"
  );
  assert(
    one.pricing.minimum_fare === 450 && one.pricing.recommended_fare === 500 && one.pricing.maximum_fare === 600,
    `250km CAR range is 450–600 (got ${one.pricing.minimum_fare}/${one.pricing.recommended_fare}/${one.pricing.maximum_fare})`
  );
}

console.log("\nParcel – booking breakdown matches passenger model");
{
  const b = pricingService.computeParcelBookingBreakdown({
    price_per_kg: 50,
    weight_kg: 10,
  });
  assert(b.customer_pay === 500, "customer_pay = price_per_kg * weight");
  assert(b.commission_percentage === 10, "commission percent");
  assert(b.total_payable === b.customer_pay + b.platform_fee + b.taxes, "total_payable formula");
}

console.log("\nValidation – boundary prices accepted");
{
  const range = pricingService.getUnitPriceRange({
    service_type: "PARCEL",
    distance_km: 240,
    transport_mode: "CAR",
    weight_kg: 3,
  });
  assert(
    pricingService.validateSelectedPrice({
      selected_price: range.minimum,
      service_type: "PARCEL",
      distance_km: 240,
      transport_mode: "CAR",
      weight_kg: 3,
    }).valid,
    "price at minimum accepted"
  );
  assert(
    pricingService.validateSelectedPrice({
      selected_price: range.recommended,
      service_type: "PARCEL",
      distance_km: 240,
      transport_mode: "CAR",
      weight_kg: 3,
    }).valid,
    "price at recommended accepted"
  );
  assert(
    pricingService.validateSelectedPrice({
      selected_price: range.maximum,
      service_type: "PARCEL",
      distance_km: 240,
      transport_mode: "CAR",
      weight_kg: 3,
    }).valid,
    "price at maximum accepted"
  );
}

console.log("\nValidation – out-of-range rejected");
{
  const range = pricingService.getUnitPriceRange({
    service_type: "PARCEL",
    distance_km: 240,
    transport_mode: "CAR",
    weight_kg: 3,
  });
  assertThrows(
    () =>
      pricingService.validateSelectedPrice({
        selected_price: range.minimum - 1,
        service_type: "PARCEL",
        distance_km: 240,
        transport_mode: "CAR",
        weight_kg: 3,
      }),
    "price below minimum rejected"
  );
  assertThrows(
    () =>
      pricingService.validateSelectedPrice({
        selected_price: range.maximum + 1,
        service_type: "PARCEL",
        distance_km: 240,
        transport_mode: "CAR",
        weight_kg: 3,
      }),
    "price above maximum rejected"
  );
}

console.log("\nValidation – invalid values rejected");
assertThrows(
  () =>
    pricingService.validateSelectedPrice({
      selected_price: -10,
      service_type: "PARCEL",
      distance_km: 100,
      transport_mode: "CAR",
      weight_kg: 2,
    }),
  "negative price rejected"
);
assertThrows(
  () =>
    pricingService.validateSelectedPrice({
      selected_price: NaN,
      service_type: "PARCEL",
      distance_km: 100,
      transport_mode: "CAR",
      weight_kg: 2,
    }),
  "NaN price rejected"
);
assertThrows(
  () =>
    pricingService.validateSelectedPrice({
      selected_price: Infinity,
      service_type: "PARCEL",
      distance_km: 100,
      transport_mode: "CAR",
      weight_kg: 2,
    }),
  "Infinity price rejected"
);

console.log("\nInput validation – bad estimates rejected");
assertThrows(
  () =>
    pricingService.estimateFare({
      service_type: "PARCEL",
      distance_km: 0,
      transport_mode: "CAR",
      weight_kg: 1,
    }),
  "zero distance rejected"
);
assertThrows(
  () =>
    pricingService.estimateFare({
      service_type: "PARCEL",
      distance_km: 100,
      transport_mode: "CAR",
      weight_kg: -1,
    }),
  "negative weight rejected"
);
assertThrows(
  () =>
    pricingService.estimateFare({
      service_type: "PARCEL",
      distance_km: 100,
      transport_mode: "SPACESHIP",
      weight_kg: 1,
    }),
  "unknown mode rejected"
);
assertThrows(
  () =>
    pricingService.estimateFare({
      service_type: "BOTH",
      distance_km: 100,
      transport_mode: "CAR",
      weight_kg: 1,
    }),
  "service_type BOTH rejected on estimate (use PARCEL or PASSENGER)"
);

console.log("\nRounding & decimal inputs");
{
  const r = pricingService.estimateFare({
    service_type: "PARCEL",
    distance_km: 123.456,
    transport_mode: "TRAIN",
    weight_kg: 2.75,
  });
  const { minimum_fare, recommended_fare, maximum_fare } = r.pricing;
  assert(
    Number.isInteger(minimum_fare) &&
      Number.isInteger(recommended_fare) &&
      Number.isInteger(maximum_fare),
    "fares rounded to whole rupees"
  );
}

console.log(`\n=== Results: ${passed} passed, ${failed} failed ===\n`);
process.exit(failed > 0 ? 1 : 0);
