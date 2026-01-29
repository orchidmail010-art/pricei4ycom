"use client";

export const dynamic = 'force-dynamic';

import { useEffect, useState, FormEvent, useCallback, Suspense } from "react"; // Suspense 추가
import { useRouter, useSearchParams } from "next/navigation";
import { supabaseBrowser } from "@/lib/supabase/client";

type Provider = {
  id: number;
  name: string;
};

const supabase = supabaseBrowser();

// --- 1. 실제 로직이 담긴 컨텐츠 컴포넌트 ---
function ReportNewContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  // 1. URL 파라미터 추출
  const qsProviderId = searchParams.get("provider_id");
  const qsProviderName = searchParams.get("provider_name");
  const qsCategory = searchParams.get("category");
  const qsService = searchParams.get("service");
  const qsPrice = searchParams.get("price");

  const isFromResult = !!qsProviderId;

  // 2. 상태 관리
  const [user, setUser] = useState<any>(null);
  const [providers, setProviders] = useState<Provider[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [providerId, setProviderId] = useState<number | null>(null);
  const [category, setCategory] = useState<string>(qsCategory || "가격 오류");
  const [serviceName, setServiceName] = useState<string>(qsService || "");
  const [content, setContent] = useState<string>("");
  const [priority, setPriority] = useState<"low" | "normal" | "high">("normal");
  const [errorMsg, setErrorMsg] = useState<string>("");

  // 통계 및 알림 상태
  const [duplicateReports, setDuplicateReports] = useState<any[]>([]);
  const [resolvedReports, setResolvedReports] = useState<any[]>([]);
  const [autoSuccessRate, setAutoSuccessRate] = useState<number | null>(null);
  const [checkingStats, setCheckingStats] = useState(false);

  // 3. 초기 세팅 (쿼리스트링 기반)
  useEffect(() => {
    if (qsProviderId && !isNaN(Number(qsProviderId))) setProviderId(Number(qsProviderId));
    if (qsService) setServiceName(qsService);
    
    if (qsPrice && qsService) {
      setContent(`"${qsService}" 가격 정보가 ${qsPrice}원으로 안내되었으나 실제 진료비와 다릅니다. `);
    } else if (qsService) {
      setContent(`"${qsService}" 가격 정보가 실제와 다릅니다. `);
    }
  }, [qsProviderId, qsService, qsPrice]);

  // 4. 통합 데이터 조회 함수
  const fetchReportStats = useCallback(async (pid: number) => {
    setCheckingStats(true);
    const targetCategory = "가격 오류";

    try {
      const [dupRes, solvedRes, rateRes] = await Promise.all([
        supabase.from("reports").select("id, created_at").eq("provider_id", pid).eq("category", targetCategory).eq("status", "pending").limit(3),
        supabase.from("reports").select("id, updated_at").eq("provider_id", pid).eq("category", targetCategory).in("status", ["auto_done", "completed"]).order("updated_at", { ascending: false }).limit(3),
        supabase.from("reports").select("status").eq("provider_id", pid).eq("category", targetCategory).limit(50)
      ]);

      setDuplicateReports(dupRes.data || []);
      setResolvedReports(solvedRes.data || []);

      if (rateRes.data && rateRes.data.length > 0) {
        const autoCount = rateRes.data.filter(r => r.status === "auto_done").length;
        setAutoSuccessRate(Math.round((autoCount / rateRes.data.length) * 100));
      } else {
        setAutoSuccessRate(null);
      }
    } finally {
      setCheckingStats(false);
    }
  }, []);

  useEffect(() => {
    if (providerId) fetchReportStats(providerId);
  }, [providerId, fetchReportStats]);

  // 5. 유저 확인 및 목록 로드
  useEffect(() => {
    const init = async () => {
      const { data: { user: u } } = await supabase.auth.getUser();
      if (!u) {
        const returnTo = `${window.location.pathname}${window.location.search}`;
        router.push(`/login?redirect=${encodeURIComponent(returnTo)}`);
        return;
      }
      setUser(u);

      const { data: pData } = await supabase.from("providers").select("id, name").order("name");
      if (pData) setProviders(pData);
      setLoading(false);
    };
    init();
  }, [router]);

  // 6. 제출 로직
  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!user || !providerId || !serviceName || !content.trim()) {
      alert("필수 항목을 모두 입력해주세요.");
      return;
    }

    setSaving(true);
    try {
      const { data, error } = await supabase.from("reports").insert({
        user_id: user.id,
        provider_id: providerId,
        category,
        content: `"[${serviceName}]" ${content}`,
        service_name: serviceName,
        status: "pending",
        priority,
      }).select().single();

      if (error) throw error;
      alert("신고가 등록되었습니다.");
      router.push(`/my/reports/${data.id}`);
    } catch (err) {
      console.error(err);
      setErrorMsg("저장 중 오류 발생");
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div className="p-10 text-center text-gray-400">페이지 로딩 중...</div>;

  return (
    <div className="max-w-xl mx-auto p-6 space-y-6">
      <h1 className="text-2xl font-bold">가격 신고하기</h1>

      <div className="space-y-3">
        {qsProviderName && (
          <div className="rounded bg-emerald-50 border border-emerald-100 p-3 text-sm text-emerald-800 font-medium">
            📍 {qsProviderName} 가격 신고
          </div>
        )}

        <div className="rounded border border-gray-200 bg-gray-50 p-4 text-sm">
          <p className="font-semibold mb-2 text-gray-800">📌 신고 처리 예상 흐름</p>
          <ol className="list-decimal list-inside space-y-1 text-gray-700">
            <li>신고 접수 후 자동 분석 시작</li>
            <li>기존 데이터 비교 및 자동 처리 판단</li>
            <li>가능 시 <b className="text-emerald-600">즉시 반영</b></li>
            <li>확인 필요 시 관리자 검토</li>
          </ol>
          {autoSuccessRate !== null && autoSuccessRate >= 70 && (
            <p className="mt-3 text-xs text-emerald-700 font-bold">⚡ 이 신고는 평균적으로 매우 빠르게 처리됩니다.</p>
          )}
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1 text-gray-700">병원 선택 *</label>
            <select
              value={providerId ?? ""}
              disabled={isFromResult}
              onChange={(e) => setProviderId(Number(e.target.value))}
              className={`border w-full p-2.5 rounded text-sm ${isFromResult ? "bg-gray-100" : "bg-white"}`}
            >
              <option value="">병원을 선택하세요</option>
              {providers.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1 text-gray-700">신고 유형 *</label>
              <select className="border rounded p-2.5 w-full text-sm bg-white" value={category} onChange={(e) => setCategory(e.target.value)}>
                <option value="가격 오류">가격 오류</option>
                <option value="정보 수정">정보 수정</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1 text-gray-700">항목명 *</label>
              <input type="text" value={serviceName} onChange={(e) => setServiceName(e.target.value)} placeholder="도수치료 등" className="w-full border rounded p-2.5 text-sm" />
            </div>
          </div>
        </div>

        <div className="space-y-3 pt-2">
          {checkingStats && <p className="text-xs text-gray-400 animate-pulse">최신 병원 정보를 불러오는 중...</p>}

          {duplicateReports.length > 0 && (
            <div className="rounded border border-yellow-200 bg-yellow-50 p-3 text-sm text-yellow-800">
              <p className="font-semibold mb-1">⚠️ 대기 중인 유사 신고가 있습니다</p>
              <ul className="text-xs space-y-0.5 opacity-80">
                {duplicateReports.map(r => <li key={r.id}>• {new Date(r.created_at).toLocaleDateString()} 접수건</li>)}
              </ul>
            </div>
          )}

          {resolvedReports.length > 0 && (
            <div className="rounded border border-blue-200 bg-blue-50 p-3 text-sm text-blue-800">
              <p className="font-semibold mb-1">ℹ️ 최근 해결된 이력이 있습니다</p>
              <ul className="text-xs space-y-0.5 opacity-80">
                {resolvedReports.map(r => <li key={r.id}>• {new Date(r.updated_at).toLocaleDateString()} 완료</li>)}
              </ul>
            </div>
          )}

          {autoSuccessRate !== null && autoSuccessRate >= 50 && (
            <div className="rounded border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-800">
              <p className="font-semibold italic">⚡ 시스템 처리 활성화 병원</p>
              <p className="text-xs mt-1">최근 신고의 <b>{autoSuccessRate}%</b>가 즉시 승인되었습니다.</p>
            </div>
          )}

          <label className="block text-sm font-medium mb-1 text-gray-700">상세 내용 *</label>
          <textarea
            className="border rounded p-3 w-full text-sm min-h-[140px] focus:ring-2 focus:ring-emerald-500 outline-none"
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder="내용을 입력해주세요."
          />
        </div>

        {errorMsg && <p className="text-sm text-red-600 font-medium">{errorMsg}</p>}

        <div className="flex justify-between items-center pt-4">
          <button type="button" onClick={() => router.back()} className="px-6 py-2.5 border rounded text-sm font-medium text-gray-600 hover:bg-gray-50">취소</button>
          <button type="submit" disabled={saving} className="px-10 py-2.5 bg-emerald-600 text-white rounded text-sm font-bold shadow-md disabled:bg-emerald-300">
            {saving ? "저장 중..." : "신고 등록"}
          </button>
        </div>
      </form>
    </div>
  );
}

// --- 2. 외부에서 사용하는 메인 페이지 컴포넌트 ---
export default function NewReportPage() {
  return (
    <Suspense fallback={<div className="p-10 text-center text-gray-400">데이터를 불러오는 중입니다...</div>}>
      <ReportNewContent />
    </Suspense>
  );
}