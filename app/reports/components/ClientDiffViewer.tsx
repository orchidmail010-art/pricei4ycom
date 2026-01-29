"use client";

import { useEffect, useState } from "react";

type DiffData = {
  summary: string;
  before: any;
  after: any;
};

export default function ClientDiffViewer({
  reportId,
  onClose,
}: {
  reportId: number;
  onClose?: () => void;
}) {
  const [loading, setLoading] = useState(true);
  const [diff, setDiff] = useState<DiffData | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!reportId) return;

    async function load() {
      setLoading(true);
      setError(null);

      try {
        const res = await fetch(`/api/reports/${reportId}/diff`);
        const json = await res.json();

        if (!res.ok || !json.ok) {
          setError(json.error || "diff 조회 실패");
          setDiff(null);
        } else {
          setDiff({
            summary: json.summary,
            before: json.before,
            after: json.after,
          });
        }
      } catch (e) {
        console.error(e);
        setError("diff 조회 중 오류 발생");
        setDiff(null);
      } finally {
        setLoading(false);
      }
    }

    load();
  }, [reportId]);

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-end bg-black/40">
      <div className="h-full w-full max-w-xl bg-white shadow-xl flex flex-col animate-fadeIn">
        {/* 헤더 */}
        <div className="flex items-center justify-between px-4 py-3 border-b">
          <h2 className="text-base font-semibold">자동 처리 Diff 결과</h2>
          {onClose && (
            <button
              type="button"
              onClick={onClose}
              className="text-sm text-gray-500 hover:text-gray-800"
            >
              닫기
            </button>
          )}
        </div>

        {/* 본문 */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3 text-sm">
          {loading && <p className="text-gray-500">불러오는 중...</p>}

          {error && !loading && (
            <p className="text-red-600 whitespace-pre-line">{error}</p>
          )}

          {diff && !loading && !error && (
            <>
              <div className="p-3 rounded border bg-green-50">
                <p className="text-xs font-semibold text-green-700">
                  자동 처리 결과 요약
                </p>
                <p className="mt-1 text-sm text-green-800">
                  {diff.summary}
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                <div className="p-2 rounded border bg-gray-50">
                  <p className="font-semibold mb-1 text-gray-700">Before</p>
                  <pre className="whitespace-pre-wrap break-all">
                    {JSON.stringify(diff.before, null, 2)}
                  </pre>
                </div>
                <div className="p-2 rounded border bg-gray-50">
                  <p className="font-semibold mb-1 text-gray-700">After</p>
                  <pre className="whitespace-pre-wrap break-all">
                    {JSON.stringify(diff.after, null, 2)}
                  </pre>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
