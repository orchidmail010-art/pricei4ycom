import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase/server";

export async function GET() {
  const supabase = supabaseServer();

  const { data, error } = await supabase
    .from("auto_weights")
    .select("*")
    .order("id", { ascending: false })
    .limit(1)
    .single();

  if (error) return NextResponse.json({ ok: false, error });

  return NextResponse.json({ ok: true, data });
}

export async function POST(req) {
  const supabase = supabaseServer();
  const body = await req.json();

  const { data, error } = await supabase
    .from("auto_weights")
    .update({
      ...body,
      updated_at: new Date(),
    })
    .eq("id", 1) // 항상 첫 번째 row 사용
    .select()
    .single();

  if (error) return NextResponse.json({ ok: false, error });

  return NextResponse.json({ ok: true, data });
}
