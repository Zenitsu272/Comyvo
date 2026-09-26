import { describe, expect, it } from "vitest";
import { decodeAmritaEmail, getDomainError, getSafeNextPath, isAllowedEmail } from "@/lib/auth";

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

describe("safe post-auth redirects", () => {
  it("keeps local paths and their query strings", () => {
    expect(getSafeNextPath("/pool/123?seat=2")).toBe("/pool/123?seat=2");
  });

  it("rejects protocol-relative, absolute, and backslash paths", () => {
    expect(getSafeNextPath("//evil.example")).toBe("/discover");
    expect(getSafeNextPath("https://evil.example")).toBe("/discover");
    expect(getSafeNextPath("/\\evil.example")).toBe("/discover");
  });
});
