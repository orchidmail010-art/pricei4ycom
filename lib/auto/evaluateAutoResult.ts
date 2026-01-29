import { supabaseAdmin } from "@/lib/supabaseAdmin";

export async function evaluateAutoResult(reportId: number) {
  const supabase = supabaseAdmin();

  // 1. 해당 신고 로그 조회
  const { data: logs } = await supabase
    .from("report_logs")
    .select("*")
    .eq("report_id", reportId)
    .order("created_at", { ascending: false });

  if (!logs || logs.length < 2) return null;

  const latest = logs[0];
  const previous = logs[1];

  // 2. 자동 처리 후 관리자 개입 여부
  const autoWasOverridden =
    previous.type === "auto_done" &&
    latest.type === "manual_done";

  return {
    success: !autoWasOverridden,
  };
}
