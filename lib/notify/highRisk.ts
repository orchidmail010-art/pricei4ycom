import { sendAdminMail } from "./email";

export async function notifyHighRisk(
  reportId: number,
  anomalyScore: number | null
) {
  const subject = `[경고] 고위험 신고 발생 (#${reportId})`;
  const html = `
    <h3>고위험 신고가 발생했습니다</h3>
    <p><b>신고 ID:</b> ${reportId}</p>
    <p><b>이상치 점수:</b> ${anomalyScore ?? "-"}</p>
    <p>
      관리자 페이지에서 확인:
      <a href="${process.env.APP_BASE_URL}/admin/reports/${reportId}">
        바로 가기
      </a>
    </p>
  `;
  await sendAdminMail(subject, html);
}
