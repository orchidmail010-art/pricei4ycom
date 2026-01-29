import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseAdmin';

export async function POST(req: Request) {
  try {
    const body = await req.json();

    // ✅ 허용할 필드만 명시적으로 추출
    const {
      provider_id,
      service_id,
      original_name,
      detail_name,
      price,
      min_price,
      max_price,
      unit,
      note,
      source_url,
      updated_at,
      last_checked_at,
      option_json,
    } = body;

    // ❌ is_active는 절대 받지 않음

    const { error } = await supabaseAdmin.from('prices').insert([
      {
        provider_id,
        service_id,
        original_name,
        detail_name,
        price,
        min_price,
        max_price,
        unit,
        note,
        source_url,
        updated_at,
        last_checked_at,
        option_json,
        // is_active ❌ → DB 기본값(false) 사용
      },
    ]);

    if (error) {
      return NextResponse.json(
        { ok: false, error: error.message },
        { status: 400 }
      );
    }

    return NextResponse.json({ ok: true });
  } catch (e: any) {
    return NextResponse.json(
      { ok: false, error: e?.message || 'server error' },
      { status: 500 }
    );
  }
}
