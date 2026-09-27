export type PoolPricing = {
  pricing_mode?: "fixed" | "split_equally";
  cost_per_person: number | null;
};

export function formatPoolPrice(pool: PoolPricing): string {
  return pool.pricing_mode === "split_equally" ? "Split equally" : `₹${pool.cost_per_person ?? 0}`;
}

export function comparePoolPrices(a: PoolPricing, b: PoolPricing): number {
  const aUnknown = a.pricing_mode === "split_equally" || a.cost_per_person === null;
  const bUnknown = b.pricing_mode === "split_equally" || b.cost_per_person === null;
  if (aUnknown || bUnknown) return Number(aUnknown) - Number(bUnknown);
  return a.cost_per_person! - b.cost_per_person!;
}

export function averageFixedFare(pools: PoolPricing[]): number | null {
  const fares = pools.filter((pool) => pool.pricing_mode !== "split_equally" && pool.cost_per_person !== null);
  return fares.length ? Math.round(fares.reduce((sum, pool) => sum + Number(pool.cost_per_person), 0) / fares.length) : null;
}
