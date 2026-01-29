"use client";

import { useState, useEffect, useMemo } from "react";
import ReportCard from "./components/ReportCard";
import SlidePreview from "./components/SlidePreview";
import { supabaseBrowser } from "@/lib/supabase/client";

export default function ReportsPage() {
  const [reports, setReports] = useState([]);
  const [selected, setSelected] = useState(null);

  const [filter, setFilter] = useState("all"); // all | auto | completed
  const [sort, setSort] = useState("latest"); // latest | priority
  const [search, setSearch] = useState("");   // 🔹 검색어

  // ----------------------------
  // API 로딩 함수
  // ----------------------------
  async function loadReports() {
    const realFilter = filter === "all" ? "" : filter;

    const res = await fetch(
      `/reports/api?filter=${realFilter}&sort=${sort}`,
      { cache: "no-store" }
    );

    const json = await res.json();

    console.log("📌 /reports/api 응답:", json);

    if (json.ok && Array.isArray(json.data)) {
      setReports(json.data);
    } else {
      setReports([]); // 안전 처리
    }
  }

  // ----------------------------
  // 최초 / 필터 / 정렬 변경 시 로딩
  // ----------------------------
  useEffect(() => {
    loadReports();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filter, sort]);

  // ----------------------------
  // Realtime Sync (C-49 핵심)
  // ----------------------------
  useEffect(() => {
    const supabase = supabaseBrowser();

    // 브라우저 환경 아닐 때 보호
    if (!supabase) return;

    const channel = supabase
      .channel("reports-changes")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "reports",
        },
        (payload) => {
          console.log("🔄 실시간 변경 감지:", payload);
          loadReports(); // 자동 새로고침
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ----------------------------
  // 검색어 기반 클라이언트 필터링
  // ----------------------------
  const filteredReports = useMemo(() => {
    const keyword = search.trim();
    if (!keyword) return reports;

    return reports.filter((r: any) => {
      const haystack =
        (r.category || "") +
        (r.content || "") +
        (r.provider?.name || "");

      return haystack.includes(keyword);
    });
  }, [reports, search]);

  return (
    <div className="max-w-3xl mx-auto p-4">
      {/* 상단: 제목 + 검색 */}
      <div className="flex flex-col gap-2 mb-4">
        <h1 className="text-xl font-bold">신고 목록</h1>

        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="카테고리, 내용, 병원명으로 검색"
          className="border rounded px-3 py-2 text-sm w-full"
        />
      </div>

      {/* 필터 */}
      <div className="flex gap-2 mb-4">
        <button
          onClick={() => setFilter("all")}
          className={
            "px-3 py-1 rounded text-sm " +
            (filter === "all"
              ? "bg-black text-white"
              : "bg-gray-200 text-gray-700")
          }
        >
          전체
        </button>

        <button
          onClick={() => setFilter("auto")}
          className={
            "px-3 py-1 rounded text-sm " +
            (filter === "auto"
              ? "bg-blue-600 text-white"
              : "bg-gray-200 text-gray-700")
          }
        >
          자동 처리 가능
        </button>

        <button
          onClick={() => setFilter("completed")}
          className={
            "px-3 py-1 rounded text-sm " +
            (filter === "completed"
              ? "bg-green-600 text-white"
              : "bg-gray-200 text-gray-700")
          }
        >
          처리 완료
        </button>
      </div>

      {/* 정렬 */}
      <div className="flex gap-2 mb-6">
        <button
          onClick={() => setSort("latest")}
          className={
            "px-3 py-1 rounded text-sm " +
            (sort === "latest"
              ? "bg-black text-white"
              : "bg-gray-200 text-gray-700")
          }
        >
          최신순
        </button>

        <button
          onClick={() => setSort("priority")}
          className={
            "px-3 py-1 rounded text-sm " +
            (sort === "priority"
              ? "bg-black text-white"
              : "bg-gray-200 text-gray-700")
          }
        >
          우선순위순
        </button>
      </div>

      {/* 리스트 */}
      <div className="space-y-4">
        {filteredReports.length === 0 && (
          <p className="text-sm text-gray-500">
            조건에 맞는 신고가 없습니다.
          </p>
        )}

        {filteredReports.map((r: any) => (
          <div key={r.id} onClick={() => setSelected(r)}>
            <ReportCard
              report={r}
              onClick={() => setSelected(r)}
              onAutoProcessed={loadReports}
            />
          </div>
        ))}
      </div>

      {/* 슬라이드 프리뷰 */}
      {selected && (
        <SlidePreview
          report={selected}
          onClose={() => setSelected(null)}
          onRefresh={loadReports}
        />
      )}
    </div>
  );
}
