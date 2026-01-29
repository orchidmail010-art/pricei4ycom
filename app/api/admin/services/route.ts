// app/api/admin/services/route.ts
import { NextResponse } from 'next/server';
import { supabaseServer } from '@/lib/supabase/server';
const supabase = supabaseServer();


function checkAuth(req: Request) {
  const key = req.headers.get('x-admin-key') || '';
  const ok = !!process.env.ADMIN_KEY && key === process.env.ADMIN_KEY;
  return ok;
}

export async function GET() {
  const { data, error } = await supabase
    .from('services')
    .select('id,code,name,category')
    .order('id', { ascending: true });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ items: data ?? [] });
}

export async function POST(req: Request) {
  if (!checkAuth(req)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const { code, name, category } = await req.json();

  if (!code || !name) return NextResponse.json({ error: 'code, name 필수' }, { status: 400 });

  // 유니크 제약 대비
  const { data, error } = await supabase
    .from('services')
    .insert([{ code: String(code), name: String(name), category: category ?? null }])
    .select('id')
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ ok: true, id: data?.id });
}
