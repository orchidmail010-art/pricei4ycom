"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { supabaseBrowser } from "@/lib/supabase/client";

export default function MyReportsPage() {
  const router = useRouter();
  const supabase = supabaseBrowser();

  const [user, setUser] = useState<any>(null);
  const [reports, setReports] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  /* ===============================
     🔹 상태 한글화 함수 (①)
  =============================== */
  const statusLabel = (status: string) => {
    switch (status) {
      case "pending":
        return "자동 처리 대기중 ⏳";
      case "auto_done":
        return "자동 처리 완료 🤖";
      case "completed":
        return "관리자 처리 완료 ✅";
      default:
        return status;
    }
  };

  /* ===============================
     🔹 데이터 로딩
  =============================== */
  useEffect(() => {
    async function load() {
      const { data: userData } = await supabase.auth.getUser();
      const u = userData?.user || null;
      setUser(u);

      if (!u) {
        setLoading(false);
        return;
      }

      const { data } = await supabase
        .from("reports")
        .select("*")
        .eq("user_id", u.id)
        .eq("is_active", true) 
        .order("created_at", { ascending: false });

      setReports(data || []);
      setLoading(false);
    }

    load();
  }, []);

  if (loading) {
    return <div className="p-6">불러오는 중...</div>;
  }

  if (!user) {
    return (
      <div className="p-6">
        <p>로그인 후 확인 가능합니다.</p>
        <button
          onClick={() => router.push("/login?redirect=/my/reports")}
          className="mt-3 px-4 py-2 bg-blue-600 text-white rounded"
        >
          로그인
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto p-6 space-y-4">
      <h1 className="text-2xl font-bold">내 신고 현황</h1>

      {reports.length === 0 && (
        <p className="text-sm text-gray-500">등록한 신고가 없습니다.</p>
      )}

      {reports.map((r) => (
        <div
          key={r.id}
          onClick={() => router.push(`/my/reports/${r.id}`)} // ③ 유지
          className="border rounded-lg p-4 bg-white shadow-sm hover:shadow-md transition cursor-pointer"
        >
          <p className="text-sm text-gray-600">
            상태: <b>{statusLabel(r.status)}</b> {/* ② */}
          </p>

          <h2 className="font-semibold mt-1">
            {r.category || "가격 오류 신고"}
          </h2>

          <p className="text-sm text-gray-500 mt-1">
            병원 ID: {r.provider_id ?? "-"}
          </p>

          <p className="text-xs text-gray-400 mt-2">
            신고일: {new Date(r.created_at).toLocaleString("ko-KR")}
          </p>
        </div>
      ))}
    </div>
  );
}
