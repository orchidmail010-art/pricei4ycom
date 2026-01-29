"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabaseBrowser } from "@/lib/supabase/client";

const STATUS_LABEL: Record<string, string> = {
  pending: "대기",
  processing: "검토 중",
  auto_done: "자동 처리 완료",
  completed: "처리 완료",
};

const STATUS_COLOR: Record<string, string> = {
  pending: "bg-gray-100 text-gray-800",
  processing: "bg-blue-100 text-blue-800",
  auto_done: "bg-emerald-100 text-emerald-800",
  completed: "bg-green-100 text-green-800",
};

const PRIORITY_LABEL: Record<string, string> = {
  low: "낮음",
  normal: "보통",
  high: "높음",
};

type MyReportDetailClientProps = {
  report: any;
};

export default function MyReportDetailClient({ report }: MyReportDetailClientProps) {
  const router = useRouter();
  const supabase = supabaseBrowser();

  const [logs, setLogs] = useState<any[]>([]);
  const [loadingLogs, setLoadingLogs] = useState(true);

  useEffect(() => {
    async function loadLogs() {
      setLoadingLogs(true);
      const { data } = await supabase
        .from("report_logs")
        .select("*")
        .eq("report_id", report.id)
        .order("id", { ascending: true });

      setLogs(data || []);
      setLoadingLogs(false);
    }

    loadLogs();
  }, [report.id, supabase]);

  function formatDate(dt: string | null | undefined) {
    if (!dt) return "-";
    return new Date(dt).toLocaleString("ko-KR");
  }

  function logTypeLabel(type: string | null | undefined) {
    if (!type) return "처리 기록";
    const map: Record<string, string> = {
      auto_success: "자동 처리 완료",
      auto_fail: "자동 처리 실패",
      manual_process: "관리자 수동 처리",
      manual_complete: "최종 처리 완료",
    };
    return map[type] || "처리 기록";
  }

  return (
    <div className="max-w-3xl mx-auto p-6 space-y-6">
      {/* 헤더 */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold mb-1">신고 상세</h1>
          <p className="text-sm text-gray-500">
            신고 번호 #{report.id}
          </p>
        </div>

        <div className="flex flex-col items-end gap-2">
          <span
            className={
              "inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold " +
              (STATUS_COLOR[report.status] || "bg-gray-100 text-gray-800")
            }
          >
            {STATUS_LABEL[report.status] || report.status}
          </span>
          <span className="text-xs text-gray-500">
            우선순위:{" "}
            <b>
              {PRIORITY_LABEL[report.priority || "normal"] ||
                (report.priority || "normal")}
            </b>
          </span>
        </div>
      </div>

      {/* 기본 정보 */}
      <section className="border rounded-lg p-4 bg-gray-50 space-y-2">
        <p className="text-sm text-gray-700">
          <span className="font-semibold">병원</span>{" "}
          <span className="ml-2">
            {report.providers?.name || report.provider_id || "-"}
          </span>
        </p>
        <p className="text-sm text-gray-700">
          <span className="font-semibold">신고 유형</span>{" "}
          <span className="ml-2">{report.category || "가격 신고"}</span>
        </p>
        <p className="text-sm text-gray-700">
          <span className="font-semibold">신고일</span>{" "}
          <span className="ml-2">{formatDate(report.created_at)}</span>
        </p>
        <p className="text-sm text-gray-700">
          <span className="font-semibold">마지막 업데이트</span>{" "}
          <span className="ml-2">{formatDate(report.updated_at)}</span>
        </p>
      </section>

      {/* 신고 내용 */}
      <section className="border rounded-lg p-4 bg-white">
        <h2 className="text-lg font-semibold mb-2">신고 내용</h2>
        <p className="text-sm text-gray-800 whitespace-pre-line">
          {report.content}
        </p>
      </section>

      {/* 처리 타임라인 */}
      <section className="border rounded-lg p-4 bg-white">
        <h2 className="text-lg font-semibold mb-3">처리 타임라인</h2>

        {loadingLogs && (
          <p className="text-sm text-gray-500">처리 기록을 불러오는 중...</p>
        )}

        {!loadingLogs && logs.length === 0 && (
          <p className="text-sm text-gray-500">
            아직 등록된 처리 기록이 없습니다.
          </p>
        )}

        {!loadingLogs && logs.length > 0 && (
          <ol className="relative border-l border-gray-200 ml-2">
            {logs.map((log) => (
              <li key={log.id} className="mb-4 ml-4">
                <div className="absolute -left-1.5 mt-1 w-3 h-3 rounded-full bg-emerald-500" />
                <p className="text-xs text-gray-400">
                  {formatDate(log.created_at)}
                </p>
                <p className="text-sm font-semibold text-gray-800">
                  {logTypeLabel(log.type)}{" "}
                  {log.old_status && log.new_status && (
                    <span className="text-xs text-gray-500 ml-1">
                      ({log.old_status} → {log.new_status})
                    </span>
                  )}
                </p>
                {log.explain_text && (
                  <p className="text-sm text-gray-700 mt-1 whitespace-pre-line">
                    {log.explain_text}
                  </p>
                )}
                {log.diff_summary && (
                  <p className="text-xs text-emerald-700 mt-1 bg-emerald-50 inline-block px-2 py-1 rounded">
                    {log.diff_summary}
                  </p>
                )}
              </li>
            ))}
          </ol>
        )}
      </section>

      {/* 뒤로가기 */}
      <div className="flex justify-end">
        <button
          onClick={() => router.back()}
          className="px-4 py-2 rounded border border-gray-300 text-sm text-gray-700 hover:bg-gray-100"
        >
          목록으로 돌아가기
        </button>
      </div>
    </div>
  );
}
