export function generateAutoProcessExplanation({
  autoScore,
  duplicateScore,
  contentLength,
  priority,
  category,
}) {
  const parts = [];

  if (autoScore >= 80) parts.push("자동 처리 점수가 매우 높아 자동 처리에 적합하다고 판단했습니다.");
  else if (autoScore >= 50) parts.push("자동 처리 점수가 기준 이상으로 자동 처리 가능하다고 평가했습니다.");
  else parts.push("자동 처리 점수가 낮아 자동 처리 기준에 미달합니다.");

  if (duplicateScore >= 60) parts.push("중복 신고 가능성이 높아 자동 처리가 제한됩니다.");
  else if (duplicateScore >= 30) parts.push("유사 신고가 일부 감지되었지만 자동 처리 가능한 수준입니다.");
  else parts.push("중복 신고 위험이 낮아 자동 처리 판단에 문제가 없습니다.");

  if (contentLength < 10) parts.push("신고 내용이 너무 짧아 자동 처리 기준에 미달합니다.");
  else if (contentLength < 30) parts.push("신고 내용이 비교적 짧지만 기준을 충족합니다.");
  else parts.push("신고 내용이 충분히 구체적입니다.");

  if (priority === "high") parts.push("우선순위가 HIGH이므로 자동 처리가 제한됩니다.");
  else parts.push("우선순위가 normal로 자동 처리에 영향을 주지 않습니다.");

  return parts.join(" ");
}
