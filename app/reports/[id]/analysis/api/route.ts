import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase/server";

export async function GET(req, { params }) {
  const supabase = supabaseServer();
  const id = params.id;

  // 신고 정보
  const { data: report } = await supabase
    .from("reports")
    .select("*, provider:provider_id(name)")
    .eq("id", id)
    .single();

  // AI 로그 중 분석 JSON 포함된 최신 항목
  const { data: log } = await supabase
    .from("report_logs")
    .select("meta, created_at")
    .eq("report_id", id)
    .order("id", { ascending: false })
    .limit(1)
    .single();

  return NextResponse.json({
    ok: true,
    report,
    analysis: log?.meta || null,
  });
}
