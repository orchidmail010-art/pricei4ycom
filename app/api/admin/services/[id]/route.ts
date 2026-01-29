// app/api/admin/services/[id]/route.ts
import { NextResponse } from 'next/server';
import { supabaseServer } from '@/lib/supabase/server';
const supabase = supabaseServer();


function checkAuth(req: Request) {
  const key = req.headers.get('x-admin-key') || '';
  return !!process.env.ADMIN_KEY && key === process.env.ADMIN_KEY;
}

export async function DELETE(req: Request, { params }: { params: { id: string } }) {
  if (!checkAuth(req)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const id = Number(params.id);
  if (!Number.isFinite(id)) return NextResponse.json({ error: 'invalid id' }, { status: 400 });

  // 참조(Prices) 존재하면 FK 제약으로 실패할 수 있음 → 사전에 확인하거나 UI에서 안내
  const { error } = await supabase.from('services').delete().eq('id', id);
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ ok: true });
}
