import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase/server";

export async function GET() {
  const supabase = supabaseServer();

  // 모든 신고 가져오기
  const { data: reports, error } = await supabase
    .from("reports")
    .select("id, status, priority, created_at");

  if (error) return NextResponse.json({ ok: false, error });

  // ---------------------------
  // 상태별 집계
  // ---------------------------
  const statusCount = {
    pending: 0,
    auto: 0,
    manual: 0,
    completed: 0,
  };

  // ---------------------------
  // 우선순위 집계
  // ---------------------------
  const priorityCount = {
    high: 0,
    normal: 0,
    low: 0,
  };

  // 지난 7일 데이터 계산
  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

  let recent7daysCount = 0;

  reports.forEach((r) => {
    // 상태
    if (statusCount[r.status] !== undefined) statusCount[r.status]++;

    // 우선순위
    if (priorityCount[r.priority] !== undefined) priorityCount[r.priority]++;

    // 최근 7일 처리 완료
    if (r.status === "completed" && new Date(r.created_at) >= sevenDaysAgo) {
      recent7daysCount++;
    }
  });

  // 자동 처리 성공률
  const autoTotal = statusCount.auto;
  const autoCompleted = reports.filter(
    (r) => r.status === "completed"
  ).length;

  const autoSuccessRate =
    autoTotal === 0 ? 0 : Math.round((autoCompleted / autoTotal) * 100);

  return NextResponse.json({
    ok: true,
    data: {
      status: statusCount,
      priority: priorityCount,
      autoSuccessRate,
      autoTotal,
      recent7days: recent7daysCount,
    },
  });
}
