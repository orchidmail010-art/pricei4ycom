import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabaseAdmin";

export async function POST(req: Request) {
  const supabase = await createClient();

  // ⚠️ 여기서 기존 관리자 인증 로직 재사용
  // 예: await requireAdmin(supabase);

  const body = await req.json();
  const { priceIds } = body as { priceIds: string[] };

  if (!priceIds || priceIds.length === 0) {
    return NextResponse.json(
      { ok: false, message: "승인할 항목이 없습니다" },
      { status: 400 }
    );
  }

  const { error } = await supabase
    .from("prices")
    .update({ is_active: true })
    .in("id", priceIds);

  if (error) {
    return NextResponse.json({ ok: false, error }, { status: 500 });
  }

  return NextResponse.json({
    ok: true,
    approvedCount: priceIds.length,
  });
}
