"use client";

import { useEffect, useState } from "react";
import { supabaseBrowser } from "@/lib/supabase/client";

const supabase = supabaseBrowser();

// auto_weights 테이블의 실제 스키마 타입
type AutoWeightsRow = {
  id: number;
  weight_similarity: number | null;
  weight_provider: number | null;
  weight_duplicate: number | null;
  weight_priority: number | null;
  description: string | null;
  key: string | null;
};

// 화면에서 사용할 설정 항목 타입
type WeightItem = {
  key: string;
  label: string;
  column: keyof AutoWeightsRow;
  weight: number | null;
};

const CONFIG = [
  {
    key: "similarity",
    label: "가격/내용 유사도 가중치",
    column: "weight_similarity" as const,
  },
  {
    key: "provider",
    label: "병원 일치 여부 가중치",
    column: "weight_provider" as const,
  },
  {
    key: "duplicate",
    label: "중복 신고 패널티",
    column: "weight_duplicate" as const,
  },
  {
    key: "priority",
    label: "신고 우선순위 가중치",
    column: "weight_priority" as const,
  },
];

export default function AutoSettingsPage() {
  const [baseRow, setBaseRow] = useState<AutoWeightsRow | null>(null);
  const [items, setItems] = useState<WeightItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState("");

  function showToast(msg: string) {
    setToast(msg);
    setTimeout(() => setToast(""), 2000);
  }

  // -----------------------------
  // auto_weights 1줄 불러오기
  // -----------------------------
  async function loadWeights() {
    setLoading(true);

    // 1) 제일 첫 줄만 사용
    const { data, error } = await supabase
      .from("auto_weights")
      .select("*")
      .order("id", { ascending: true })
      .limit(1)
      .maybeSingle();

    if (error) {
      console.error("auto_weights 조회 실패", error);
      showToast("가중치 불러오기 실패");
      setLoading(false);
      return;
    }

    let row = data as AutoWeightsRow | null;

    // 2) 행이 없으면 기본값으로 1줄 생성
    if (!row) {
      const { data: inserted, error: insertError } = await supabase
        .from("auto_weights")
        .insert({
          weight_similarity: 1,
          weight_provider: 1,
          weight_duplicate: 1,
          weight_priority: 1,
          key: "base_weight",
          description: null,
        })
        .select("*")
        .single();

      if (insertError) {
        console.error("auto_weights 기본 행 생성 실패", insertError);
        showToast("기본 설정 생성 실패");
        setLoading(false);
        return;
      }

      row = inserted as AutoWeightsRow;
    }

    setBaseRow(row);

    // 3) 화면용 아이템으로 매핑
    const mapped: WeightItem[] = CONFIG.map((cfg) => ({
      key: cfg.key,
      label: cfg.label,
      column: cfg.column,
      weight:
        typeof row![cfg.column] === "number"
          ? (row![cfg.column] as number)
          : 1,
    }));

    setItems(mapped);
    setLoading(false);
  }

  useEffect(() => {
    loadWeights();
  }, []);

  // -----------------------------
  // 전체 저장
  // -----------------------------
  async function handleSaveAll() {
    if (!baseRow) return;

    setSaving(true);

    // 4개 입력값을 auto_weights 컬럼으로 다시 묶어준다
    const payload: Partial<AutoWeightsRow> = {};
    items.forEach((it) => {
      payload[it.column] =
        it.weight == null || Number.isNaN(it.weight)
          ? 1
          : Number(it.weight);
    });

    payload.description = baseRow.description;
    payload.key = baseRow.key ?? "base_weight";

    const { error } = await supabase
      .from("auto_weights")
      .update({
        ...payload,
        updated_at: new Date().toISOString(),
      })
      .eq("id", baseRow.id);

    if (error) {
      console.error("auto_weights 저장 실패", error);
      showToast("저장 실패: " + error.message);
    } else {
      showToast("저장 완료");
      await loadWeights();
    }

    setSaving(false);
  }

  // -----------------------------
  // 렌더링
  // -----------------------------
  if (loading) {
    return (
      <div className="max-w-3xl mx-auto p-6">
        <h1 className="text-2xl font-bold mb-4">자동 처리 기준 설정</h1>
        <p className="text-gray-500 text-sm">불러오는 중...</p>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto p-6 space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">자동 처리 기준 설정</h1>
        <button
          onClick={handleSaveAll}
          disabled={saving}
          className={
            "px-4 py-2 text-sm rounded text-white " +
            (saving
              ? "bg-gray-400 cursor-default"
              : "bg-emerald-600 hover:bg-emerald-700")
          }
        >
          {saving ? "저장 중..." : "전체 저장"}
        </button>
      </div>

      <p className="text-sm text-gray-600 mb-2">
        자동 처리 점수 / 중복 점수 계산에 사용하는{" "}
        <b>4가지 가중치</b>를 관리합니다. 값 변경 후{" "}
        <b>&quot;전체 저장&quot;</b> 버튼을 눌러 적용하세요. (권장 범위:
        0 ~ 3)
      </p>

      <table className="w-full text-sm border-collapse">
        <thead>
          <tr className="bg-gray-50 border-b">
            <th className="text-left px-3 py-2 border-b">항목</th>
            <th className="text-left px-3 py-2 border-b w-32">가중치</th>
          </tr>
        </thead>
        <tbody>
          {items.map((it, idx) => (
            <tr key={it.key} className="border-b">
              <td className="px-3 py-2 text-gray-700">{it.label}</td>
              <td className="px-3 py-2">
                <input
                  type="number"
                  step="0.1"
                  value={it.weight ?? ""}
                  onChange={(e) => {
                    const v = e.target.value;
                    setItems((prev) =>
                      prev.map((p, i) =>
                        i === idx
                          ? {
                              ...p,
                              weight: v === "" ? null : Number(v),
                            }
                          : p
                      )
                    );
                  }}
                  className="w-24 border rounded px-2 py-1 text-right"
                />
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {toast && (
        <div className="fixed bottom-6 right-6 bg-black text-white text-sm px-4 py-2 rounded">
          {toast}
        </div>
      )}
    </div>
  );
}
