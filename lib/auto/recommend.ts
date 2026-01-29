export function evaluateAutoRecommendation(autoScore, duplicateScore) {
  if (duplicateScore >= 60) {
    return {
      level: "blocked",
      message: "중복 신고 가능성이 높아 자동 처리가 차단됩니다."
    };
  }

  if (autoScore >= 80) {
    return {
      level: "recommended",
      message: "AI가 자동 처리를 강하게 추천합니다."
    };
  }

  if (autoScore >= 50) {
    return {
      level: "possible",
      message: "자동 처리 가능 상태입니다."
    };
  }

  return {
    level: "not_recommended",
    message: "AI가 자동 처리를 권장하지 않습니다."
  };
}
