import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase/server";

export async function GET(req, { params }) {
  const supabase = supabaseServer();

  const { id } = params;

  const { data, error } = await supabase
    .from("report_logs")
    .select("*")
    .eq("report_id", id)
    .order("id", { ascending: false });

  if (error) {
    return NextResponse.json({ ok: false, error });
  }

  return NextResponse.json({ ok: true, data });
}
