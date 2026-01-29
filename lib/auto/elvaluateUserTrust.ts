import { supabaseAdmin } from "@/lib/supabase/admin";

export async function updateUserTrust(
  userId: string,
  success: boolean
) {
  const supabase = supabaseAdmin();

  const { data: user } = await supabase
    .from("profiles")
    .select("trust_score")
    .eq("id", userId)
    .single();

  if (!user) return;

  const delta = success ? 0.02 : -0.07;

  const nextScore = Math.min(
    1,
    Math.max(0.3, user.trust_score + delta)
  );

  await supabase
    .from("profiles")
    .update({ trust_score: nextScore })
    .eq("id", userId);
}
