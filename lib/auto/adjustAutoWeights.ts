import { supabaseAdmin } from "@/lib/supabaseAdmin";

export async function adjustAutoWeights(success: boolean) {
  const supabase = supabaseAdmin();

  const { data: weights } = await supabase
    .from("auto_weights")
    .select("*")
    .eq("key", "base_weight")
    .single();

  if (!weights) return;

  const delta = success ? 0.02 : -0.03;

  await supabase
    .from("auto_weights")
    .update({
      weight_similarity: Math.max(0.5, weights.weight_similarity + delta),
      weight_duplicate: Math.max(0.5, weights.weight_duplicate + delta),
      weight_provider: Math.max(0.5, weights.weight_provider + delta),
    })
    .eq("key", "base_weight");
}
