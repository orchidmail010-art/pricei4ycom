import { NextResponse } from 'next/server';
import { supabasePublic } from '../../../../lib/supabasePublic';

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);

  const region = (searchParams.get('region') || '전체').trim();
  const page = Math.max(1, Number(searchParams.get('page') || '1'));
  const pageSize = Math.min(200, Math.max(1, Number(searchParams.get('pageSize') || '20')));

  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;

  let q = supabasePublic
    .from('prices')
    .select(
      `
      id,
      price,
      min_price,
      max_price,
      unit,
      note,
      original_name,
      detail_name,
      source_url,
      updated_at,
      providers!inner(
        id,
        name,
        region,
        is_active
      ),
      services(
        id,
        name,
        category
      )
    `
    )
    .eq('providers.is_active', true) // ✅ 테스트 병원 차단
    .range(from, to)
    .order('id', { ascending: false });

  if (region !== '전체') {
    q = q.eq('providers.region', region);
  }

  const { data, error } = await q;

  if (error) {
    return NextResponse.json({ ok: false, error: error.message }, { status: 400 });
  }

  const items =
    (data || []).map((row: any) => ({
      id: row.id,
  provider_id: row.providers?.id ?? null,
  service_id: row.services?.id ?? null,
      provider_name: row.providers?.name ?? null,
      provider_region: row.providers?.region ?? null,
      service_name: row.services?.name ?? null,
      service_category: row.services?.category ?? null,
      price: row.price ?? null,
      min_price: row.min_price ?? null,
      max_price: row.max_price ?? null,
      unit: row.unit ?? null,
      note: row.note ?? null,
      original_name: row.original_name ?? null,
      detail_name: row.detail_name ?? null,
      source_url: row.source_url ?? null,
      updated_at: row.updated_at ?? null,
    })) || [];

  // ✅ 혹시라도 provider_name이 null로 내려오는 찌꺼기 제거(추가 안전장치)
  const cleaned = items.filter((it: any) => it.provider_name);

  return NextResponse.json({ ok: true, items: cleaned });
}
