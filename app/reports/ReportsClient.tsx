"use client";

import { useState, useMemo } from "react";
import { useRouter } from "next/navigation";

export default function ReportsClient({ reports }) {
  const router = useRouter();

  const [filter, setFilter] = useState("all");
  const [keyword, setKeyword] = useState("");
  const [sort, setSort] = useState("latest");

  const filtered = useMemo(() => {
    let list = reports;

    if (filter === "auto") {
        // 자동 처리 = auto + auto_done 포함
        list = list.filter((r) => r.status === "auto" || r.status === "auto_done");
        } else if (filter !== "all") {
        list = list.filter((r) => r.status === filter);
        }

    if (keyword.trim() !== "") {
      const q = keyword.toLowerCase();
      list = list.filter(
        (r) =>
          r.category.toLowerCase().includes(q) ||
          r.content.toLowerCase().includes(q) ||
          (r.provider?.name || "").toLowerCase().includes(q)
      );
    }

    list = [...list];
    if (sort === "latest")
      list.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
    if (sort === "oldest")
      list.sort((a, b) => new Date(a.created_at) - new Date(b.created_at));
    if (sort === "priority")
      list.sort((a, b) =>
        (b.priority || "").localeCompare(a.priority || "")
      );

    return list;
  }, [filter, keyword, sort, reports]);

  return (
    <div className="max-w-3xl mx-auto p-6 space-y-6">
      <h1 className="text-2xl font-bold">신고 목록</h1>

      <input
        type="text"
        placeholder="검색 (내용 / 카테고리 / 병원명)"
        value={keyword}
        onChange={(e) => setKeyword(e.target.value)}
        className="w-full border rounded px-3 py-2"
      />

      <div className="flex gap-2">
        {[
          ["all", "전체"],
          ["auto", "자동 처리"],
          ["processing", "처리 중"],
          ["completed", "처리 완료"],
        ].map(([key, label]) => (
          <button
            key={key}
            onClick={() => setFilter(key)}
            className={`px-3 py-1 rounded border ${
              filter === key ? "bg-black text-white" : "bg-white text-black"
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      <div className="flex gap-2">
        <select
          className="border rounded px-3 py-1"
          value={sort}
          onChange={(e) => setSort(e.target.value)}
        >
          <option value="latest">최신순</option>
          <option value="oldest">오래된 순</option>
          <option value="priority">우선순위 높은 순</option>
        </select>
      </div>

      <div className="space-y-4">
        {filtered.length === 0 && (
          <p className="text-gray-500">검색 결과가 없습니다.</p>
        )}

        {filtered.map((r) => (
          <div
            key={r.id}
            onClick={() => router.push(`/reports/${r.id}`)}
            className="p-4 border rounded-lg bg-gray-50 hover:bg-gray-100 cursor-pointer transition"
          >
            <div className="flex items-center justify-between mb-2">
              <p className="font-semibold">{r.category}</p>

              <div className="flex gap-2">
                <span className="text-sm px-2 py-1 rounded bg-gray-200">
                  {r.status}
                </span>

                <span className="text-sm px-2 py-1 rounded bg-gray-100">
                  {r.priority || "normal"}
                </span>
              </div>
            </div>

            <p className="text-sm text-gray-600">
              {r.provider?.name || "병원 미등록"} ·{" "}
              {new Date(r.created_at).toLocaleDateString()}
            </p>

            <p className="mt-2 text-gray-800 line-clamp-2">
              {r.content}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}
