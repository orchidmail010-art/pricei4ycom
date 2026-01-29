import { createClient } from "@supabase/supabase-js";
import ReportDetailClient from "./ReportDetailClient";

export default async function ReportDetailPage(props: any) {
  // ⭐ Next.js 16에서는 params가 Promise라서 await 필요
  const { id } = await props.params;
  const reportId = Number(id);

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  const { data: report, error } = await supabase
    .from("reports")
    .select(
      `
      id,
      content,
      status,
      priority,
      memo,
      category,
      auto_score,
      anomaly_score,
      auto_process_available,
      score_detail,
      provider:provider_id (
        id,
        name,
        region
      )
      `
    )
    .eq("id", reportId)
    .eq("is_active", true)
    .single();

  if (error || !report) {
    return <div>데이터를 가져올 수 없습니다.</div>;
  }

  return <ReportDetailClient report={report} />;
}
