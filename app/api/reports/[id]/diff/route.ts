// app/api/reports/[id]/diff/route.ts
import { NextRequest, NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase/server";

async function handleGetDiff(req: NextRequest, context: any) {
  const params = await context.params;
  const id = Number(params.id);

  if (!id || Number.isNaN(id)) {
    return NextResponse.json(
      { ok: false, error: "INVALID_ID" },
      { status: 400 }
    );
  }

  const supabase = supabaseServer();

  // 가장 최근 자동 처리 로그 1건
  const { data, error } = await supabase
    .from("report_logs")
    .select("auto_detail")
    .eq("report_id", id)
    .eq("auto", true)
    .not("auto_detail", "is", null)
    .order("id", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    console.error("❌ diff 조회 실패", error);
    return NextResponse.json(
      { ok: false, error: "DIFF_QUERY_FAILED" },
      { status: 500 }
    );
  }

  if (!data || !data.auto_detail) {
    return NextResponse.json(
      { ok: false, error: "NO_DIFF_FOUND" },
      { status: 404 }
    );
  }

  const detail: any = data.auto_detail;

  return NextResponse.json({
    ok: true,
    summary: detail.diff_summary ?? "변경된 항목 없음",
    before: detail.before ?? null,
    after: detail.after ?? null,
  });
}

export async function GET(req: NextRequest, context: any) {
  return handleGetDiff(req, context);
}
