import { supabaseServer } from "@/lib/supabase/server";

export async function loadWeights() {
  const supabase = supabaseServer();
  const { data } = await supabase
    .from("auto_weights")
    .select("*")
    .order("id", { ascending: false })
    .limit(1)
    .single();

  return data;
}

export function calcAutoProcessScore(report, stats = {}) {
  let score = 0;

  const content = report.content || "";
  const length = content.length;
  const priority = report.priority;
  const category = report.category || "unknown";

  // 1) 내용 길이 점수
  if (length >= 100) score += 40;
  else if (length >= 50) score += 30;
  else if (length >= 20) score += 20;
  else if (length >= 10) score += 10;
  else score -= 10; // 너무 짧음

  // 2) 우선순위 점수
  if (priority === "low") score += 15;
  else if (priority === "normal") score += 10;
  else if (priority === "high") score -= 50;

  // 3) 카테고리 기반 점수
  const categoryWeight = {
    address: 20,
    phone: 15,
    price: 25,
    name_update: 10,
    unknown: 5,
  };
  score += categoryWeight[category] || 0;

  // 4) 최근 자동 처리 성공률 기반 보정
  if (stats.successRate != null) {
    if (stats.successRate >= 80) score += 10;
    else if (stats.successRate <= 50) score -= 10;
  }

  // 5) 최근 실패 패턴 (보수적 모드)
  if (stats.failureRate != null && stats.failureRate >= 30) {
    score -= 10;
  }

  // 최소 ~ 최대 clamp
  if (score < 0) score = 0;
  if (score > 100) score = 100;

  return score;
}
