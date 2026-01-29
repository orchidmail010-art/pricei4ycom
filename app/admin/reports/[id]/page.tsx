import Link from "next/link";
import { supabaseServer } from "@/lib/supabase/server";
import { updateReportStatus } from "./actions";
import { autoProcessReport } from "./autoActions";
// 🔧 위험도 기준값 (운영 중 여기만 조정)
import { REPORT_RISK } from "@/lib/constants/reportRisk";



export default async function AdminReportDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const resolvedParams = await params;
  const id = Number(resolvedParams.id);

  if (!id || Number.isNaN(id)) {
    return (
      <div style={{ padding: 40, color: "red" }}>
        잘못된 신고 ID 입니다.
        <pre>{JSON.stringify(resolvedParams, null, 2)}</pre>
      </div>
    );
  }

  const supabase = supabaseServer();

  // 🔹 신고 데이터
  const { data, error } = await supabase
    .from("reports")
    .select(`
      id,
      status,
      recommendation,
      anomaly_score,
      duplicate_score,
      auto_process_available,
      ai_summary,
      diff_summary,
      score_detail,
      before_json,
      after_json,
      created_at,
      updated_at
    `)
    .eq("id", id)
    .eq("is_active", true) // ✅ 테스트 신고 차단
    .maybeSingle();
    
