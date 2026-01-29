"use client";

import { useState } from "react";
import { supabaseBrowser } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";

export default function LoginPage() {
  const supabase = supabaseBrowser();
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const handleLogin = async (e) => {
  e.preventDefault();

  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error) {
    alert("로그인 실패: " + error.message);
    return;
  }

  // ✔ email 쿠키
  document.cookie = `user-email=${data.user.email}; path=/; SameSite=Lax`;

  // ✔ Supabase 세션 가져오기
  const session = await supabase.auth.getSession();

  // ✔ access token 쿠키로 저장 → middleware가 읽을 수 있음
  if (session.data.session?.access_token) {
    document.cookie = `sb-access-token=${session.data.session.access_token}; path=/; SameSite=Lax`;
  }

  await new Promise((res) => setTimeout(res, 30));

  router.push("/admin");
};


  return (
    <div className="p-6 max-w-sm mx-auto">
      <h1 className="text-2xl font-bold mb-4">관리자 로그인</h1>

      {/* 기본 동작 막고 handleLogin만 실행 */}
      <form onSubmit={handleLogin} className="space-y-4">

        <input
          type="email"
          placeholder="이메일"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="w-full border px-3 py-2 rounded"
        />

        <input
          type="password"
          placeholder="비밀번호"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="w-full border px-3 py-2 rounded"
        />

        {/* form submit */}
        <button
          type="submit"
          className="w-full bg-black text-white py-2 rounded"
        >
          로그인
        </button>
      </form>
    </div>
  );
}
