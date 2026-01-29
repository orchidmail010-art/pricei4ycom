import { supabaseAdmin } from "@/lib/supabase/admin";

export async function updateProviderTrust(providerId: number, success: boolean) {
  const supabase = supabaseAdmin();

  const { data: provider } = await supabase
    .from("providers")
    .select("auto_trust_score")
    .eq("id", providerId)
    .single();

  if (!provider) return;

  const delta = success ? 0.03 : -0.05;

  const nextScore = Math.min(
    1,
    Math.max(0.3, provider.auto_trust_score + delta)
  );

  await supabase
    .from("providers")
    .update({ auto_trust_score: nextScore })
    .eq("id", providerId);
}
