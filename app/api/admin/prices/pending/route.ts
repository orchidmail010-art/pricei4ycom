import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase/server";

export async function GET() {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("prices")
    .select(`
      id,
      original_name,
      detail_name,
      price,
      min_price,
      max_price,
      providers(name)
    `)
    .eq("is_active", false);

  if (error) {
    return NextResponse.json({ ok: false, error }, { status: 500 });
  }

  const items = data.map((row: any) => ({
    id: row.id,
    original_name: row.original_name,
    detail_name: row.detail_name,
    price: row.price,
    min_price: row.min_price,
    max_price: row.max_price,
    provider_name: row.providers?.name ?? "",
  }));

  return NextResponse.json({ ok: true, items });
}
