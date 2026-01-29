import { supabaseServer } from "@/lib/supabase/server";

export async function getAutoProcessSummary() {
  const supabase = supabaseServer();

  const { data, error } = await supabase
    .from("reports")
    .select("status");

  if (error) {
    console.error("SUMMARY ERROR:", error);
    return null;
  }

  const total = data.length;
  const auto_possible = data.filter(r => r.status === "auto_possible").length;
  const auto_completed = data.filter(r => r.status === "auto_completed").length;
  const manual_required = data.filter(r => r.status === "manual").length;

  return {
    total,
    auto_possible,
    auto_completed,
    manual_required,
  };
}
