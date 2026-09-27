import { describe, expect, it } from "vitest";
import { averageFixedFare, comparePoolPrices, formatPoolPrice } from "@/lib/pricing";
import { createPoolSchema, poolPricingSchema, updatePoolSchema } from "@/lib/validation";

describe("ride pricing", () => {
  const fixed = { pricing_mode: "fixed" as const, cost_per_person: 150 };
  const split = { pricing_mode: "split_equally" as const, cost_per_person: null };
  it("labels an undecided split without presenting it as free", () => {
    expect(formatPoolPrice(split)).toBe("Split equally");
    expect(formatPoolPrice(fixed)).toBe("₹150");
    expect(formatPoolPrice({ ...fixed, cost_per_person: 0 })).toBe("₹0");
  });
  it("sorts unknown fares last and excludes them from average fares", () => {
    expect([split, fixed, split].sort(comparePoolPrices)).toEqual([fixed, split, split]);
    expect(averageFixedFare([fixed, split])).toBe(150);
    expect(averageFixedFare([split])).toBeNull();
    expect(averageFixedFare([{ ...fixed, cost_per_person: 0 }])).toBe(0);
  });
  it("keeps legacy prices fixed and clears obsolete prices for equal splits", () => {
    expect(poolPricingSchema.parse({ cost_per_person: 150 })).toEqual(fixed);
    expect(poolPricingSchema.parse({ ...split, cost_per_person: 150 })).toEqual(split);
    expect(poolPricingSchema.parse({ pricing_mode: "split_equally" })).toEqual(split);
  });
  it("requires a real amount when switching back to fixed pricing", () => {
    for (const cost of [null, undefined, "", -1, 10001]) {
      expect(poolPricingSchema.safeParse({ pricing_mode: "fixed", cost_per_person: cost }).success).toBe(false);
    }
    expect(poolPricingSchema.safeParse({ pricing_mode: "fixed", cost_per_person: 0 }).success).toBe(true);
    expect(poolPricingSchema.safeParse({ pricing_mode: "unknown", cost_per_person: 10 }).success).toBe(false);
  });
  it("persists split pricing from create and update payloads", () => {
    const ride = { from_location: "Campus Gate", to_location: "Station", departure_at: new Date(Date.now() + 3600000).toISOString(), total_seats: 3, car_type: "auto", campus: "Coimbatore", luggage_capacity: "any", women_only: false, contact_visibility: "after_join" };
    expect(createPoolSchema.parse({ ...ride, ...split }).cost_per_person).toBeNull();
    expect(createPoolSchema.safeParse({ ...ride, pricing_mode: "fixed" }).success).toBe(false);
    expect(updatePoolSchema.parse(split)).toEqual(split);
    expect(poolPricingSchema.safeParse({ ...split, ...updatePoolSchema.parse({ pricing_mode: "fixed" }) }).success).toBe(false);
  });
});
