import { z } from "zod";
import { getDomainError } from "@/lib/auth";

export const CAMPUSES = [
  "Coimbatore", "Chennai", "Bengaluru", "Kochi", "Mysuru", "Amritapuri",
] as const;

const cleanText = (min: number, max: number) => z.string().trim().min(min).max(max);
const optionalText = (max: number) => z.string().trim().max(max).optional().nullable();
const uuid = z.string().uuid();

export const emailSchema = z.string().trim().toLowerCase().email().superRefine((email, context) => {
  const error = getDomainError(email);
  if (error) context.addIssue({ code: "custom", message: error });
});

export const sendOtpSchema = z.object({ email: emailSchema }).strict();
export const verifyOtpSchema = z.object({
  email: emailSchema,
  token: z.string().trim().regex(/^\d{6}$/, "Enter the 6-digit verification code."),
}).strict();

export const profileSchema = z.object({
  full_name: cleanText(2, 80),
  roll_number: cleanText(6, 32).transform((value) => value.toUpperCase())
    .pipe(z.string().regex(/^[A-Z0-9.-]+$/, "Roll number contains unsupported characters.")),
  phone: z.union([z.literal(""), z.string().trim().regex(/^[6-9]\d{9}$/, "Enter a valid 10-digit Indian mobile number.")]).optional().nullable(),
  department: cleanText(2, 80),
  gender: z.enum(["female", "male", "other"]).nullable().optional(),
  campus: z.enum(CAMPUSES),
  year_of_joining: z.coerce.number().int().min(1990).max(new Date().getFullYear() + 1).nullable().optional(),
}).strict();

const poolFields = {
  from_location: cleanText(2, 120),
  to_location: cleanText(2, 120),
  via_route: optionalText(240),
  car_type: z.enum(["auto", "sedan", "suv"]),
  departure_at: z.string().datetime({ offset: true }),
  total_seats: z.coerce.number().int().min(2).max(8),
  cost_per_person: z.coerce.number().min(0).max(10000),
  notes: optionalText(1000),
  campus: z.enum(CAMPUSES),
  luggage_capacity: z.enum(["any", "backpacks", "trolleys"]),
  women_only: z.boolean(),
  contact_visibility: z.enum(["always", "premium_only", "after_join"]),
};

export const createPoolSchema = z.object(poolFields).strict().superRefine((pool, context) => {
  if (Date.parse(pool.departure_at) < Date.now() + 15 * 60_000) {
    context.addIssue({ code: "custom", path: ["departure_at"], message: "Departure must be at least 15 minutes from now." });
  }
  const vehicleCapacity = { auto: 3, sedan: 4, suv: 6 }[pool.car_type];
  if (pool.total_seats !== vehicleCapacity) {
    context.addIssue({ code: "custom", path: ["total_seats"], message: `Seat capacity for ${pool.car_type} must be ${vehicleCapacity}.` });
  }
});

export const updatePoolSchema = z.object({
  from_location: cleanText(2, 120).optional(),
  to_location: cleanText(2, 120).optional(),
  via_route: optionalText(240),
  car_type: z.enum(["auto", "sedan", "suv"]).optional(),
  departure_at: z.string().datetime({ offset: true }).optional(),
  total_seats: z.coerce.number().int().min(2).max(8).optional(),
  cost_per_person: z.coerce.number().min(0).max(10000).optional(),
  notes: optionalText(1000),
  campus: z.enum(CAMPUSES).optional(),
  luggage_capacity: z.enum(["any", "backpacks", "trolleys"]).optional(),
  women_only: z.boolean().optional(),
  contact_visibility: z.enum(["always", "premium_only", "after_join"]).optional(),
  status: z.enum(["active", "cancelled", "completed"]).optional(),
}).strict().refine((value) => Object.keys(value).length > 0, "Provide at least one field to update.");

export const joinPoolSchema = z.object({ seat_no: z.coerce.number().int().min(2).max(8) }).strict();
export const commentSchema = z.object({ message: cleanText(1, 1000) }).strict();
export const reportSchema = z.object({
  reported_user_id: uuid.optional().nullable(),
  pool_id: uuid.optional().nullable(),
  reason: cleanText(8, 1000),
}).strict().refine((value) => value.reported_user_id || value.pool_id, "Select a pool or user to report.");

export const adminActionSchema = z.discriminatedUnion("action", [
  z.object({ action: z.literal("set_user_status"), userId: uuid, status: z.enum(["active", "suspended"]) }),
  z.object({ action: z.literal("set_user_role"), userId: uuid, role: z.enum(["student", "premium", "admin"]) }),
  z.object({ action: z.literal("resolve_report"), reportId: uuid, status: z.enum(["reviewed", "resolved", "dismissed"]), note: optionalText(1000) }),
  z.object({ action: z.literal("review_premium"), requestId: uuid, status: z.enum(["approved", "rejected"]), note: optionalText(1000) }),
]);

export const phoneRequestSchema = z.object({
  phone: z.string().trim().regex(/^[6-9]\d{9}$/, "Enter a valid 10-digit Indian mobile number."),
}).strict();
export const phoneVerifySchema = phoneRequestSchema.extend({
  code: z.string().trim().regex(/^\d{4,10}$/, "Enter the verification code."),
});

export const premiumRequestSchema = z.object({ note: optionalText(500) }).strict();
