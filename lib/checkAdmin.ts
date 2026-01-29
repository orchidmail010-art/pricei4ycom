import { cookies } from "next/headers";
import { supabaseServer } from "@/lib/supabase/server";

const ADMIN_EMAIL = "a9591@naver.com"; // ← 너가 만든 관리자 이메일

export async function checkAdmin() {
  const cookieStore = cookies();
  const supabase = supabaseServer(cookieStore);

  const { data, error } = await supabase.auth.getUser();

  if (error || !data?.user) {
    return { isAdmin: false, user: null };
  }

  // 관리자 이메일 체크
  if (data.user.email !== ADMIN_EMAIL) {
    return { isAdmin: false, user: data.user };
  }

  return { isAdmin: true, user: data.user };
}
