// lib/auto/processReport.ts
import { supabaseServer } from "@/lib/supabase/server";
import { calcAutoProcessScore } from "./calcAutoProcessScore";
import { calcDuplicateScore } from "./calcDuplicateScore";
import { evaluateAutoRecommendation } from "./recommend";
import { getAutoWeights } from "./getAutoWeights";

/**
 * C-41.x 자동 처리 엔진 (가중치 연동 버전)
 *
 * - autoScore: 신고 내용 기반 점수
 * - duplicateScore: 중복 신고 기반 점수
 * - recommendation: 자동/수동/보류 등 최종 추천
 * - 실제 DB의 reports.status 업데이트 + report_logs 기록까지 수행
 */
export async function processReport(reportId: number) {
  const supabase = supabaseServer();

  // 1) 신고 조회
  const { data: report, error: beforeError } = await supabase
    .from("reports")
    .select("*")
    .eq("id", reportId)
    .maybeSingle();

  if (beforeError || !report) {
    console.error("❌ 자동 처리 전 보고서 조회 실패", beforeError);
    return { ok: false, error: "REPORT_NOT_FOUND" as const };
  }

  // before 스냅샷
  const beforeSnapshot = {
    status: report.status,
    memo: report.memo,
  };

  // 2) 자동 처리 가중치 읽기
  const weights = await getAutoWeights();
  const thresholdScale = weights.weight_similarity ?? 1; // 현재는 similarity 가 전체 기준 스케일 역할

  // 3) 자동 처리 점수 계산
 const auto = calcAutoProcessScore(report, { weights });
  const autoScoreResult = calcAutoProcessScore(
    {
      category: report.category,
      content: report.content,
      provider_id: report.provider_id,
      priority: report.priority,
    },
    { thresholdScale }
  );

  // 4) 중복 점수 계산
  const duplicateScoreResult = await calcDuplicateScore(report);

  // 5) 최종 추천 (automatic / manual / reject 등)
  const recommendation = evaluateAutoRecommendation({
    autoScore: autoScoreResult,
    duplicateScore: duplicateScoreResult,
  });

  const oldStatus: string = report.status;
  let newStatus: string = oldStatus;

  // 추천 결과에 따라 상태 결정 (필요하면 정책 바꿔도 됨)
  if (recommendation.recommendedAction === "automatic") {
    newStatus = "auto_done";
  }

  // 6) reports.status 업데이트
  if (newStatus !== oldStatus) {
    const { error: updateError } = await supabase
      .from("reports")
      .update({
        status: newStatus,
        updated_at: new Date().toISOString(),
      })
      .eq("id", reportId);

    if (updateError) {
      console.error("❌ 자동 처리 상태 업데이트 실패", updateError);
      return { ok: false, error: "UPDATE_FAILED" as const };
    }
  }

  // after 스냅샷
  const afterSnapshot = {
    status: newStatus,
    memo: report.memo,
  };

  // diff 요약 만들기
  const diffSummary =
    oldStatus === newStatus
      ? "변경된 항목 없음"
      : `상태(${oldStatus}→${newStatus})`;

  // 7) 로그 기록 (report_logs)
  await logAutoProcess(
    supabase,
    reportId,
    oldStatus,
    newStatus,
    "자동 처리 엔진 실행",
    true,
    autoScoreResult,
    duplicateScoreResult,
    recommendation
  );

  // 8) API 응답용 결과
  return {
    ok: true as const,
    status: newStatus,
    diffSummary,
    before: beforeSnapshot,
    after: afterSnapshot,
    autoScore: autoScoreResult,
    duplicateScore: duplicateScoreResult,
    recommendation,
  };
}

/**
 * report_logs 에 기록
 *  - auto_detail / duplicate_detail / recommendation_detail 컬럼에
 *    JSON 통째로 넣어 두면 나중에 분석 용이
 */
async function logAutoProcess(
  supabase: any,
  reportId: number,
  oldStatus: string,
  newStatus: string,
  explain: string,
  auto: boolean,
  autoDetail: any,
  duplicateDetail: any,
  recommendationDetail: any
) {
  const { error } = await supabase.from("report_logs").insert({
    report_id: reportId,
    old_status: oldStatus,
    new_status: newStatus,
    explain_text: explain,
    auto,
    auto_detail: autoDetail,
    duplicate_detail: duplicateDetail,
    recommendation_detail: recommendationDetail,
  });

  if (error) {
    console.error("❌ report_logs 기록 실패", error);
  }
}
