import { NextResponse } from 'next/server';
import { supabaseServer } from '@/lib/supabase/server';
const supabase = supabaseServer();


/** 지원 컬럼 */
const ALLOWED = new Set([
  'provider_id','service_id','price','unit','note','source_url','updated_at','last_checked_at'
]);

export async function POST(req: Request) {
  try {
    const ct = req.headers.get('content-type') || '';
    if (!ct.includes('multipart/form-data')) {
      return NextResponse.json({ ok: false, error: 'multipart/form-data 로 업로드하세요.' }, { status: 400 });
    }

    const form = await req.formData();
    const file = form.get('file') as File | null;
    if (!file) {
      return NextResponse.json({ ok: false, error: 'file 필드가 비었습니다.' }, { status: 400 });
    }

    const text = await file.text();
    const { headers, rows } = parseCsv(text);

    if (headers.length === 0) {
      return NextResponse.json({ ok: false, error: 'CSV 헤더가 없습니다.' }, { status: 400 });
    }

    // 컬럼 필터링 + 인덱싱
    const usedIdx: number[] = [];
    const usedCols: string[] = [];
    headers.forEach((h, i) => {
      const k = h.trim();
      if (ALLOWED.has(k)) {
        usedIdx.push(i);
        usedCols.push(k);
      }
    });

    if (!usedCols.includes('provider_id') || !usedCols.includes('service_id') || !usedCols.includes('price')) {
      return NextResponse.json({ ok: false, error: '필수 컬럼(provider_id, service_id, price)이 누락되었습니다.' }, { status: 400 });
    }

    let inserted = 0;
    const errors: { index: number; message: string }[] = [];

    const batchSize = 500;
    for (let i = 0; i < rows.length; i += batchSize) {
      const slice = rows.slice(i, i + batchSize);
      const payload = slice.map((cols, rowOffset) => {
        // 행 → 객체 매핑
        const obj: Record<string, any> = {};
        usedIdx.forEach((ci, pos) => {
          obj[usedCols[pos]] = cols[ci] ?? null;
        });

        // 타입 정제
        obj.provider_id = toInt(obj.provider_id);
        obj.service_id  = toInt(obj.service_id);
        obj.price       = toInt(obj.price);
        obj.unit        = normalizeEmpty(obj.unit);
        obj.note        = normalizeEmpty(obj.note);
        obj.source_url  = normalizeEmpty(obj.source_url);
        obj.updated_at       = normalizeEmpty(obj.updated_at);
        obj.last_checked_at  = normalizeEmpty(obj.last_checked_at);

        // 필수 검사
        if (!obj.provider_id || !obj.service_id || !obj.price) {
          // 개별 행은 제외 (에러 수집)
          errors.push({ index: i + rowOffset + 2 /* 1-based, + header */, message: '필수값 누락(provider_id/service_id/price)' });
          // null 반환해 insert에서 걸러지도록
          return null;
        }
        return obj;
      }).filter(Boolean) as any[];

      if (!payload.length) continue;

      const { error } = await supabase.from('prices').upsert(payload, { onConflict: 'provider_id,service_id' }); // 같은 키면 업데이트
      if (error) {
        // 배치 전체 실패 → 개별 삽입으로 재도전해서 에러 상세화
        for (let k = 0; k < payload.length; k++) {
          const row = payload[k];
          const { error: e2 } = await supabase.from('prices').insert([row]);
          if (e2) {
            errors.push({ index: i + k + 2, message: e2.message });
          } else {
            inserted++;
          }
        }
      } else {
        inserted += payload.length;
      }
    }

    return NextResponse.json({ ok: true, inserted, failed: errors.length, errors });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e?.message || '서버 오류' }, { status: 500 });
  }
}

/* -------- CSV 파서 (따옴표 지원) -------- */
function parseCsv(text: string) {
  const lines = text.replace(/\r\n/g, '\n').replace(/\r/g, '\n').split('\n').filter(l => l.length > 0);
  if (lines.length === 0) return { headers: [] as string[], rows: [] as string[][] };

  const headers = parseCsvLine(lines[0]).map(s => s.trim());
  const rows: string[][] = [];
  for (let i = 1; i < lines.length; i++) {
    rows.push(parseCsvLine(lines[i]).map(s => s.trim()));
  }
  return { headers, rows };
}

function parseCsvLine(line: string): string[] {
  const out: string[] = [];
  let cur = '';
  let inQ = false;

  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      if (inQ && line[i + 1] === '"') { cur += '"'; i++; }
      else { inQ = !inQ; }
    } else if (ch === ',' && !inQ) {
      out.push(cur); cur = '';
    } else {
      cur += ch;
    }
  }
  out.push(cur);
  return out;
}

/* -------- 보조 유틸 -------- */
function toInt(v: any): number | null {
  const n = Number(v);
  return Number.isFinite(n) ? Math.trunc(n) : null;
}
function normalizeEmpty(v: any): string | null {
  const s = (v ?? '').toString().trim();
  return s === '' ? null : s;
}
