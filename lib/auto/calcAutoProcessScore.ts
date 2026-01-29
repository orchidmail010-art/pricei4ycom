// lib/auto/calcAutoProcessScore.ts
import type { AutoWeights } from "./getAutoWeights";

export type AutoProcessScoreResult = {
  autoScore: number;
  auto: boolean;
  reason: string;
  auto_detail?: any;
};

export function calcAutoProcessScore(
  report: any,
  opts?: { weights?: AutoWeights }
): AutoProcessScoreResult {
  // 기본 가중치 (관리자 설정이 없을 때)
  const w: AutoWeights = opts?.weights ?? {
    similarity: 1,
    provider: 1,
    duplicate: 1,
    priority: 1,
  };

  let score = 0;
  const reasons: string[] = [];

  // 1) 카테고리
  if (report.category) {
    score += 20 * w.priority; // 우선순위 가중치와 살짝 연동
    reasons.push("카테고리가 입력됨");
  }

  // 2) 내용 길이 → "유사도" 가중치에 연결
  if (report.content && typeof report.content === "string") {
    const len = report.content.length;
    if (len >= 30) {
      score += 30 * w.similarity;
      reasons.push("신고 내용이 충분히 길음(30자 이상)");
    } else if (len >= 10) {
      score += 15 * w.similarity;
      reasons.push("신고 내용이 10자 이상");
    }
  }

  // 3) 병원 선택 여부 → provider 가중치
  if (report.provider_id) {
    score += 20 * w.provider;
    reasons.push("병원이 선택됨");
  }

  // 4) 가격 정보 → similarity 쪽에 조금 더 반영
  if (report.price) {
    score += 30 * w.similarity;
    reasons.push("가격 정보가 포함됨");
  }

  // 0~100 클램프
  if (score > 100) score = 100;
  if (score < 0) score = 0;

  // 기준점(70)을 priority 가중치로 살짝 조정
  const baseThreshold = 70;
  const threshold = Math.max(
    40,
    Math.min(90, Math.round(baseThreshold * w.priority))
  );

  const auto = score >= threshold;

  return {
    autoScore: score,
    auto,
    reason: auto
      ? "자동 처리 기준을 충족했습니다."
      : "자동 처리 점수가 기준에 미달합니다.",
    auto_detail: {
      reasons,
      weights: w,
      threshold,
    },
  };
}
