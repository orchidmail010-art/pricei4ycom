'use server';

import { supabaseServer } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

export async function updateReportStatus(
  reportId: number,
  nextStatus: string
) {
  const supabase = supabaseServer();

  // 1. 이전 상태 조회
  const { data } = await supabase
    .from("reports")
    .select("status")
    .eq("id", reportId)
    .maybeSingle();

  const prevStatus = data?.status ?? null;

  // 2. 상태 업데이트
  const { error } = await supabase
    .from("reports")
    .update({
      status: nextStatus,
      updated_at: new Date().toISOString(),
    })
    .eq("id", reportId);

  if (error) throw new Error(error.message);

  // 3. 🔹 로그 기록
  await supabase.from("report_logs").insert({
    report_id: reportId,
    admin_id: null,
    old_status: prevStatus,
    new_status: nextStatus,
    auto: false,
    reason: "관리자 수동 처리",
    created_at: new Date().toISOString(),
  });

  revalidatePath(`/admin/reports/${reportId}`);
  revalidatePath(`/admin/reports`);
}
