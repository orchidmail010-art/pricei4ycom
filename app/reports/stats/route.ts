import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase/server";

export async function GET() {
  const supabase = supabaseServer();

  // 최근 7일 기준
  const since = new Date();
  since.setDate(since.getDate() - 7);

  // ------------------------------
  // 1) 최근 7일 성공 처리된 신고 개수
  // ------------------------------
  const { data: completed } = await supabase
    .from("reports")
    .select("id, status")
    .eq("status", "completed")
    .gte("updated_at", since.toISOString());

  // ------------------------------
  // 2) 최근 7일 자동 처리 실패 로그
  // ------------------------------
  const { data: failedLogs } = await supabase
    .from("report_logs")
    .select("id, type, message, created_at")
    .eq("type", "error")
    .gte("created_at", since.toISOString());

  // ------------------------------
  // 3) 오류 유형별 집계
  // ------------------------------
  const groupedErrors = {};
  failedLogs?.forEach((log) => {
    const key = log.type || "unknown";
    groupedErrors[key] = (groupedErrors[key] || 0) + 1;
  });

  // ------------------------------
  // 4) 성공률 계산
  // ------------------------------
  const successCount = completed?.length || 0;
  const failCount = failedLogs?.length || 0;
  const total = successCount + failCount;
  const successRate = total === 0 ? 0 : successCount / total;

  return NextResponse.json({
    ok: true,
    successCount,
    failCount,
    successRate,
    groupedErrors,
  });
}
