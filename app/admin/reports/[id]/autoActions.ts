'use server';

import { supabaseServer } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { notifyHighRisk } from "@/lib/notify/highRisk";


// 🔧 위험도 기준값 (프론트와 동일하게 유지)
import { REPORT_RISK } from "@/lib/constants/reportRisk";


// 🔧 AI 추천 → 상태 매핑
function mapRecommendationToStatus(recommendation: string | null) {
  if (!recommendation) return "manual_required";

  const r = recommendation.toLowerCase();

  if (r.includes("승인") || r.includes("approve")) return "completed";
  if (r.includes("반려") || r.includes("reject")) return "rejected";
  if (r.includes("검토") || r.includes("manual")) return "manual_required";

  return "manual_required";
}

export async function autoProcessReport(reportId: number) {
  const supabase = supabaseServer();

  // 1️⃣ 현재 신고 데이터 조회
  const { data, error } = await supabase
    .from("reports")
    .select(
      "id, status, recommendation, auto_process_available, anomaly_score"
    )
    .eq("id", reportId)
    .maybeSingle();

  if (error || !data) {
    throw new Error("신고 데이터를 찾을 수 없습니다.");
  }

  // 2️⃣ 자동 처리 가능 여부 체크
  if (!data.auto_process_available) {
    throw new Error("자동 처리가 허용되지 않은 신고입니다.");
  }

  // 3️⃣ 🔒 고위험 서버 차단 (이중 안전장치)
 if ((data.anomaly_score ?? 0) >= REPORT_RISK.HIGH_ANOMALY) {
  await notifyHighRisk(reportId, data.anomaly_score);
  throw new Error("고위험 신고는 자동 처리할 수 없습니다.");
}



  // 4️⃣ 추천 결과 → 다음 상태 결정
  const nextStatus = mapRecommendationToStatus(data.recommendation);

  // 5️⃣ 상태 업데이트
  const { error: updateError } = await supabase
    .from("reports")
    .update({
      status: nextStatus,
      updated_at: new Date().toISOString(),
    })
    .eq("id", reportId);

  if (updateError) {
    throw new Error(updateError.message);
  }

  // 6️⃣ 🔹 처리 이력 로그 기록 (네 DB 구조 기준)
  await supabase.from("report_logs").insert({
    report_id: reportId,
    admin_id: null,
    old_status: data.status,
    new_status: nextStatus,
    auto: true,
    reason: "AI 자동 처리",
    recommendation_detail: data.recommendation,
    created_at: new Date().toISOString(),
  });

  // 7️⃣ 캐시 갱신
  revalidatePath(`/admin/reports/${reportId}`);
  revalidatePath(`/admin/reports`);
}
