import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const url  = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const key  = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const ADMIN_SECRET = process.env.ADMIN_UPLOAD_SECRET!;
const supa = createClient(url, key);

export async function POST(req: Request) {
  try {
    const adminSecret = req.headers.get('x-admin-secret');
    if (!ADMIN_SECRET || adminSecret !== ADMIN_SECRET) {
      return new NextResponse('Unauthorized', { status: 401 });
    }

    // 전건 일괄 갱신 (필요시 where 조건 추가 가능)
    const { error } = await supa
      .from('prices')
      .update({ last_checked_at: new Date().toISOString() })
      .neq('id', -1); // dummy 조건(모든 행)

    if (error) throw error;
    return NextResponse.json({ ok: true });
  } catch (e: any) {
    return new NextResponse(e?.message || 'Server Error', { status: 500 });
  }
}
