import nodemailer from "nodemailer";

export async function sendAdminMail(subject: string, html: string) {
  const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT || 587),
    secure: false,
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  });

  await transporter.sendMail({
    from: `"비급여 관리자" <${process.env.SMTP_USER}>`,
    to: process.env.ADMIN_ALERT_EMAIL,
    subject,
    html,
  });
}
