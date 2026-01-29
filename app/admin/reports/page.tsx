import Link from "next/link";
import { supabaseServer } from "@/lib/supabase/server";
import { REPORT_RISK } from "@/lib/constants/reportRisk";



function riskLevel(r: {
  status?: string;
  anomaly_score?: number | null;
  duplicate_score?: number | null;
}) {
  if (r.status === "pending" && (r.anomaly_score ?? 0) >= REPORT_RISK.HIGH_ANOMALY) return "high";
  if (r.status === "pending" && (r.duplicate_score ?? 0) >= REPORT_RISK.MEDIUM_DUPLICATE) return "medium";
  return "low";
}




type SearchParams = {
  status?: string;
  sort?: "recent" | "anomaly_desc" | "duplicate_desc";
};

export default async function AdminReportsPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const resolved = await searchParams;
  const status = resolved.status;
  const sort = resolved.sort ?? "recent";

  const supabase = supabaseServer();

  // 🔹 상태별 건수 집계
  // 🔹 상태별 건수 집계 부분 수정
  const [
    { count: total },
    { count: pending },
    { count: manual },
    { count: completed },
  ] = await Promise.all([
    supabase.from("reports").select("id", { count: "exact", head: true }).eq("is_active", true),
    supabase.from("reports").select("id", { count: "exact", head: true }).eq("status", "pending").eq("is_active", true),
    supabase.from("reports").select("id", { count: "exact", head: true }).eq("status", "manual_required").eq("is_active", true),
    supabase.from("reports").select("id", { count: "exact", head: true }).eq("status", "completed").eq("is_active", true),
  ]);

  // 🔹 목록 쿼리
  let query = supabase
    .from("reports")
    .select(`
      id,
      status,
      anomaly_score,
      duplicate_score,
      recommendation,
      created_at
    `);

  // 상태 필터
  if (status) query = query.eq("status", status);

  // 정렬 규칙
  if (sort === "anomaly_desc") {
    query = query.order("anomaly_score", { ascending: false, nullsFirst: false });
  } else if (sort === "duplicate_desc") {
    query = query.order("duplicate_score", { ascending: false, nullsFirst: false });
  } else {
    query = query.order("created_at", { ascending: false });
  }

  const { data, error } = await query;

  if (error) {
    return (
      <div className="p-6 text-red-600">
        <h1 className="text-xl font-bold mb-4">관리자 신고 목록</h1>
        <pre>{JSON.stringify(error, null, 2)}</pre>
      </div>
    );
  }

  const tabs = [
    { label: "전체", value: undefined, count: total ?? 0 },
    { label: "대기", value: "pending", count: pending ?? 0 },
    { label: "수동 검토", value: "manual_required", count: manual ?? 0 },
    { label: "완료", value: "completed", count: completed ?? 0 },
  ];

  const sorts = [
    { label: "최신순", value: "recent" },
    { label: "이상치 높은 순", value: "anomaly_desc" },
    { label: "중복 높은 순", value: "duplicate_desc" },
  ] as const;

  const basePath = "/admin/reports";
  const makeHref = (opts: { status?: string; sort?: string }) => {
    const p = new URLSearchParams();
    if (opts.status) p.set("status", opts.status);
    if (opts.sort && opts.sort !== "recent") p.set("sort", opts.sort);
    const q = p.toString();
    return q ? `${basePath}?${q}` : basePath;
  };

  return (
    <div className="max-w-6xl mx-auto px-6 py-10 space-y-6">
      <h1 className="text-2xl font-bold">관리자 신고 목록</h1>

      {/* 🔹 상태 탭 + 건수 뱃지 */}
      <div className="flex gap-2 border-b pb-2">
        {tabs.map((t) => {
          const isActive = t.value === status;
          return (
            <Link
              key={t.label}
              href={makeHref({ status: t.value, sort })}
              className={`flex items-center gap-2 px-3 py-1 rounded-t text-sm font-medium ${
                isActive
                  ? "bg-blue-600 text-white"
                  : "bg-gray-100 text-gray-700 hover:bg-gray-200"
              }`}
            >
              <span>{t.label}</span>
              <span
                className={`px-2 py-0.5 rounded-full text-xs ${
                  isActive ? "bg-white text-blue-600" : "bg-gray-300 text-gray-700"
                }`}
              >
                {t.count}
              </span>
            </Link>
          );
        })}
      </div>

      {/* 🔹 정렬 버튼 */}
      <div className="flex gap-2">
        {sorts.map((s) => {
          const active = sort === s.value;
          return (
            <Link
              key={s.value}
              href={makeHref({ status, sort: s.value })}
              className={`px-3 py-1 rounded text-sm ${
                active
                  ? "bg-gray-800 text-white"
                  : "bg-gray-100 text-gray-700 hover:bg-gray-200"
              }`}
            >
              {s.label}
            </Link>
          );
        })}
      </div>

      {/* 🔹 테이블 */}
      <table className="w-full border text-sm">
        <thead className="bg-gray-100">
          <tr>
            <th className="border p-2">ID</th>
            <th className="border p-2">상태</th>
            <th className="border p-2">이상치</th>
            <th className="border p-2">중복</th>
            <th className="border p-2">추천</th>
            <th className="border p-2">관리</th>
          </tr>
        </thead>
        <tbody>
          {data && data.length === 0 && (
            <tr>
              <td colSpan={6} className="border p-4 text-center text-gray-500">
                해당 조건의 신고가 없습니다.
              </td>
            </tr>
          )}
          {data?.map((r) => {
            const risk = riskLevel(r);
            const rowClass =
              risk === "high"
                ? "bg-red-50 hover:bg-red-100"
                : risk === "medium"
                ? "bg-yellow-50 hover:bg-yellow-100"
                : "hover:bg-gray-50";

            return (
              <tr key={r.id} className={rowClass}>
                <td className="border p-2 text-center">
                  {r.id}
                  {risk === "high" && (
                    <span className="ml-1 inline-block px-1.5 py-0.5 text-[10px] rounded bg-red-600 text-white">
                      HIGH
                    </span>
                  )}
                  {risk === "medium" && (
                    <span className="ml-1 inline-block px-1.5 py-0.5 text-[10px] rounded bg-yellow-500 text-white">
                      WARN
                    </span>
                  )}
                </td>

                <td className="border p-2 text-center font-semibold">{r.status}</td>
                <td className="border p-2 text-center">{r.anomaly_score ?? "-"}</td>
                <td className="border p-2 text-center">{r.duplicate_score ?? "-"}</td>
                <td className="border p-2 text-xs">
                  {r.recommendation ? r.recommendation.slice(0, 60) + "…" : "-"}
                </td>
                <td className="border p-2 text-center">
                  <Link href={`/admin/reports/${r.id}`} className="text-blue-600 underline text-sm">
                    상세 보기
                  </Link>
                </td>
              </tr>
            );
          })}

        </tbody>
      </table>
    </div>
  );
}
