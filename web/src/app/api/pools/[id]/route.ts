import { NextResponse } from "next/server";
import { ApiError, assertSameOrigin, enforceRateLimit, handleApiError, parseJson, requireUser } from "@/lib/api";
import { poolPricingSchema, updatePoolSchema } from "@/lib/validation";
import { escapeHtml, sendEmail } from "@/lib/email";
import type { SupabaseClient } from "@supabase/supabase-js";

type Params = { params: Promise<{ id: string }> };

export async function GET(_: Request, { params }: Params) {
  try {
    const { id } = await params;
    const { user, profile, admin } = await requireUser();
    const { error: lifecycleError } = await admin.rpc("reconcile_expired_pools");
    if (lifecycleError) throw lifecycleError;
    const { data: pool, error } = await admin.from("pools")
      .select("*, host:users!pools_host_id_fkey(id,full_name,roll_number,phone,is_phone_verified,email)")
      .eq("id", id).single();
    if (error || !pool) return NextResponse.json({ error: "Pool not found." }, { status: 404 });
    if (pool.women_only && profile.gender !== "female" && pool.host_id !== user.id && profile.role !== "admin") {
      return NextResponse.json({ error: "Pool not found." }, { status: 404 });
    }
    const { data: membership } = await admin.from("pool_members").select("id").eq("pool_id", id).eq("user_id", user.id).maybeSingle();
    const isHost = pool.host_id === user.id;
    const isMember = Boolean(membership);
    if (!["active", "full"].includes(pool.status) && !isHost && !isMember && profile.role !== "admin") {
      return NextResponse.json({ error: "Pool not found." }, { status: 404 });
    }
    const canSeeMembers = isHost || isMember || profile.role === "admin";
    const { data: memberRows } = await admin.from("pool_members")
      .select("seat_no,user_id,users!pool_members_user_id_fkey(roll_number,full_name)").eq("pool_id", id).order("seat_no");
    const host = Array.isArray(pool.host) ? pool.host[0] : pool.host;
    const canSeePhone = isHost || isMember || profile.role === "admin" || pool.contact_visibility === "always" ||
      (pool.contact_visibility === "premium_only" && profile.role === "premium");
    const members = (memberRows || []).map((member) => canSeeMembers
      ? member
      : { seat_no: member.seat_no, user_id: null, users: null });
    const { host: _host, ...publicPool } = pool;
    void _host;
    return NextResponse.json({
      ...publicPool,
      host_name: host?.full_name ?? null,
      host_roll: host?.roll_number ?? null,
      host_phone_verified: Boolean(host?.is_phone_verified),
      host_phone_masked: host?.phone ? `********${host.phone.slice(-2)}` : "Not provided",
      host_phone_full: canSeePhone ? host?.phone ?? null : null,
      is_member: isMember,
      is_host: isHost,
      viewer_id: user.id,
      viewer_role: profile.role,
      members,
    });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function PUT(request: Request, { params }: Params) {
  try {
    assertSameOrigin(request);
    const { id } = await params;
    const { user, admin } = await requireUser();
    await enforceRateLimit(request, "pool-update", 30, 60 * 60, user.id);
    const updates = await parseJson(request, updatePoolSchema);
    const { error: lifecycleError } = await admin.rpc("reconcile_expired_pools");
    if (lifecycleError) throw lifecycleError;
    const { data: current } = await admin.from("pools").select("*").eq("id", id).single();
    if (!current) throw new ApiError(404, "Pool not found.");
    if (current.host_id !== user.id) throw new ApiError(403, "Only the host can update this pool.");
    if (current.status === "cancelled" || current.status === "completed") throw new ApiError(409, "Closed pools cannot be edited.");
    if (updates.departure_at && Date.parse(updates.departure_at) < Date.now() + 15 * 60_000) {
      throw new ApiError(400, "Departure must be at least 15 minutes from now.");
    }
    if (updates.status === "completed" && new Date(current.departure_at).getTime() > Date.now()) {
      throw new ApiError(409, "A pool can only be completed after its departure time.");
    }
    const pricing = poolPricingSchema.safeParse({ ...current, ...updates });
    if (!pricing.success) throw new ApiError(400, pricing.error.issues[0].message);
    const { data, error } = await admin.from("pools").update({
      ...updates,
      ...pricing.data,
    }).eq("id", id).eq("host_id", user.id).select().single();
    if (error) throw error;
    if (updates.status === "cancelled" && current.status !== "cancelled") await notifyCancellation(admin, id, data);
    return NextResponse.json(data);
  } catch (error) {
    return handleApiError(error);
  }
}

export async function DELETE(request: Request, { params }: Params) {
  try {
    assertSameOrigin(request);
    const { id } = await params;
    const { user, admin } = await requireUser();
    await enforceRateLimit(request, "pool-cancel", 10, 24 * 60 * 60, user.id);
    const { data, error } = await admin.from("pools").update({ status: "cancelled" })
      .eq("id", id).eq("host_id", user.id).in("status", ["active", "full"]).select().single();
    if (error || !data) throw new ApiError(404, "Active pool not found.");
    await notifyCancellation(admin, id, data);
    return NextResponse.json({ success: true });
  } catch (error) {
    return handleApiError(error);
  }
}

async function notifyCancellation(admin: SupabaseClient, poolId: string, pool: Record<string, unknown>) {
  const { data: members } = await admin.from("pool_members")
    .select("users!pool_members_user_id_fkey(email,full_name)").eq("pool_id", poolId);
  await Promise.allSettled((members || []).map(async (member) => {
    const rider = Array.isArray(member.users) ? member.users[0] : member.users;
    if (!rider?.email) return;
    await sendEmail({
      to: rider.email,
      subject: "Your Comyvo pool was cancelled",
      html: `<h2>Ride cancelled</h2><p>The ride from <strong>${escapeHtml(String(pool.from_location || ""))}</strong> to <strong>${escapeHtml(String(pool.to_location || ""))}</strong> was cancelled by its host.</p>`,
    });
  }));
}
