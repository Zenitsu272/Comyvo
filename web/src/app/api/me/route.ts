import { NextResponse } from "next/server";
import { assertSameOrigin, enforceRateLimit, handleApiError, parseJson, profileComplete, requireUser } from "@/lib/api";
import { profileSchema } from "@/lib/validation";
import { decodeAmritaEmail } from "@/lib/auth";

export async function GET() {
  try {
    const { profile } = await requireUser(true);
    return NextResponse.json({ ...profile, profile_complete: profileComplete(profile) });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function PUT(request: Request) {
  try {
    assertSameOrigin(request);
    const { user, profile, admin } = await requireUser(true);
    await enforceRateLimit(request, "profile-update", 20, 60 * 60, user.id);
    const input = await parseJson(request, profileSchema);
    const decoded = decodeAmritaEmail(user.email || profile.email);
    if (decoded.fullRollNumber && input.roll_number !== decoded.fullRollNumber) {
      return NextResponse.json({ error: "Roll number must match your verified college email." }, { status: 400 });
    }
    const phone = input.phone || null;
    const updates = {
      ...input,
      phone,
      department: decoded.departmentCode || input.department,
      campus: decoded.campus || input.campus,
      year_of_joining: decoded.yearOfJoining || input.year_of_joining || null,
      is_phone_verified: phone === profile.phone ? profile.is_phone_verified : false,
      updated_at: new Date().toISOString(),
    };
    const { data, error } = await admin.from("users").update(updates).eq("id", user.id).select().single();
    if (error) {
      if (error.code === "23505") return NextResponse.json({ error: "That roll number is already registered." }, { status: 409 });
      throw error;
    }
    return NextResponse.json(data);
  } catch (error) {
    return handleApiError(error);
  }
}
