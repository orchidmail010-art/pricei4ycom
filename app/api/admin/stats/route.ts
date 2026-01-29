// /app/api/admin/stats/route.ts
import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// supabaseServer 사용 안 하기 (RSC 쿠키 오류 때문에)
// API는 익명키로만 실행
export async function GET() {
  try {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );

    // 총계
    const [{ count: c1 }, { count: c2 }, { count: c3 }] = await Promise.all([
      supabase.from('providers').select('id', { count: 'exact', head: true }),
      supabase.from('services').select('id', { count: 'exact', head: true }),
      supabase.from('prices').select('id', { count: 'exact', head: true }),
    ]);

    // 최신 병원 5
    const { data: latestProviders } = await supabase
      .from('providers')
      .select('id,name,region,updated_at')
      .order('id', { ascending: false })
      .limit(5);

    // 최신 가격 5 (조인 포함)
    const { data: latestPricesRaw } = await supabase
      .from('prices')
      .select(
        'id,price,updated_at,provider:providers(name),service:services(name)'
      )
      .order('id', { ascending: false })
      .limit(5);

    const latestPrices = (latestPricesRaw ?? []).map((r: any) => ({
      id: r.id,
      price: r.price,
      updated_at: r.updated_at,
      provider_name: r.provider?.name ?? null,
      service_name: r.service?.name ?? null,
    }));

    return NextResponse.json({
      providers: c1 ?? 0,
      services: c2 ?? 0,
      prices: c3 ?? 0,
      latestProviders: (latestProviders ?? []).map((p) => ({
        id: p.id,
        name: p.name,
        region: p.region,
      })),
      latestPrices,
    });

  } catch (e: any) {
    console.error("Admin stats API error:", e);
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
