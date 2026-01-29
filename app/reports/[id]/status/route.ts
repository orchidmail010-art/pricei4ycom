import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase/server";

export async function PATCH(req, { params }) {
  const supabase = supabaseServer();
  const { id } = params;

  try {
    const body = await req.json();
    const { status } = body;

    if (!status) {
      return NextResponse.json({ ok: false, error: "Missing status" }, { status: 400 });
    }

    const { data, error } = await supabase
      .from("reports")
      .update({ status })
      .eq("id", id)
      .select()
      .single();

    if (error) {
      return NextResponse.json({ ok: false, error }, { status: 500 });
    }

    return NextResponse.json({ ok: true, data });
  } catch (e) {
    return NextResponse.json({ ok: false, error: e.message }, { status: 500 });
  }
}
