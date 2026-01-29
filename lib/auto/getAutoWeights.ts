// lib/auto/getAutoWeights.ts
import { supabaseServer } from "@/lib/supabase/server";

export type AutoWeights = {
  similarity: number; // 가격/내용 유사도 가중치
  provider: number;   // 병원 일치 여부
  duplicate: number;  // 중복 패널티
  priority: number;   // 우선순위
};

/**
 * auto_weights 테이블에서 1줄을 가져와서
 * 코드에서 쓰기 좋은 형태로 변환해 준다.
 * 행이 없거나 null이면 기본값 1로 채운다.
 */
export async function getAutoWeights(): Promise<AutoWeights> {
  const supabase = supabaseServer();

  const { data, error } = await supabase
    .from("auto_weights")
    .select("*")
    .order("id", { ascending: true })
    .limit(1)
    .maybeSingle();

  if (error) {
    console.error("⚠️ auto_weights 조회 실패, 기본값 사용:", error);
  }

  const row: any = data ?? {};

  return {
    similarity:
      typeof row.weight_similarity === "number" ? row.weight_similarity : 1,
    provider:
      typeof row.weight_provider === "number" ? row.weight_provider : 1,
    duplicate:
      typeof row.weight_duplicate === "number" ? row.weight_duplicate : 1,
    priority:
      typeof row.weight_priority === "number" ? row.weight_priority : 1,
  };
}
