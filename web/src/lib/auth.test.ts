import { describe, expect, it } from "vitest";
import { decodeAmritaEmail, getDomainError, isAllowedEmail } from "@/lib/auth";

describe("Amrita identity validation", () => {
  it("accepts approved student domains", () => {
    expect(isAllowedEmail("cb.en.u4cce24130@cb.students.amrita.edu")).toBe(true);
    expect(getDomainError("student@gmail.com")).toMatch(/Only Amrita/);
  });

  it("derives the roll number from a valid student email", () => {
    const identity = decodeAmritaEmail("cb.en.u4cce24130@cb.students.amrita.edu");
    expect(identity.isValid).toBe(true);
    expect(identity.fullRollNumber).toBe("CB.EN.U4CCE24130");
    expect(identity.campus).toBe("Coimbatore");
    expect(identity.departmentCode).toBe("CCE");
    expect(identity.yearOfJoining).toBe(2024);
  });
});