console.log('report data:', data);


  if (error) {
    return (
      <div style={{ padding: 40, color: "red" }}>
        DB 에러
        <pre>{JSON.stringify(error, null, 2)}</pre>
      </div>
    );
  }

  if (!data) {
    return <div style={{ padding: 40 }}>신고 데이터를 찾을 수 없습니다.</div>;
  }

  // 🔴 위험도 계산 (여기에 추가)
  const isHighRisk =
    data.status === "pending" &&
    (data.anomaly_score ?? 0) >= REPORT_RISK.HIGH_ANOMALY;

  const isMediumRisk =
    data.status === "pending" &&
    (data.duplicate_score ?? 0) >= REPORT_RISK.MEDIUM_DUPLICATE;



  // 🔹 처리 이력 로그
  const { data: logs } = await supabase
    .from("report_logs")
    .select(`
      id,
      old_status,
      new_status,
      auto,
      reason,
      recommendation_detail,
      created_at
    `)
    .eq("report_id", id)
    .order("created_at", { ascending: false });

  return (
    <div className="max-w-4xl mx-auto px-6 py-10 space-y-6">
      {/* 상단 이동 */}
      <Link
        href="/admin/reports"
        className="inline-block px-3 py-1 border rounded text-sm hover:bg-gray-50"
      >
        ← 신고 목록
      </Link>

      <h1 className="text-2xl font-bold">관리자 신고 상세</h1>
          {/* 🔥 위험도 경고 박스 */}
            {isHighRisk && (
              <div className="border border-red-300 bg-red-50 text-red-800 rounded p-3">
                🚨 <b>고위험 신고</b> — 이상치 점수가 매우 높습니다. 자동 처리를 신중히 검토하세요.
              </div>
            )}

            {!isHighRisk && isMediumRisk && (
              <div className="border border-yellow-300 bg-yellow-50 text-yellow-800 rounded p-3">
                ⚠️ <b>주의 신고</b> — 중복 가능성이 있습니다. 세부 내용을 확인하세요.
              </div>
            )}


      {/* 기본 정보 */}
      <section className="border rounded p-4 space-y-1">
        <p><b>ID:</b> {data.id}</p>
        <p><b>상태:</b> {data.status}</p>
        <p><b>자동 처리 가능:</b> {String(data.auto_process_available)}</p>
        <p><b>이상치 점수:</b> {data.anomaly_score}</p>
        <p><b>중복 점수:</b> {data.duplicate_score}</p>
        <p><b>작성일:</b> {new Date(data.created_at).toLocaleString()}</p>
      </section>

      {/* AI 자동 처리 */}
      {/* 🔥 AI 자동 처리 미리보기 */}
      {/* 🔥 AI 자동 처리 미리보기 */}
        {data.auto_process_available && data.status === "pending" && (
          <section className="border rounded p-4 bg-blue-50 space-y-3">
            <h2 className="font-semibold text-blue-700">
              AI 자동 처리 미리보기
            </h2>

            {/* 추천 요약 */}
            <div className="text-sm space-y-1">
              <p>
                <b>추천 결과:</b>{" "}
                <span className="text-blue-800">
                  {data.recommendation ?? "수동 검토"}
                </span>
              </p>
              <p>
                <b>이상치 점수:</b> {data.anomaly_score ?? "-"}
              </p>
              <p>
                <b>중복 점수:</b> {data.duplicate_score ?? "-"}
              </p>
            </div>

            {/* 경고 문구 */}
            {isHighRisk && (
              <div className="text-sm text-red-700 bg-red-100 border border-red-300 rounded p-2">
                🚫 고위험 신고로 분류되어 <b>자동 처리가 잠금</b>되었습니다.
                <br />
                수동 검토 후 처리하세요.
              </div>
            )}

            {/* AI 요약 */}
            {data.ai_summary && (
              <div className="text-sm bg-white border rounded p-2">
                <b>AI 판단 요약</b>
                <p className="mt-1 text-gray-700 whitespace-pre-line">
                  {data.ai_summary}
                </p>
              </div>
            )}

            {/* 변경 요약 */}
            {data.diff_summary && (
              <div className="text-sm bg-white border rounded p-2">
                <b>변경 요약</b>
                <pre className="mt-1 text-xs text-gray-700 whitespace-pre-wrap">
                  {data.diff_summary}
                </pre>
              </div>
            )}

            {/* 실행 버튼 (고위험이면 비활성) */}
            <form action={autoProcessReport.bind(null, data.id)}>
              <button
                type="submit"
                disabled={isHighRisk}
                className={`w-full px-4 py-2 rounded text-sm ${
                  isHighRisk
                    ? "bg-gray-300 text-gray-600 cursor-not-allowed"
                    : "bg-blue-600 text-white"
                }`}
              >
                AI 추천대로 처리
              </button>
            </form>

            <p className="text-xs text-gray-600">
              ※ 고위험 신고는 자동 처리가 비활성화됩니다.
            </p>
          </section>
        )}



      {/* 관리자 수동 처리 */}
      <section className="border rounded p-4 space-y-2">
        <h2 className="font-semibold">관리자 처리</h2>

        <form action={updateReportStatus.bind(null, data.id, "completed")}>
          <button className="w-full px-4 py-2 bg-green-600 text-white rounded text-sm">
            승인 처리
          </button>
        </form>

        <form action={updateReportStatus.bind(null, data.id, "manual_required")}>
          <button className="w-full px-4 py-2 bg-yellow-500 text-white rounded text-sm">
            수동 검토
          </button>
        </form>

        <form action={updateReportStatus.bind(null, data.id, "rejected")}>
          <button className="w-full px-4 py-2 bg-red-600 text-white rounded text-sm">
            반려
          </button>
        </form>
      </section>

      {/* AI 요약 */}
      <section className="border rounded p-4">
        <h2 className="font-semibold mb-2">AI 요약</h2>
        <p>{data.ai_summary || "없음"}</p>
      </section>

      {/* 변경 요약 */}
      <section className="border rounded p-4">
        <h2 className="font-semibold mb-2">변경 요약 (Diff)</h2>
        <pre className="text-sm bg-gray-50 p-3 rounded">
          {data.diff_summary || "없음"}
        </pre>
      </section>

      {/* 처리 이력 */}
      <section className="border rounded p-4">
        <h2 className="font-semibold mb-2">처리 이력</h2>

        {!logs || logs.length === 0 ? (
          <p className="text-sm text-gray-500">처리 이력이 없습니다.</p>
        ) : (
          <ul className="space-y-2 text-sm">
            {logs.map((log) => (
              <li key={log.id} className="border rounded p-2">
                <div className="flex justify-between">
                  <span>
                    [{log.auto ? "자동" : "수동"}]{" "}
                    {log.old_status} → <b>{log.new_status}</b>
                  </span>
                  <span className="text-gray-500">
                    {new Date(log.created_at).toLocaleString()}
                  </span>
                </div>

                {log.reason && (
                  <div className="text-xs text-gray-600 mt-1">
                    사유: {log.reason}
                  </div>
                )}

                {log.recommendation_detail && (
                  <div className="text-xs text-blue-700 mt-1">
                    AI 추천: {log.recommendation_detail}
                  </div>
                )}
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
