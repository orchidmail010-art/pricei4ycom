"use client";

export const dynamic = 'force-dynamic';

import { useEffect, useState, FormEvent } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { supabaseBrowser } from "@/lib/supabase/client";

type Provider = {
  id: number;
  name: string;
};

export default function NewReportPage() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [user, setUser] = useState<any>(null);
  const [providers, setProviders] = useState<Provider[]>([]);
  const [providerId, setProviderId] = useState<number | null>(null);

  const [category, setCategory] = useState("가격 오류");
  const [priority, setPriority] = useState("normal");
  const [content, setContent] = useState("");

  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  // -----------------------------
  // 초기 로딩: 로그인 + 병원 목록 + 쿼리 반영
  // -----------------------------
  useEffect(() => {
    async function init() {
      const supabase = supabaseBrowser();

      // 1) 유저 확인
      const { data: userData } = await supabase.auth.getUser();
      const u = userData?.user || null;
      setUser(u);

      if (!u) {
        // 로그인 안됐으면 로그인 페이지로
        router.push("/login?redirect=/my/reports/new");
        return;
      }

      // 2) 병원 목록
      const { data: providerData } = await supabase
        .from("providers")
        .select("id, name")
        .order("name", { ascending: true });

      setProviders(providerData || []);

      // 3) 쿼리의 provider_id 반영
      const q = searchParams.get("provider_id");
      if (q) {
        const pid = Number(q);
        if (!Number.isNaN(pid)) {
          setProviderId(pid);
        }
      }
    }

    init();
  }, [router, searchParams]);

  const selectedProvider =
    providerId != null
      ? providers.find((p) => p.id === providerId) || null
      : null;

  const hasPreselectedProvider = !!searchParams.get("provider_id");

  // -----------------------------
  // 제출 처리
  // -----------------------------
  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError("");

    if (!user) {
      setError("로그인 후 이용해주세요.");
      return;
    }

    if (!providerId) {
      setError("병원을 선택해주세요.");
      return;
    }

    if (!content.trim()) {
      setError("신고 내용을 입력해주세요.");
      return;
    }

    setSubmitting(true);
    try {
      const supabase = supabaseBrowser();

      const { error: insertError } = await supabase.from("reports").insert({
        user_id: user.id,
        provider_id: providerId,
        category,
        content,
        status: "pending",
        priority,
      });

      if (insertError) {
        console.error(insertError);
        setError("신고 등록에 실패했습니다. 잠시 후 다시 시도해주세요.");
        setSubmitting(false);
        return;
      }

      // 성공 시 내 신고 목록으로
      router.push("/my/reports");
    } catch (err) {
      console.error(err);
      setError("알 수 없는 오류가 발생했습니다.");
      setSubmitting(false);
    }
  }

  // -----------------------------
  // UI
  // -----------------------------
  return (
    <div className="max-w-3xl mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">가격 신고하기</h1>
        <button
          type="button"
          onClick={() => router.push("/my/reports")}
          className="px-3 py-1 text-sm rounded bg-gray-200"
        >
          내 신고 목록
        </button>
      </div>

      <p className="text-sm text-gray-500">
        실제 진료비와 앱에 표시된 가격이 다를 때 신고해 주세요.  
        먼저 자동 분석을 거친 뒤, 필요 시 관리자가 추가 확인을 진행합니다.
      </p>

      <form
        onSubmit={handleSubmit}
        className="space-y-4 bg-white border rounded-lg p-5 shadow-sm"
      >
        {/* 병원 선택 */}
        <div>
          <label className="block text-sm font-medium mb-1">병원 선택</label>
          <select
            value={providerId ?? ""}
            onChange={(e) =>
              setProviderId(
                e.target.value ? Number(e.target.value) : null
              )
            }
            disabled={hasPreselectedProvider}
            className="border rounded px-3 py-2 w-full text-sm bg-white disabled:bg-gray-100"
          >
            <option value="">병원을 선택하세요</option>
            {providers.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>

          {hasPreselectedProvider && selectedProvider && (
            <p className="mt-1 text-xs text-emerald-700">
              이 신고는 <b>{selectedProvider.name}</b>에서 바로 접수되었습니다.
            </p>
          )}
        </div>

        {/* 신고 유형 */}
        <div>
          <label className="block text-sm font-medium mb-1">신고 유형</label>
          <select
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            className="border rounded px-3 py-2 w-full text-sm"
          >
            <option value="가격 오류">가격 오류 (기본)</option>
            <option value="정보 수정">정보 수정</option>
            <option value="기타">기타</option>
          </select>
        </div>

        {/* 우선순위 */}
        <div>
          <label className="block text-sm font-medium mb-1">우선순위</label>
          <select
            value={priority}
            onChange={(e) => setPriority(e.target.value)}
            className="border rounded px-3 py-2 w-full text-sm"
          >
            <option value="low">낮음</option>
            <option value="normal">보통</option>
            <option value="high">높음</option>
          </select>
        </div>

        {/* 내용 */}
        <div>
          <label className="block text-sm font-medium mb-1">상세 내용</label>
          <textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            className="border rounded px-3 py-2 w-full text-sm min-h-[120px]"
            placeholder={`예) 앱에는 임플란트 진료비가 90,000원으로 표시되어 있는데\n실제 상담 시 120,000원이라고 안내받았습니다.`}
          />
        </div>

        {/* 에러 메시지 */}
        {error && (
          <p className="text-sm text-red-500">{error}</p>
        )}

        <div className="flex justify-between items-center pt-2">
          <p className="text-xs text-gray-500">
            ※ 신고 후 결과는 "내 신고 현황"에서 확인할 수 있습니다.
          </p>
          <button
            type="submit"
            disabled={submitting}
            className="px-4 py-2 bg-emerald-600 text-white rounded text-sm disabled:opacity-60"
          >
            {submitting ? "등록 중..." : "신고 제출"}
          </button>
        </div>
      </form>
    </div>
  );
}
