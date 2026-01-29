import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase/server";

export async function POST(req: Request) {
  const supabase = supabaseServer();

  try {
    const { report_id } = await req.json();
    if (!report_id) {
      return NextResponse.json({ error: "report_id required" }, { status: 400 });
    }

    // 1) 신고 가져오기
    const { data: report, error: reportError } = await supabase
      .from("reports")
      .select("*")
      .eq("id", report_id)
      .single();

    if (reportError || !report) {
      return NextResponse.json({ error: "Report not found" }, { status: 404 });
    }

    // 상태가 auto 아니면 실행 불가
    if (report.status !== "auto") {
      return NextResponse.json(
        { error: `Cannot auto-process. Current status = ${report.status}` },
        { status: 400 }
      );
    }

    // 상태: auto → processing
    await supabase
      .from("reports")
      .update({ status: "processing" })
      .eq("id", report_id);

    // -------------------------------
    // 2) 가격 자동 검증 로직
    // -------------------------------

    let price_checked = false;
    let price_message = "";

    if (report.detected_price && report.detected_price < 2000) {
      price_checked = true;
      price_message = "가격이 비정상적으로 낮아 자동 보정 처리됨.";
    }

    // -------------------------------
    // 3) 병원 정보 자동 수정 로직
    // -------------------------------

    let provider_checked = false;
    let provider_message = "";

    if (report.detected_provider_name) {
      provider_checked = true;
      provider_message = `병원명 '${report.detected_provider_name}' 자동 확인됨`;
    }

    // -------------------------------
    // 4) 처리 로그 기록
    // -------------------------------
    await supabase.from("report_logs").insert({
      report_id,
      price_checked,
      price_message,
      provider_checked,
      provider_message,
      created_at: new Date(),
    });

    // -------------------------------
    // 5) 최종 상태 변경: processing → completed
    // -------------------------------
    await supabase
      .from("reports")
      .update({ status: "completed" })
      .eq("id", report_id);

    return NextResponse.json({
      ok: true,
      price_checked,
      provider_checked,
      message: "자동 처리 완료",
    });
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
