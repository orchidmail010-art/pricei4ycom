"use client";

import { useState, useEffect } from "react";

export default function DashboardPage() {
  // ------------------------------
  // 상태 관리
  // ------------------------------
  const [stats, setStats] = useState(null);
  const [weights, setWeights] = useState(null);

  // ------------------------------
  // 1) 자동 처리 통계 로드
  // ------------------------------
  async function loadStats() {
    const res = await fetch("/reports/stats");
    const json = await res.json();
    if (json.ok) setStats(json);
  }

  // ------------------------------
  // 2) AI 가중치 로드
  // ------------------------------
  async function loadWeights() {
    const res = await fetch("/reports/weights");
    const json = await res.json();
    if (json.ok) setWeights(json.data);
  }

  // ------------------------------
  // 3) AI 가중치 저장
  // ------------------------------
  async function saveWeights() {
    const res = await fetch("/reports/weights", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(weights),
    });

    const json = await res.json();
    if (json.ok) alert("가중치 저장 완료!");
  }

  // ------------------------------
  // 초기 데이터 호출
  // ------------------------------
  useEffect(() => {
    loadStats();
    loadWeights();
  }, []);

  // ------------------------------
  // 데이터 로딩 중 UI
  // ------------------------------
  if (!stats || !weights) {
    return <p className="p-4">대시보드 데이터를 불러오는 중...</p>;
  }

  // ------------------------------
  // UI 렌더링
  // ------------------------------
  return (
    <div className="max-w-4xl mx-auto p-4 space-y-10">

      {/* ------------------------------ */}
      {/* 자동 처리 통계 */}
      {/* ------------------------------ */}
      <section className="bg-green-50 border border-green-300 p-4 rounded-lg">
        <p className="font-semibold text-green-900 text-lg">
          자동 처리 품질 요약
        </p>

        <div className="mt-3 space-y-1 text-sm">
          <p>최근 7일 성공: {stats.successCount}건</p>
          <p>최근 7일 실패: {stats.failCount}건</p>
          <p className="font-bold text-xl mt-2">
            성공률: {(stats.successRate * 100).toFixed(1)}%
          </p>
        </div>
      </section>

      {/* ------------------------------ */}
      {/* 오류 유형 요약 */}
      {/* ------------------------------ */}
      <section>
        <p className="font-semibold text-lg mb-2">오류 유형 요약</p>

        <div className="flex flex-wrap gap-2">
          {Object.entries(stats.groupedErrors).map(([type, count]) => (
            <span
              key={type}
              className="px-3 py-1 bg-red-600 text-white rounded-full text-sm"
            >
              {type}: {count}회
            </span>
          ))}
        </div>
      </section>

      {/* ------------------------------ */}
      {/* AI 자동 처리 가중치 설정 */}
      {/* ------------------------------ */}
      <section className="mt-10 p-4 border rounded-lg bg-gray-50">
        <h2 className="text-xl font-bold mb-4">AI 자동 처리 가중치 설정</h2>

        {[
          "weight_similarity",
          "weight_provider",
          "weight_duplicate",
          "weight_priority",
        ].map((key) => (
          <div key={key} className="mb-4">
            <p className="font-semibold mb-1">{key}</p>
            <input
              type="number"
              step="0.1"
              value={weights[key]}
              onChange={(e) =>
                setWeights({ ...weights, [key]: parseFloat(e.target.value) })
              }
              className="border p-2 rounded w-32"
            />
          </div>
        ))}

        <button
          onClick={saveWeights}
          className="mt-4 bg-blue-600 text-white px-4 py-2 rounded"
        >
          저장하기
        </button>
      </section>
    </div>
  );
}
