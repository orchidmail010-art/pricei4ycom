import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import Papa from 'papaparse';

// ====== 환경변수 ======
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!; // 서버 전용 키
const ADMIN_SECRET = process.env.ADMIN_UPLOAD_SECRET!;

const supabase = createClient(SUPABASE_URL, SERVICE_KEY);

// ====== 유틸 ======
const toFloat = (v: any) => {
  if (v === null || v === undefined) return null;
  const s = String(v).trim();
  if (!s) return null;
  const n = parseFloat(s.replace(/,/g, ''));
  return Number.isFinite(n) ? n : null;
};

const toInt = (v: any) => {
  if (v === null || v === undefined) return null;
  const s = String(v).trim();
  if (!s) return null;
  const n = parseInt(s.replace(/,/g, ''), 10);
  return Number.isFinite(n) ? n : null;
};

const normalizeHeader = (h: string) =>
  h.trim().toLowerCase().replace(/\s+/g, '_');

const chunk = <T,>(arr: T[], size = 1000) => {
  const out: T[][] = [];
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
  return out;
};

function detectTarget(headers: string[]) {
  const set = new Set(headers.map(normalizeHeader));
  // providers(id,name,addr,region,phone,lat,lng,updated_at)
  if (set.has('name') && set.has('addr') && set.has('region')) return 'providers';
  // services(id,code,name,category)
  if (set.has('name') && (set.has('code') || set.has('category'))) return 'services';
  // prices(id,provider_id,service_id,price,...)
  if (set.has('provider_id') && set.has('service_id') && set.has('price')) return 'prices';
  return null;
}

// ====== 핸들러 ======
export async function POST(req: Request) {
  try {
    // 1) 인증
    const secret = req.headers.get('x-admin-secret');
    if (!ADMIN_SECRET || secret !== ADMIN_SECRET) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // 2) CSV 파일 수신
    const contentType = req.headers.get('content-type') || '';
    if (!contentType.includes('multipart/form-data')) {
      return NextResponse.json(
        { error: 'multipart/form-data 로 CSV 파일을 업로드 하세요.' },
        { status: 400 }
      );
    }

    const form = await req.formData();
    const file = form.get('file') as File | null;
    if (!file) {
      return NextResponse.json({ error: 'file 필드가 없습니다.' }, { status: 400 });
    }

    // 3) 파싱
    const text = await file.text();
    const parsed = Papa.parse<Record<string, string>>(text, {
      header: true,
      skipEmptyLines: true,
      transformHeader: normalizeHeader,
    });

    if (parsed.errors?.length) {
      return NextResponse.json(
        { error: `CSV 파싱 오류: ${parsed.errors[0].message}` },
        { status: 400 }
      );
    }

    const rows = (parsed.data || []).filter((r) => Object.keys(r).length);
    if (!rows.length) {
      return NextResponse.json({ error: 'CSV 데이터가 비어 있습니다.' }, { status: 400 });
    }

    // 4) 대상 테이블 판단
    const target = detectTarget(Object.keys(rows[0]));
    if (!target) {
      return NextResponse.json(
        { error: '헤더를 보고 대상 테이블을 판단할 수 없습니다 (providers/services/prices 형식 확인).' },
        { status: 400 }
      );
    }

    // 5) 테이블별 업로드
    if (target === 'providers') {
      // providers(id,name,addr,region,phone,lat,lng,updated_at)
      const toInsert = rows.map((r) => ({
        name: (r.name || '').trim(),
        addr: (r.addr || '').trim(),
        region: (r.region || '').trim(),
        phone: (r.phone || '').trim() || null,
        lat: toFloat(r.lat),
        lng: toFloat(r.lng),
        updated_at: (r.updated_at || '').trim() || null,
      })).filter((r) => r.name && r.addr && r.region);

      let inserted = 0;
      for (const part of chunk(toInsert, 1000)) {
        const { data, error } = await supabase.from('providers').upsert(part, { onConflict: 'name,addr,region' }).select('id');
        if (error) throw error;
        inserted += data?.length || 0;
      }
      return NextResponse.json({ ok: true, table: 'providers', inserted });
    }

    if (target === 'services') {
      // services(id,code,name,category)
      const toInsert = rows.map((r) => ({
        code: (r.code || '').trim() || null,
        name: (r.name || '').trim(),
        category: (r.category || '').trim() || null,
      })).filter((r) => r.name);

      let inserted = 0;
      for (const part of chunk(toInsert, 1000)) {
        const { data, error } = await supabase.from('services').insert(part).select('id');
        if (error) throw error;
        inserted += data?.length || 0;
      }
      return NextResponse.json({ ok: true, table: 'services', inserted });
    }

    if (target === 'prices') {
      // prices(id,provider_id,service_id,price,unit,note,updated_at,source_url,last_checked_at)
      const toInsert = rows.map((r) => ({
        provider_id: toInt(r.provider_id)!,
        service_id: toInt(r.service_id)!,
        price: toInt(r.price)!,
        unit: (r.unit || '').trim() || null,
        note: (r.note || '').trim() || null,
        updated_at: (r.updated_at || '').trim() || null,
        source_url: (r.source_url || '').trim() || null,
        last_checked_at: (r.last_checked_at || new Date().toISOString()),
      })).filter((x) => x.provider_id && x.service_id && x.price);

      let inserted = 0;
      for (const part of chunk(toInsert, 1000)) {
        const { data, error } = await supabase.from('prices').insert(part).select('id');
        if (error) throw error;
        inserted += data?.length || 0;
      }
      return NextResponse.json({ ok: true, table: 'prices', inserted });
    }

    return NextResponse.json({ error: '지원하지 않는 타입' }, { status: 400 });
  } catch (e: any) {
    console.error(e);
    // ✅ 항상 JSON으로 응답
    return NextResponse.json(
      { error: e?.message || 'Server Error' },
      { status: 500 }
    );
  }
}
