// 위험도 기준값 (관리 정책)
// 이 파일 하나만 수정하면 프론트/서버 모두 반영됨

export const REPORT_RISK = {
  HIGH_ANOMALY: 80,      // 이상치 고위험 기준
  MEDIUM_DUPLICATE: 70,  // 중복 주의 기준
} as const;
