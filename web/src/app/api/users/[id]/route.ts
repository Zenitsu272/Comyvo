import { NextResponse } from "next/server";
import { handleApiError, requireUser } from "@/lib/api";
import { decodeAmritaEmail } from "@/lib/auth";

type Params = { params: Promise<{ id: string }> };

export async function GET(_: Request, { params }: Params) {
  try {
    const { id } = await params;
    const { admin } = await requireUser();
    const { data: profile, error } = await admin.from("users")
      .select("id,full_name,roll_number,department,campus,year_of_joining,role,is_phone_verified,created_at")
      .eq("id", id).eq("status", "active").single();
    if (error || !profile) return NextResponse.json({ error: "User profile not found." }, { status: 404 });
    const [{ count: hosted }, { count: joined }] = await Promise.all([
      admin.from("pools").select("id", { count: "exact", head: true }).eq("host_id", id).eq("status", "completed"),
      admin.from("pool_members").select("id", { count: "exact", head: true }).eq("user_id", id),
    ]);
    return NextResponse.json({
      ...profile,
      decoded: decodeAmritaEmail(profile.roll_number || ""),
      stats: { hosted: hosted || 0, joined: joined || 0 },
    });
  } catch (error) {
    return handleApiError(error);
  }
}
