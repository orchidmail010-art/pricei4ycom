"use client";

import ClientDiffViewer from "@/app/reports/components/ClientDiffViewer";

import { useState, useEffect } from "react";
import { supabaseBrowser } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
// ⚠ AI 분석 함수는 기존에 쓰던 import 그대로 두세요.
// import { fetchAIResult } from "...";

export default function ReportDetailClient({ report }: { report: any }) {
  const supabase = supabaseBrowser();
  const router = useRouter();

  const [status, setStatus] = useState(report.status);
  const [memo, setMemo] = useState(report.memo || "");
  const [priority, setPriority] = useState(report.priority || "normal");
  const [logs, setLogs] = useState<any[]>([]);

  const [toast, setToast] = useState("");
  const [selectedLog, setSelectedLog] = useState<any | null>(null);

  // AI 자동 처리 분석 결과
  const [aiResult, setAiResult] = useState<any | null>(null);

  // 자동 처리 버튼 상태 / Diff 슬라이드
  const [autoProcessing, setAutoProcessing] = useState(false);
  const [showDiff, setShowDiff] = useState(false);

  function showToast(msg: string) {
    setToast(msg);
    setTimeout(() => setToast(""), 2000);
  }

  // --------------------------
  // 로그 불러오기
  // --------------------------
  useEffect(() => {
    async function loadLogs() {
      const { data } = await supabase
        .from("report_logs")
        .select("*")
        .eq("report_id", report.id)
        .order("id", { ascending: false });

      if (data) setLogs(data);
    }
    loadLogs();
  }, [report.id, supabase]);

  // --------------------------
  // AI 자동 처리 분석 호출
  // --------------------------
  useEffect(() => {
    async function loadAI() {
      try {
        // @ts-ignore - 기존에 만들어 둔 fetchAIResult 사용
        const result = await fetchAIResult(report.id);
        setAiResult(result);
      } catch (e) {
        console.error("AI 분석 호출 실패", e);
      }
    }
    // @ts-ignore
    if (typeof fetchAIResult === "function") {
      loadAI();
    }
  }, [report.id]);

  // --------------------------
  // 상태 저장 (수동)
  // --------------------------
  async function saveStatus() {
    const { error } = await supabase
      .from("reports")
      .update({
        status,
        memo,
        priority,
      })
      .eq("id", report.id);

    if (!error) {
      showToast("저장 완료");
      router.refresh();
    } else {
      console.error(error);
      showToast("저장 실패");
    }
  }

  // --------------------------
  // 자동 처리 실행 (C-41.4 + C-42 연동)
  // --------------------------
  async function handleAutoProcess() {
    if (autoProcessing) return;
    setAutoProcessing(true);

    try {
      const res = await fetch(`/api/reports/${report.id}/auto`, {
        method: "POST",
      });

      const json = await res.json();
      if (!res.ok || !json.ok) {
        console.error("auto api error:", json);
        showToast("자동 처리 실패");
        return;
      }

      // 상태 변경
      setStatus(json.status);

      // 로그 새로고침
      const { data } = await supabase
        .from("report_logs")
        .select("*")
        .eq("report_id", report.id)
        .order("id", { ascending: false });

      if (data) setLogs(data);

      // Diff 슬라이드 자동 열기
      setShowDiff(true);

      showToast("자동 처리 완료");
      router.refresh();
    } catch (e) {
      console.error(e);
      showToast("자동 처리 중 오류 발생");
    } finally {
      setAutoProcessing(false);
    }
  }

  // ===================================================================
  // JSX 렌더링 시작
  // ===================================================================

  return (
    <div className="max-w-3xl mx-auto p-6 space-y-6">
      <h1 className="text-2xl font-bold">신고 상세</h1>

      {/* ---------------------- 기본 정보 ---------------------- */}
      <div className="p-4 border rounded bg-gray-50 space-y-2">
        <p>카테고리: {report.category}</p>

        <p className="flex items-center gap-2">
          상태:
          <span
            className={`px-2 py-1 rounded text-xs font-semibold border ${
              status === "auto_done"
                ? "bg-green-50 border-green-400 text-green-700 animate-statusPulse"
                : "bg-gray-50 border-gray-300 text-gray-700"
            }`}
          >
            {status}
          </span>
        </p>

        <p>우선순위: {priority}</p>
        <p>내용: {report.content}</p>
        <p>병원: {report.provider?.name}</p>
      </div>

      {/* ---------------------- AI 자동 처리 분석 요약 ---------------------- */}
      {aiResult && aiResult.ok && (
        <div className="p-4 border rounded bg-white shadow-sm bg-gray-50">
          <h3 className="text-lg font-bold mb-2">📌 AI 자동 처리 분석</h3>

          <p>
            자동 처리 점수 : <b>{aiResult.auto.score}</b>
          </p>

          <p>
            중복 점수 : <b>{aiResult.duplicate.score}</b>
          </p>

          <p>
            AI 추천 :{" "}
            <b>{aiResult.recommendation.recommendedAction}</b>
          </p>

          <p className="text-xs text-gray-600 mt-2">
            {aiResult.recommendation.message}
          </p>
        </div>
      )}

      {/* ---------------------- 상태 변경 + 자동 처리 버튼 ---------------------- */}
      <div className="p-4 border rounded space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold">상태 변경</h2>

          {/* 자동 처리 실행 버튼 */}
          <button
            type="button"
            onClick={handleAutoProcess}
            disabled={autoProcessing}
            className={`text-sm px-3 py-1 rounded border ${
              autoProcessing
                ? "bg-gray-200 text-gray-500 cursor-not-allowed"
                : "bg-white hover:bg-gray-100 text-gray-800 border-gray-300"
            }`}
          >
            {autoProcessing ? "자동 처리중..." : "AI 자동 처리 실행"}
          </button>
        </div>

        <select
          className="border p-2 rounded"
          value={status}
          onChange={(e) => setStatus(e.target.value)}
        >
          <option value="pending">대기</option>
          <option value="processing">처리중</option>
          <option value="completed">완료</option>
          <option value="auto_done">자동 처리 완료</option>
        </select>

        <textarea
          className="border p-2 rounded w-full"
          rows={4}
          value={memo}
          onChange={(e) => setMemo(e.target.value)}
          placeholder="메모 입력"
        />

        <select
          className="border p-2 rounded"
          value={priority}
          onChange={(e) => setPriority(e.target.value)}
        >
          <option value="low">낮음</option>
          <option value="normal">보통</option>
          <option value="high">높음</option>
        </select>

        <button
          onClick={saveStatus}
          className="bg-blue-600 text-white rounded px-4 py-2"
        >
          저장
        </button>
      </div>

      {/* ---------------------- 로그 + Diff 보기 버튼 ---------------------- */}
      <div className="p-4 border rounded bg-gray-50">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-lg font-bold">처리 로그</h2>

          <button
            type="button"
            onClick={() => setShowDiff(true)}
            className="text-sm px-3 py-1 rounded border border-gray-300 bg-white hover:bg-gray-100"
          >
            Diff 보기
          </button>
        </div>

        {logs.length === 0 && <p>로그 없음</p>}

        {logs.map((log) => (
          <div key={log.id} className="border-b py-2">
            <p className="text-sm text-gray-700">
              {log.old_status} → {log.new_status}
            </p>
            <p className="text-xs text-gray-500">
              {log.reason || log.explain_text}
            </p>
          </div>
        ))}
      </div>

      {/* ---------------------- 토스트 ---------------------- */}
      {toast && (
        <div className="fixed bottom-10 right-10 bg-black text-white px-4 py-2 rounded">
          {toast}
        </div>
      )}

      {/* ---------------------- Diff 슬라이드 패널 ---------------------- */}
      {showDiff && (
        <ClientDiffViewer
          reportId={report.id}
          onClose={() => setShowDiff(false)}
        />
      )}
    </div>
  );
}
