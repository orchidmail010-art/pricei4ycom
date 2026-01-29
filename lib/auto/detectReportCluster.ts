export function detectCluster(reports: any[]) {
  if (reports.length < 5) return null;

  const up = reports.filter(r => r.delta > 0).length;
  const down = reports.filter(r => r.delta < 0).length;

  const directionRatio = Math.max(up, down) / reports.length;

  const lowTrust = reports.filter(
    r => r.user_trust < 0.6
  ).length / reports.length;

  if (
    directionRatio >= 0.8 &&
    lowTrust >= 0.6
  ) {
    return {
      suspicious: true,
      reason: "cluster_manipulation"
    };
  }

  return null;
}
