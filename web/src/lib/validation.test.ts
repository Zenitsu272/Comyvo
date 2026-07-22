import { describe, expect, it } from "vitest";
import { createPoolSchema, profileSchema, reportSchema } from "@/lib/validation";

describe("API validation", () => {
  it("accepts a complete verified-student profile", () => {
    expect(profileSchema.safeParse({
      full_name: "Vaishak N",
      roll_number: "CB.EN.U4CCE24156",
      phone: "9876543210",
      department: "CCE",
      campus: "Coimbatore",
      gender: "male",
      year_of_joining: 2024,
    }).success).toBe(true);
  });

  it("rejects malformed and self-inconsistent pools", () => {
    const result = createPoolSchema.safeParse({
      from_location: "Gate",
      to_location: "Station",
      departure_at: new Date(Date.now() + 60 * 60_000).toISOString(),
      total_seats: 8,
      cost_per_person: 150,
      campus: "Coimbatore",
      car_type: "auto",
      luggage_capacity: "any",
      women_only: false,
      contact_visibility: "after_join",
    });
    expect(result.success).toBe(false);
  });

  it("requires a meaningful report tied to a target", () => {
    expect(reportSchema.safeParse({ reason: "too short" }).success).toBe(false);
    expect(reportSchema.safeParse({ pool_id: "00000000-0000-4000-8000-000000000001", reason: "Host did not arrive at the pickup point." }).success).toBe(true);
  });
});
