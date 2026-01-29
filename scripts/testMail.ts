// scripts/testMail.ts
import dotenv from "dotenv";
dotenv.config({ path: ".env.local" }); // ⭐ 핵심

import nodemailer from "nodemailer";

console.log("SMTP_USER:", process.env.SMTP_USER);
console.log("SMTP_PASS:", process.env.SMTP_PASS);



async function test() {
  const transporter = nodemailer.createTransport({
    host: "smtp.naver.com",
    port: 587,
    secure: false,
    auth: {
      user: "a9591@naver.com",
      pass: process.env.SMTP_PASS,
    },
  });

  await transporter.sendMail({
    from: "a9591@naver.com",
    to: "a9591@naver.com",
    subject: "SMTP 테스트",
    text: "네이버 SMTP 테스트 메일입니다.",
  });

  console.log("메일 전송 성공");
}

test().catch(console.error);
