import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase/server";
import { runAutoProcess } from "@/lib/auto/runAutoProcess";

export async function POST(req, { params }) {
  const id = params.id;
  const supabase = supabaseServer();

  // 1) 기존 데이터 불러오기 → before_json 저장
  const { data: before } = await supabase
    .from("reports")
    .select("id, category, content, provider_id, before_json, after_json")
    .eq("id", id)
    .single();

  if (!before) {
    return NextResponse.json({ ok: false, error: "Report not found" });
  }

  // before_json 없는 경우 최초 저장
  await supabase
    .from("reports")
    .update({ before_json: before })
    .eq("id", id);

  // 2) 자동 처리 실행
  const result = await runAutoProcess(before);

  // 3) after_json 저장
  await supabase
    .from("reports")
    .update({ after_json: result })
    .eq("id", id);

  // 4) 로그 기록
  await supabase.from("report_logs").insert({
    report_id: id,
    type: result.ok ? "auto_success" : "auto_fail",
    message: result.message ?? "",
  });

  return NextResponse.json({
    ok: result.ok,
    auto: result.auto,
    duplicate: result.duplicate,
    recommendation: result.recommendation,
  });
}
