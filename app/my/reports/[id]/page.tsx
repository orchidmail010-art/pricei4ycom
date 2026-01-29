"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { supabaseBrowser } from "@/lib/supabase/client";

type Report = {
  id: number;
  provider_id: number | null;
  category: string | null;
  content: string | null;
  status: string;
  priority: string | null;
  created_at: string;
  updated_at: string;
};

type Provider = {
  id: number;
  name: string;
};

type ReportLog = {
  id: number;
  report_id: number;
  admin_id: string | null;
  old_status: string | null;
  new_status: string | null;
  reason: string | null;
  auto: boolean | null;
  auto_detail: any | null;
  duplicate_detail: any | null;
  recommendation_detail: any | null;
  diff_summary?: string | null;
  created_at: string;
};

export default function MyReportDetailPage() {
  const { id } = useParams() as { id?: string };
  const router = useRouter();

  const [user, setUser] = useState<any>(null);
  const [report, setReport] = useState<Report | null>(null);
  const [provider, setProvider] = useState<Provider | null>(null);
  const [logs, setLogs] = useState<ReportLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string>("");

  useEffect(() => {
    if (!id) return;

    async function load() {
      setLoading(true);
      setErrorMsg("");

      const supabase = supabaseBrowser(); // 🔹 여기서 생성

      // 1) 로그인 사용자 확인
      const { data: userData } = await supabase.auth.getUser();
      const u = userData?.user || null;
      setUser(u);

      if (!u) {
        setErrorMsg("로그인 후 이용해주세요.");
        setLoading(false);
        return;
      }

      const reportId = Number(id);
      if (!reportId || Number.isNaN(reportId)) {
        setErrorMsg("잘못된 신고 번호입니다.");
        setLoading(false);
        return;
      }

      // 2) 신고 데이터 (본인 소유인지 확인)
      const { data: reportData, error: repErr } = await supabase
        .from("reports")
        .select("*")
        .eq("id", reportId)
        .eq("user_id", u.id)
        .eq("is_active", true)
        .maybeSingle();

      if (repErr || !reportData) {
        setErrorMsg("해당 신고를 찾을 수 없습니다.");
        setLoading(false);
        return;
      }

      setReport(reportData as Report);

      // 3) 병원 + 로그 병렬 로딩
      const [{ data: providerData }, { data: logData }] = await Promise.all([
        reportData.provider_id
          ? supabase
              .from("providers")
              .select("id, name")
              .eq("id", reportData.provider_id)
              .maybeSingle()
          : Promise.resolve({ data: null }),
        supabase
          .from("report_logs")
          .select("*")
          .eq("report_id", reportId)
          .order("id", { ascending: true }),
      ]);

      if (providerData) {
        setProvider(providerData as Provider);
      }

      setLogs((logData || []) as ReportLog[]);
      setLoading(false);
    }

    load();
  }, [id]); // 🔹 supabase 제거

  function formatDate(dt?: string | null) {
    if (!dt) return "-";
    return new Date(dt).toLocaleString("ko-KR");
  }

  function statusLabel(status?: string | null) {
    if (!status) return "알 수 없음";
    const map: Record<string, string> = {
      pending: "접수됨",
      processing: "검토중",
      completed: "처리 완료",
      auto_done: "자동 처리 완료",
    };
    return map[status] || status;
  }

  function logTypeLabel(log: ReportLog) {
    if (log.auto) return "🤖 자동 처리";
    if (log.reason) return log.reason;
    if (log.old_status || log.new_status)
      return `${log.old_status || "?"} → ${log.new_status || "?"}`;
    return "상태 변경";
  }

  // 🔹 상태 → 단계 번호(1~4) 매핑
  function statusStep(status?: string | null): number {
    switch (status) {
      case "pending":
        return 1;
      case "processing":
        return 2;
      case "auto_done":
        return 3;
      case "completed":
        return 4;
      default:
        return 1;
    }
  }

  // 🔹 가장 마지막 자동 처리 로그 + 요약 텍스트 계산
  const lastAutoLog = logs.filter((l) => l.auto).slice(-1)[0];
  const lastAutoDetail = lastAutoLog?.auto_detail || null;
  const lastAutoSummary =
    (lastAutoDetail &&
      (lastAutoDetail.diffSummary || lastAutoDetail.diff_summary)) ||
    lastAutoLog?.diff_summary ||
    null;

  const currentStep = statusStep(report?.status);

  // 🔹 신고 취소 처리 (pending일 때만 버튼 노출)
  async function handleCancel() {
    if (!report || !user) return;
    if (report.status !== "pending") {
      alert("대기 상태인 신고만 취소할 수 있습니다.");
      return;
    }

    const ok = confirm(
      "이 신고를 취소하시겠습니까?\n(취소하면 해당 신고는 목록에서 삭제됩니다.)"
    );
    if (!ok) return;

    const supabase = supabaseBrowser(); // 🔹 여기서도 그때그때 생성
    const { error } = await supabase
      .from("reports")
      .delete()
      .eq("id", report.id)
      .eq("user_id", user.id);

    if (error) {
      alert("신고 취소 실패: " + error.message);
      return;
    }

    alert("신고가 취소되었습니다.");
    router.push("/my/reports");
  }

  if (loading) {
    return (
      <div className="max-w-3xl mx-auto p-6">
        <p className="text-gray-500">불러오는 중...</p>
      </div>
    );
  }

  if (errorMsg || !report) {
    return (
      <div className="max-w-3xl mx-auto p-6 space-y-4">
        <p className="text-red-500 text-sm">
          {errorMsg || "조회 실패"}
        </p>
        <button
          onClick={() => router.push("/my/reports")}
          className="px-4 py-2 bg-gray-200 rounded"
        >
          목록으로
        </button>
      </div>
    );
  }

  const canCancel = report.status === "pending";

  return (
    <div className="max-w-3xl mx-auto p-6 space-y-6">
      {/* 상단 헤더 */}
      <div className="flex items-center justify-between gap-2">
        <h1 className="text-2xl font-bold">내 신고 상세</h1>
        <div className="flex gap-2">
          {canCancel && (
            <button
              onClick={handleCancel}
              className="px-3 py-1 text-xs rounded bg-red-500 text-white"
            >
              신고 취소하기
            </button>
          )}
          <button
            onClick={() => router.push("/my/reports")}
            className="px-3 py-1 text-sm rounded bg-gray-200"
          >
            목록으로
          </button>
        </div>
      </div>

      {/* 🔹 처리 단계 스텝 바 */}
      <section className="border rounded-lg p-3 bg-gray-50">
        <p className="text-xs text-gray-500 mb-2">처리 단계</p>
        <div className="flex items-center justify-between text-[11px]">
          {[
            { key: 1, label: "접수" },
            { key: 2, label: "검토 중" },
            { key: 3, label: "자동 처리 완료" },
            { key: 4, label: "최종 완료" },
          ].map((step, idx, arr) => {
            const active = currentStep >= step.key;
            return (
              <div key={step.key} className="flex-1 flex items-center">
                <div className="flex flex-col items-center">
                  <div
                    className={
                      "w-5 h-5 rounded-full border text-[10px] flex items-center justify-center " +
                      (active
                        ? "bg-emerald-600 border-emerald-600 text-white"
                        : "bg-white border-gray-300 text-gray-400")
                    }
                  >
                    {step.key}
                  </div>
                  <span
                    className={
                      "mt-1 " +
                      (active ? "text-emerald-700" : "text-gray-400")
                    }
                  >
                    {step.label}
                  </span>
                </div>
                {idx < arr.length - 1 && (
                  <div
                    className={
                      "flex-1 h-px mx-1 " +
                      (currentStep > step.key
                        ? "bg-emerald-400"
                        : "bg-gray-200")
                    }
                  />
                )}
              </div>
            );
          })}
        </div>
      </section>

      {/* 기본 정보 카드 */}
      <section className="border rounded-lg p-4 bg-white shadow-sm">
        <p className="text-xs text-gray-400 mb-1">
          상태:{" "}
          <b className="text-gray-800">
            {statusLabel(report.status)}
          </b>{" "}
          / 우선순위:{" "}
          <b className="text-gray-800">
            {report.priority || "normal"}
          </b>
        </p>

        <h2 className="text-lg font-semibold mb-1">
          {report.category || "가격 오류"}
        </h2>

        <p className="text-sm text-gray-600 mb-2">
          병원: {provider?.name || (report.provider_id ?? "-")}
        </p>

        <p className="text-sm text-gray-800 whitespace-pre-line">
          {report.content}
        </p>

        <p className="mt-3 text-xs text-gray-400">
          신고일: {formatDate(report.created_at)} / 최근 수정:{" "}
          {formatDate(report.updated_at)}
        </p>
      </section>

      {/* 🔹 자동 처리 요약 카드 (있을 때만 표시) */}
      {lastAutoLog && lastAutoSummary && (
        <section className="border rounded-lg p-4 bg-emerald-50 shadow-sm">
          <h3 className="text-sm font-semibold text-emerald-800 mb-1">
            🤖 자동 처리 요약
          </h3>
          <p className="text-xs text-emerald-900">
            {lastAutoSummary}
          </p>
          <p className="mt-2 text-[11px] text-emerald-700">
            처리 시각: {formatDate(lastAutoLog.created_at)}
          </p>
        </section>
      )}

      {/* 처리 타임라인 */}
      <section className="border rounded-lg p-4 bg-white shadow-sm">
        <h3 className="text-lg font-semibold mb-3">처리 타임라인</h3>

        {logs.length === 0 && (
          <p className="text-sm text-gray-500">
            아직 처리 로그가 없습니다.
          </p>
        )}

        <div className="space-y-3">
          {logs.map((log) => {
            const autoDetail = log.auto_detail || {};
            const diffSummary =
              (autoDetail &&
                (autoDetail.diffSummary || autoDetail.diff_summary)) ||
              log.diff_summary ||
              log.reason;

            return (
              <div
                key={log.id}
                className="border rounded-md p-3 bg-gray-50"
              >
                <div className="flex justify-between items-start">
                  <div>
                    <p className="text-xs text-gray-400">
                      {formatDate(log.created_at)}
                    </p>
                    <p className="text-sm font-semibold mt-1">
                      {logTypeLabel(log)}
                    </p>
                    {(log.old_status || log.new_status) && (
                      <p className="text-xs text-gray-600 mt-1">
                        상태:{" "}
                        <b>{statusLabel(log.old_status)}</b> →{" "}
                        <b>{statusLabel(log.new_status)}</b>
                      </p>
                    )}
                    {diffSummary && (
                      <p className="text-xs text-gray-700 mt-1">
                        요약: {diffSummary}
                      </p>
                    )}
                  </div>

                  {log.auto && (
                    <span className="px-2 py-1 text-[10px] text-white bg-emerald-600 rounded">
                      자동
                    </span>
                  )}
                </div>

                {/* 자동 처리 상세 */}
                {log.auto && autoDetail && (
                  <details className="mt-2 text-xs">
                    <summary className="cursor-pointer text-emerald-700">
                      자동 처리 상세 보기
                    </summary>
                    <div className="mt-2 grid grid-cols-1 md:grid-cols-2 gap-2">
                      <div>
                        <p className="font-semibold mb-1">Before</p>
                        <pre className="bg-white rounded p-2 border overflow-x-auto whitespace-pre-wrap">
                          {JSON.stringify(
                            autoDetail.before ?? {},
                            null,
                            2
                          )}
                        </pre>
                      </div>
                      <div>
                        <p className="font-semibold mb-1">After</p>
                        <pre className="bg-white rounded p-2 border overflow-x-auto whitespace-pre-wrap">
                          {JSON.stringify(
                            autoDetail.after ?? {},
                            null,
                            2
                          )}
                        </pre>
                      </div>
                    </div>
                  </details>
                )}
              </div>
            );
          })}
        </div>
      </section>
    </div>
  );
}
