import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin, getAdminSecret } from "../../../../lib/supabase";

async function authorized(request: NextRequest): Promise<boolean> {
  const secret = await getAdminSecret();
  if (!secret) return false;
  const header = request.headers.get("x-admin-secret");
  return header === secret;
}

// GET /api/admin/demo-requests – list all demo requests
export async function GET(request: NextRequest) {
  if (!(await authorized(request))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from("demo_requests")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ demo_requests: data ?? [] });
}

// POST /api/admin/demo-requests – approve a demo request (creates a user)
export async function POST(request: NextRequest) {
  if (!(await authorized(request))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const { id } = body;

  if (!id) {
    return NextResponse.json({ error: "id is required" }, { status: 400 });
  }

  const supabase = getSupabaseAdmin();

  // Fetch the demo request
  const { data: req, error: fetchError } = await supabase
    .from("demo_requests")
    .select("*")
    .eq("id", id)
    .single();

  if (fetchError || !req) {
    return NextResponse.json({ error: "Demo request not found" }, { status: 404 });
  }

  // Check if already converted
  if (req.status === "converted") {
    return NextResponse.json({ error: "Already approved", user_id: req.approved_user_id }, { status: 409 });
  }

  // Use the pre-generated UUID (reserved at submission time) so the ID is the same
  // whether the request is pending or approved
  const userId = req.approved_user_id;

  if (!userId) {
    return NextResponse.json({ error: "No reserved user ID found on this request" }, { status: 400 });
  }

  // Create the user with the exact pre-reserved UUID
  const { error: createError } = await supabase
    .from("users")
    .insert({
      id: userId,
      display_name: req.name,
      email: req.email,
      phone: req.phone,
      credits_remaining: req.credits_min ?? 180,
      title: req.job_title || null,
      company: req.company_name || null,
      source: req.source || "Demo Request",
      priority: req.priority || "low",
    });

  if (createError) {
    return NextResponse.json({ error: createError.message }, { status: 500 });
  }

  // Mark demo request as converted (approved_user_id already set at submission)
  const { error: updateError } = await supabase
    .from("demo_requests")
    .update({ status: "converted" })
    .eq("id", id);

  if (updateError) {
    return NextResponse.json({ error: updateError.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true, user_id: userId }, { status: 201 });
}

// PATCH /api/admin/demo-requests – update status of a demo request
export async function PATCH(request: NextRequest) {
  if (!(await authorized(request))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const { id, status } = body;

  if (!id) {
    return NextResponse.json({ error: "id is required" }, { status: 400 });
  }

  const validStatuses = ["pending", "contacted", "converted", "dismissed"];
  if (!status || !validStatuses.includes(status)) {
    return NextResponse.json(
      { error: `status must be one of: ${validStatuses.join(", ")}` },
      { status: 400 }
    );
  }

  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from("demo_requests")
    .update({ status })
    .eq("id", id)
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ demo_request: data });
}

// DELETE /api/admin/demo-requests – delete a demo request
export async function DELETE(request: NextRequest) {
  if (!(await authorized(request))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const id = searchParams.get("id");

  if (!id) {
    return NextResponse.json({ error: "id query param is required" }, { status: 400 });
  }

  const supabase = getSupabaseAdmin();
  const { error } = await supabase.from("demo_requests").delete().eq("id", id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
