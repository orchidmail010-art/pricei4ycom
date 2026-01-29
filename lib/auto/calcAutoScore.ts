// /lib/auto/calcAutoScore.ts

export function calcAutoProcessScore({
  ocrConfidence,
  requiredFilled,
  duplicateScore,
  priceDiffPercent,
  matchedProvider,
  matchedService
}) {
  // 1) OCR 점수
  const ocrScore = Math.min(100, ocrConfidence ?? 0);

  // 2) 필수 항목 점수
  const requiredScore = requiredFilled ? 100 : 40;

  // 3) 가격 신뢰도
  const priceTrustScore =
    priceDiffPercent < 10 ? 100 :
    priceDiffPercent < 20 ? 80 :
    priceDiffPercent < 30 ? 60 :
    priceDiffPercent < 40 ? 40 :
    20;

  // 4) 매칭 점수
  let matchScore = 0;
  if (matchedProvider) matchScore += 50;
  if (matchedService) matchScore += 50;

  // 5) 이상치 점수(anomaly)
  let anomalyScore = 0;

  if (priceDiffPercent > 40) anomalyScore += 30;
  if (!matchedProvider) anomalyScore += 20;
  if (ocrConfidence < 50) anomalyScore += 20;

  // 6) 최종 자동 처리 점수
  const finalScore = Math.round(
    ocrScore * 0.25 +
    requiredScore * 0.20 +
    (100 - duplicateScore) * 0.15 +
    priceTrustScore * 0.20 +
    matchScore * 0.10 +
    (100 - anomalyScore) * 0.10
  );

  return {
    finalScore,
    anomalyScore,
    detail: {
      ocrScore,
      requiredScore,
      duplicatePenalty: duplicateScore,
      priceTrustScore,
      matchScore,
    }
  };
}
