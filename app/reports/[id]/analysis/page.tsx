"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";

export default function ReportAnalysisPage() {
  const { id } = useParams();
  const router = useRouter();

  const [report, setReport] = useState(null);
  const [analysis, setAnalysis] = useState(null);

  // ----------------------------
  // 데이터 불러오기
  // ----------------------------
  async function loadAnalysis() {
    const res = await fetch(`/reports/${id}/analysis/api`);
    const json = await res.json();

    if (json.ok) {
      setReport(json.report);
      setAnalysis(json.analysis);
    }
  }

  useEffect(() => {
    loadAnalysis();
  }, []);

  if (!report || !analysis) {
    return <p className="p-4 text-gray-600">AI 분석 데이터를 불러오는 중...</p>;
  }

  return (
    <div className="max-w-3xl mx-auto p-6 space-y-6">

      {/* 뒤로가기 */}
      <button
        onClick={() => router.back()}
        className="text-sm text-gray-600 hover:underline"
      >
        ← 돌아가기
      </button>

      <h1 className="text-2xl font-bold mb-2">
        신고 #{report.id} 자동 처리 상세 분석
      </h1>

      {/* 기본정보 */}
      <div className="p-4 border rounded bg-gray-50 space-y-1">
        <p><b>카테고리:</b> {report.category}</p>
        <p><b>내용:</b> {report.content}</p>
        <p><b>병원:</b> {report.provider?.name}</p>
      </div>

      {/* 점수 */}
      <div className="p-4 border rounded bg-blue-50">
        <h2 className="font-bold mb-2">🔢 자동 처리 점수 분석</h2>

        <p className="mt-2">자동 처리 점수: <b>{analysis.auto.score}</b></p>
        <p>중복 점수: <b>{analysis.duplicate.score}</b></p>

        <div className="mt-3">
          <p className="font-semibold">추천 결과:</p>
          <p className="text-lg font-bold mt-1">
            {analysis.recommendation.recommendedAction}
          </p>
          <p className="text-gray-600 mt-1">
            “{analysis.recommendation.message}”
          </p>
        </div>
      </div>

      {/* 중복 신고 리스트 */}
      <div className="p-4 border rounded bg-gray-50">
        <h2 className="font-bold mb-2">📌 유사 신고 목록</h2>

        {analysis.duplicate.matched.length === 0 && (
          <p className="text-sm text-gray-600">유사 신고 없음</p>
        )}

        {analysis.duplicate.matched.map((m, i) => (
          <div key={i} className="p-3 mt-2 border rounded bg-white">
            <p className="text-xs text-gray-500 mb-1">
              ID: {m.id} / 유사도 {Math.round(m.similarity * 100)}%
            </p>
            <p className="text-sm">{m.content}</p>
          </div>
        ))}
      </div>

      {/* 전체 JSON 보기 */}
      <details className="p-4 border rounded bg-gray-100">
        <summary className="font-bold cursor-pointer">전체 AI 분석 JSON 보기</summary>

        <pre className="text-xs mt-3 p-3 bg-black text-green-300 rounded overflow-auto">
{JSON.stringify(analysis, null, 2)}
        </pre>
      </details>
    </div>
  );
}
