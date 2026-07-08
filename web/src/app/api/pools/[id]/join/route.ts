import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

type Params = { params: Promise<{ id: string }> };

// POST /api/pools/:id/join
export async function POST(_: Request, { params }: Params) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  // Check pool
  const { data: pool } = await supabase
    .from("pools")
    .select("available_seats, status, host_id, women_only, from_location, to_location")
    .eq("id", id)
    .single();

  if (!pool) return NextResponse.json({ error: "Pool not found." }, { status: 404 });
  if (pool.host_id === user.id) return NextResponse.json({ error: "You can't join your own pool." }, { status: 400 });
  if (pool.status !== "active") return NextResponse.json({ error: "Pool is not available." }, { status: 400 });
  if (pool.available_seats <= 0) return NextResponse.json({ error: "Pool is full." }, { status: 400 });

  // Women-only check
  if (pool.women_only) {
    const { data: profile } = await supabase.from("users").select("gender").eq("id", user.id).single();
    if (profile?.gender !== "female") {
      return NextResponse.json({ error: "This pool is for women students only." }, { status: 403 });
    }
  }

  // Join
  const { error } = await supabase
    .from("pool_members")
    .insert({ pool_id: id, user_id: user.id });

  if (error) {
    if (error.code === "23505") return NextResponse.json({ error: "You have already joined this pool." }, { status: 400 });
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // Send Resend Email Notification
  if (process.env.RESEND_API_KEY) {
    try {
      const [hostRes, joinerRes] = await Promise.all([
        supabase.from("users").select("email, full_name").eq("id", pool.host_id).single(),
        supabase.from("users").select("roll_number, full_name").eq("id", user.id).single()
      ]);

      if (hostRes.data?.email) {
        await fetch("https://api.resend.com/emails", {
          method: "POST",
          headers: {
            "Authorization": `Bearer ${process.env.RESEND_API_KEY}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            from: "Commuto <onboarding@resend.dev>",
            to: hostRes.data.email,
            subject: "New rider joined your campus carpool! 🚗",
            html: `
              <h3>Hello ${hostRes.data.full_name || 'Host'}!</h3>
              <p>A new student has joined your Commuto carpool.</p>
              <ul>
                <li><strong>Rider:</strong> ${joinerRes.data?.full_name || 'Verified Student'}</li>
                <li><strong>Roll Number:</strong> ${joinerRes.data?.roll_number || '—'}</li>
                <li><strong>Route:</strong> ${pool.from_location} &rarr; ${pool.to_location}</li>
              </ul>
              <p><a href="${process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'}/my-pools">Click here to view your pool members and contact details</a>.</p>
            `,
          }),
        });
      }
    } catch (err) {
      console.error("Resend email notification failed:", err);
    }
  }

  return NextResponse.json({ success: true });
}
