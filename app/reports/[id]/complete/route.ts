import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase/server";

export async function POST(req, { params }) {
  const supabase = supabaseServer();
  const { id } = params;

  const { error: updateError } = await supabase
    .from("reports")
    .update({ status: "completed" })
    .eq("id", id);

  if (updateError) {
    return NextResponse.json({ ok: false, error: updateError });
  }

  await supabase.from("report_logs").insert({
    report_id: id,
    type: "manual_complete",
    message: "관리자가 처리 완료로 설정함",
  });

  return NextResponse.json({ ok: true });
}
