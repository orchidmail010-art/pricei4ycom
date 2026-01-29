"use client";

import { useState, useEffect } from "react";

export default function SlidePreview({ report, onClose, onRefresh }) {
  if (!report) return null;

  const [memo, setMemo] = useState(report.memo || "");
  const [aiResult, setAiResult] = useState(null);
  const [loadingAI, setLoadingAI] = useState(false);
  const [logs, setLogs] = useState([]);
  const [isClosing, setIsClosing] = useState(false);

  // C-52 추가
  const [showManualModal, setShowManualModal] = useState(false);
  const [manualReason, setManualReason] = useState("");

  // -----------------------------
  // 슬라이드 닫기
  // -----------------------------
  function closeWithAnimation() {
    setIsClosing(true);
    setTimeout(() => onClose?.(), 200);
  }

  // -----------------------------
  // 자동 처리 성공 → 상태 completed 전환
  // -----------------------------
  async function handleAutoProcessSuccess() {
    try {
      await fetch(`/reports/${report.id}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "completed" }),
      });

      onRefresh?.();
      closeWithAnimation();
    } catch (e) {
      console.error("상태 업데이트 실패", e);
    }
  }

  // -----------------------------
  // 자동 처리 실행
  // -----------------------------
  async function runAutoProcess() {
    try {
      setLoadingAI(true);

      const res = await fetch(`/reports/${report.id}/auto`, { method: "POST" });
      const json = await res.json();

      setAiResult(json);
      setLoadingAI(false);

      if (json.ok) {
        await handleAutoProcessSuccess();
      } else {
        await loadLogs();
      }
    } catch (e) {
      console.error("자동 처리 실패", e);
      setLoadingAI(false);
    }
  }

  // -----------------------------
  // 로그 불러오기
  // -----------------------------
  async function loadLogs() {
    const res = await fetch(`/reports/${report.id}/logs`);
    const json = await res.json();
    if (json.ok) setLogs(json.data);
  }

  // -----------------------------
  // 메모 저장
  // -----------------------------
  async function saveMemo() {
    try {
      await fetch(`/reports/${report.id}/memo`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ memo }),
      });
      alert("메모 저장 완료!");
    } catch (e) {
      alert("메모 저장 실패");
    }
  }

  // -----------------------------
  // 수동 처리 확정 (C-52)
  // -----------------------------
  async function submitManual() {
    if (!manualReason.trim()) {
      alert("사유를 입력해주세요.");
      return;
    }

    await fetch(`/reports/${report.id}/manual`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ reason: manualReason }),
    });

    onRefresh?.();
    closeWithAnimation();
  }

  // -----------------------------
  // 초기 로드
  // -----------------------------
  useEffect(() => {
    runAutoProcess();
    loadLogs();
  }, [report.id]);

  return (
    <>
      {/* 배경 */}
      <div
        className={
          "fixed inset-0 bg-black/30 backdrop-blur-sm z-50 flex justify-end transition-opacity " +
          (isClosing ? "opacity-0" : "opacity-100")
        }
        onClick={closeWithAnimation}
      >
        {/* 슬라이드 패널 */}
        <div
          className={
            "w-[380px] h-full bg-white shadow-xl flex flex-col p-6 border-l overflow-y-auto transform transition-all " +
            (isClosing ? "translate-x-full" : "translate-x-0")
          }
          onClick={(e) => e.stopPropagation()}
        >
          <button
            onClick={closeWithAnimation}
            className="mb-4 text-sm text-gray-600 hover:text-black"
          >
            닫기
          </button>

          {/* 제목/내용 */}
          <h2 className="text-2xl font-bold mb-2">{report.category}</h2>
          <p className="text-gray-600 mb-6">{report.content}</p>

          {/* 병원 */}
          <div className="bg-gray-100 p-3 rounded mb-6 text-sm">
            <p className="font-semibold mb-1">병원 정보</p>
            <p>{report.provider?.name}</p>
          </div>

          {/* 자동 처리 실행 */}
          <button
            onClick={runAutoProcess}
            className="w-full bg-blue-600 text-white py-2 rounded-lg text-sm mb-4"
          >
            {loadingAI ? "자동 처리 분석 중..." : "자동 처리 실행"}
          </button>

          {/* 실패 로그 */}
          {logs.some((l) => l.type === "auto_fail") && (
            <div className="mb-6 bg-red-100 text-red-700 border border-red-300 p-3 rounded text-sm">
              <p className="font-bold mb-1">⚠ 자동 처리 실패 로그</p>
              {logs
                .filter((l) => l.type === "auto_fail")
                .map((log) => (
                  <p key={log.id} className="text-xs mb-1">
                    • {log.message}
                  </p>
                ))}
            </div>
          )}

          {/* ----------------------------- */}
          {/* C-53: Diff 버튼 */}
          {/* ----------------------------- */}
          <p className="text-sm mt-2 text-blue-600 underline">
            <a
              href={`/reports/${report.id}/diff`}
              target="_blank"
              onClick={(e) => e.stopPropagation()}
            >
              AI 결과 Diff 비교 →
            </a>
          </p>

          {/* 메모 */}
          <h3 className="font-bold text-sm mb-2 mt-6">메모</h3>
          <textarea
            className="w-full border p-2 rounded mb-3 text-sm"
            rows={4}
            value={memo}
            onChange={(e) => setMemo(e.target.value)}
          />
          <button
            onClick={saveMemo}
            className="w-full bg-gray-800 text-white py-2 rounded-lg text-sm"
          >
            메모 저장
          </button>

          {/* 처리 버튼 */}
          <div className="flex gap-2 mt-6">
            {/* 수동 처리 모달 오픈 */}
            <button
              onClick={() => setShowManualModal(true)}
              className="flex-1 py-2 rounded bg-red-600 text-white text-sm"
            >
              수동 처리
            </button>
          </div>
        </div>
      </div>

      {/* ----------------------------- */}
      {/* C-52: 수동 처리 모달 */}
      {/* ----------------------------- */}
      {showManualModal && (
        <div
          className="fixed inset-0 bg-black/40 flex items-center justify-center z-[9999]"
          onClick={() => setShowManualModal(false)}
        >
          <div
            className="bg-white p-6 rounded-lg w-80 text-sm"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="font-bold mb-3 text-lg">수동 처리 사유 입력</h3>

            <textarea
              className="w-full border p-2 rounded mb-3"
              rows={4}
              placeholder="예) 데이터 불일치로 인해 수동 확인 필요"
              value={manualReason}
              onChange={(e) => setManualReason(e.target.value)}
            />

            <button
              onClick={submitManual}
              className="w-full bg-red-600 text-white py-2 rounded mb-2"
            >
              수동 처리 확정
            </button>

            <button
              onClick={() => setShowManualModal(false)}
              className="w-full bg-gray-200 py-2 rounded"
            >
              취소
            </button>
          </div>
        </div>
      )}
    </>
  );
}
