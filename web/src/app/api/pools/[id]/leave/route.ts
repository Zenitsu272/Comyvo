import { NextResponse } from "next/server";
import { assertSameOrigin, enforceRateLimit, handleApiError, requireUser } from "@/lib/api";

type Params = { params: Promise<{ id: string }> };

export async function DELETE(request: Request, { params }: Params) {
  try {
    assertSameOrigin(request);
    const { id } = await params;
    const { user, auth } = await requireUser();
    await enforceRateLimit(request, "pool-leave", 30, 60 * 60, user.id);
    const { error } = await auth.rpc("leave_pool", { p_pool_id: id });
    if (error) return NextResponse.json({ error: "You are not a member of this pool." }, { status: 409 });
    return NextResponse.json({ success: true });
  } catch (error) {
    return handleApiError(error);
  }
}
