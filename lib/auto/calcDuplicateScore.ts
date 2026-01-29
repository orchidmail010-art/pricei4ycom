import { supabaseServer } from "@/lib/supabase/server";

// 문자열 유사도 함수(그대로 사용)
function textSimilarity(a: string, b: string) {
  if (!a || !b) return 0;
  const common = [...a].filter((x) => b.includes(x)).length;
  return common / Math.max(a.length, b.length);
}

export async function calcDuplicateScore(supabase, report) {
  const MAX_HOURS = 72; // 최근 3일

  // 최근 신고들 조회
  const { data: rows } = await supabase
    .from("reports")
    .select("id, provider_id, content, created_at")
    .neq("id", report.id)
    .eq("provider_id", report.provider_id)
    .gte(
      "created_at",
      new Date(Date.now() - MAX_HOURS * 3600 * 1000).toISOString()
    );

  if (!rows || rows.length === 0) {
    return {
      score: 0,
      matchedCount: 0,
      matched: [],
      topSimilarity: 0,
      message: "유사 신고 없음",
    };
  }

  let score = 0;
  let matched = [];

  for (const r of rows) {
    const similarity = textSimilarity(report.content, r.content);
    if (similarity < 0.3) continue;

    // 시간 차이 계산
    const diffMs = Math.abs(new Date(report.created_at).getTime() - new Date(r.created_at).getTime());
    const diffMin = Math.round(diffMs / 60000);

    matched.push({
      id: r.id,
      similarity: Number(similarity.toFixed(2)),
      time_diff_minutes: diffMin,
    });

    // 점수 가중치
    if (similarity >= 0.8) score += 50;
    else if (similarity >= 0.6) score += 30;
    else if (similarity >= 0.4) score += 10;

    // 시간 기반 가중치
    if (diffMin < 120) score += 20; // 2시간 내
    else if (diffMin < 360) score += 10; // 6시간 내
  }

  if (score > 100) score = 100;

  // 정렬 (similarity 높은 순)
  matched.sort((a, b) => b.similarity - a.similarity);

  return {
    score,
    matchedCount: matched.length,
    matched,
    topSimilarity: matched[0]?.similarity ?? 0,
    message:
      matched.length > 0
        ? `같은 병원에서 ${matched.length}건의 유사 신고 발견`
        : "유사 신고 없음",
  };
}
