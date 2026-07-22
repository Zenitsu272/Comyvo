import { NextResponse } from "next/server";
import { ApiError, assertSameOrigin, enforceRateLimit, handleApiError, parseJson, requireUser } from "@/lib/api";
import { commentSchema } from "@/lib/validation";
import type { SupabaseClient } from "@supabase/supabase-js";

type Params = { params: Promise<{ id: string }> };

async function assertParticipant(admin: SupabaseClient, poolId: string, userId: string, role: string) {
  if (role === "admin") return;
  const [{ data: pool }, { data: membership }] = await Promise.all([
    admin.from("pools").select("host_id").eq("id", poolId).single(),
    admin.from("pool_members").select("id").eq("pool_id", poolId).eq("user_id", userId).maybeSingle(),
  ]);
  if (!pool || (pool.host_id !== userId && !membership)) throw new ApiError(403, "Join this pool to access its discussion.");
}

export async function GET(_: Request, { params }: Params) {
  try {
    const { id } = await params;
    const { user, profile, admin } = await requireUser();
    await assertParticipant(admin, id, user.id, profile.role);
    const { data, error } = await admin.from("comments")
      .select("id,pool_id,user_id,message,created_at,users!comments_user_id_fkey(roll_number,full_name)")
      .eq("pool_id", id).order("created_at", { ascending: true }).limit(200);
    if (error) throw error;
    return NextResponse.json(data || []);
  } catch (error) {
    return handleApiError(error);
  }
}

export async function POST(request: Request, { params }: Params) {
  try {
    assertSameOrigin(request);
    const { id } = await params;
    const { user, profile, admin } = await requireUser();
    await assertParticipant(admin, id, user.id, profile.role);
    await enforceRateLimit(request, "comment", 30, 5 * 60, user.id);
    const { message } = await parseJson(request, commentSchema);
    const { data, error } = await admin.from("comments").insert({ pool_id: id, user_id: user.id, message })
      .select("id,pool_id,user_id,message,created_at,users!comments_user_id_fkey(roll_number,full_name)").single();
    if (error) throw error;
    return NextResponse.json(data, { status: 201 });
  } catch (error) {
    return handleApiError(error);
  }
}
