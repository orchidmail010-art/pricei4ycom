"use client";

import { useState } from "react";

export default function ReportCard({ report, onClick, onAutoProcessed }) {
  const last = report.lastLog;
  const [autoLoading, setAutoLoading] = useState(false);

  // 날짜 포맷
  function formatDate(dt) {
    if (!dt) return "-";
    return new Date(dt).toLocaleString("ko-KR");
  }

  // 로그 요약 문구
  function logSummary(log) {
    if (!log) return "기록 없음";

    const map = {
      auto_fail: "자동 처리 실패",
      auto_success: "자동 처리 성공",
      manual_process: "관리자 수동 처리",
      manual_complete: "처리 완료",
    };

    return map[log.type] || "처리 로그";
  }

  // 상태 뱃지 (수동/자동 처리 완료 구분)
  function renderStatusBadge() {
    const status = report.status;

    let label = "대기";
    let className =
      "px-2 py-1 text-xs rounded border font-semibold bg-gray-100 text-gray-700 border-gray-400";

    if (status === "auto_done") {
      label = "자동 처리 완료";
      className =
        "px-2 py-1 text-xs rounded border font-semibold bg-green-100 text-green-700 border-green-500";
    } else if (status === "completed") {
      label = "수동 처리 완료";
      className =
        "px-2 py-1 text-xs rounded border font-semibold bg-blue-100 text-blue-700 border-blue-500";
    } else if (status === "processing") {
      label = "처리중";
      className =
        "px-2 py-1 text-xs rounded border font-semibold bg-yellow-100 text-yellow-700 border-yellow-500";
    }

    return <span className={className}>{label}</span>;
  }

  // 🔹 목록에서 바로 AI 자동 처리 실행
  async function handleAutoProcess(e) {
    e.stopPropagation();
    if (autoLoading) return;
    setAutoLoading(true);

    try {
      const res = await fetch(`/api/reports/${report.id}/auto`, {
        method: "POST",
      });
      const json = await res.json();

      if (!res.ok || !json.ok) {
        console.error("자동 처리 실패:", json);
        alert("자동 처리 실패");
        return;
      }

      // 부모에서 목록 새로고침
      if (onAutoProcessed) {
        onAutoProcessed(json);
      }

      // 간단 알림
      // 필요하면 토스트로 바꿔도 됨
      console.log("자동 처리 완료:", json);
    } catch (err) {
      console.error(err);
      alert("자동 처리 중 오류가 발생했습니다.");
    } finally {
      setAutoLoading(false);
    }
  }

  return (
    <div
      onClick={onClick}
      className="border rounded-lg p-4 shadow-sm hover:shadow-md transition cursor-pointer bg-white"
    >
      {/* 상단: 상태 + 우선순위 */}
      <div className="flex justify-between items-center mb-2">
        {renderStatusBadge()}
        <span className="text-xs text-gray-400">
          {report.priority?.toUpperCase()}
        </span>
      </div>

      {/* 카테고리 */}
      <h3 className="text-lg font-semibold">{report.category}</h3>

      {/* 내용 일부 */}
      <p className="text-gray-600 text-sm mt-1 line-clamp-2">
        {report.content}
      </p>

      {/* 병원 이름 */}
      <p className="text-sm text-gray-500 mt-2">
        병원: {report.provider?.name}
      </p>

      {/* ------------------------------ */}
      {/* 버튼들: AI 분석 / Diff / AI 자동 처리 */}
      {/* ------------------------------ */}
      <div className="flex gap-3 items-center mt-2 text-xs">
        <a
          href={`/reports/${report.id}/analysis`}
          className="text-blue-600 underline"
          onClick={(e) => e.stopPropagation()}
        >
          AI 분석 보기
        </a>

        <a
          href={`/reports/${report.id}/diff`}
          className="text-blue-600 underline"
          onClick={(e) => e.stopPropagation()}
        >
          Diff 보기
        </a>

        <button
          type="button"
          onClick={handleAutoProcess}
          className="px-2 py-1 border rounded text-xs bg-white hover:bg-gray-100"
          disabled={autoLoading}
        >
          {autoLoading ? "자동 처리중..." : "AI 자동 처리"}
        </button>
      </div>

      {/* ------------------------------ */}
      {/* 최근 로그 / 최근 변경 */}
      {/* ------------------------------ */}
      <div className="mt-3 border-t pt-2 text-xs text-gray-600">
        <p>최근 변경: {formatDate(report.updated_at)}</p>

        {last ? (
          <p className="text-gray-700 mt-1">
            최근 로그: <span className="font-medium">{logSummary(last)}</span>
          </p>
        ) : (
          <p className="text-gray-400">최근 로그 없음</p>
        )}
      </div>
    </div>
  );
}
