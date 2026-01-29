import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase/server";

export async function POST(req, { params }) {
  const supabase = supabaseServer();
  const id = params.id;

  const { reason } = await req.json();

  if (!reason || reason.trim().length === 0) {
    return NextResponse.json({ ok: false, error: "사유가 필요합니다." });
  }

  // 상태 manual 로 변경
  await supabase
    .from("reports")
    .update({ status: "manual" })
    .eq("id", id);

  // 로그 추가
  await supabase.from("report_logs").insert({
    report_id: id,
    type: "manual",
    message: `수동 처리 사유: ${reason}`,
    meta: { reason },
  });

  return NextResponse.json({ ok: true });
}
