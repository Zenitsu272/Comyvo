import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

type Params = { params: Promise<{ id: string }> };

// POST /api/pools/:id/join — join pool with specific seat number selection
export async function POST(request: Request, { params }: Params) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  // Read seat_no from request
  const body = await request.json().catch(() => ({}));
  const { seat_no } = body;

  if (!seat_no || Number(seat_no) < 1) {
    return NextResponse.json({ error: "Please select a specific seat to book." }, { status: 400 });
  }

  // Check pool
  const { data: pool } = await supabase
    .from("pools")
    .select("available_seats, total_seats, status, host_id, women_only, from_location, to_location, car_type")
    .eq("id", id)
    .single();

  if (!pool) return NextResponse.json({ error: "Pool not found." }, { status: 404 });
  if (pool.host_id === user.id) return NextResponse.json({ error: "You can't join your own pool." }, { status: 400 });
  if (pool.status !== "active") return NextResponse.json({ error: "Pool is not available." }, { status: 400 });
  if (pool.available_seats <= 0) return NextResponse.json({ error: "Pool is full." }, { status: 400 });

  // Validate seat number based on car_type (Host takes seat #1, riders take 2+)
  const maxSeatMap: Record<string, number> = {
    auto: 3,
    sedan: 4,
    suv: 6,
  };
  const maxSeat = maxSeatMap[pool.car_type || "sedan"] || 4;

  if (Number(seat_no) < 1 || Number(seat_no) > maxSeat) {
    return NextResponse.json({ error: `Invalid seat selection for this vehicle.` }, { status: 400 });
  }

  if (Number(seat_no) === 1) {
    return NextResponse.json({ error: "Seat #1 is occupied by the host student." }, { status: 400 });
  }

  // Women-only check
  if (pool.women_only) {
    const { data: profile } = await supabase.from("users").select("gender").eq("id", user.id).single();
    if (profile?.gender !== "female") {
      return NextResponse.json({ error: "This pool is for women students only." }, { status: 403 });
    }
  }

  // Join and book seat
  const { error } = await supabase
    .from("pool_members")
    .insert({ pool_id: id, user_id: user.id, seat_no: Number(seat_no) });

  if (error) {
    if (error.code === "23505") {
      if (error.message.includes("seat_no")) {
        return NextResponse.json({ error: "This seat has already been taken by another member. Please choose another seat." }, { status: 400 });
      }
      return NextResponse.json({ error: "You have already joined this pool." }, { status: 400 });
    }
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
                <li><strong>Seat Booked:</strong> Seat #${seat_no}</li>
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
