import { NextResponse } from 'next/server';
import { supabaseServer } from '@/lib/supabase/server';
const supabase = supabaseServer();


const ALLOWED = new Set(['code','name','category']);

export async function POST(req: Request) {
  try {
    const ct = req.headers.get('content-type') || '';
    if (!ct.includes('multipart/form-data')) {
      return NextResponse.json({ ok:false, error:'multipart/form-data 로 업로드하세요.' }, { status:400 });
    }

    const form = await req.formData();
    const file = form.get('file') as File | null;
    if (!file) return NextResponse.json({ ok:false, error:'file 필드가 비었습니다.' }, { status:400 });

    const text = await file.text();
    const { headers, rows } = parseCsv(text);
    if (!headers.length) return NextResponse.json({ ok:false, error:'CSV 헤더가 없습니다.' }, { status:400 });

    const idx:number[]=[]; const cols:string[]=[];
    headers.forEach((h,i)=>{ const k=h.trim(); if(ALLOWED.has(k)){ idx.push(i); cols.push(k); }});

    if (!cols.includes('name')) {
      return NextResponse.json({ ok:false, error:'필수 컬럼(name) 누락' }, { status:400 });
    }

    let inserted = 0;
    const errors: { index:number; message:string }[] = [];
    const batchSize = 500;

    for (let i=0; i<rows.length; i+=batchSize) {
      const slice = rows.slice(i, i+batchSize);
      const payload = slice.map((r, off) => {
        const obj: Record<string, any> = {};
        idx.forEach((ci, p) => obj[cols[p]] = r[ci] ?? null);

        obj.code = optStr(obj.code);
        obj.name = reqStr(obj.name);
        obj.category = optStr(obj.category);

        if (!obj.name) {
          errors.push({ index: i+off+2, message:'필수값(name) 누락' });
          return null;
        }
        return obj;
      }).filter(Boolean) as any[];

      if (!payload.length) continue;

      // 스키마에 code UNIQUE가 있다면 아래 업서트 사용:
      // const { error } = await supabase.from('services').upsert(payload, { onConflict:'code' });
      const { error } = await supabase.from('services').insert(payload);

      if (error) {
        for (let k=0;k<payload.length;k++){
          const row = payload[k];
          // 개별 행 재시도(업서트로 바꾸고 싶다면 위 주석 참고)
          const { error: e2 } = await supabase.from('services').insert([row]);
          if (e2) errors.push({ index: i+k+2, message: e2.message });
          else inserted++;
        }
      } else {
        inserted += payload.length;
      }
    }

    return NextResponse.json({ ok:true, inserted, failed: errors.length, errors });
  } catch (e:any) {
    return NextResponse.json({ ok:false, error: e?.message || '서버 오류' }, { status:500 });
  }
}

/* ---- CSV & Utils ---- */
function parseCsv(text:string){
  const lines = text.replace(/\r\n/g,'\n').replace(/\r/g,'\n').split('\n').filter(l=>l.length>0);
  if (!lines.length) return { headers:[] as string[], rows:[] as string[][] };
  const headers = parseCsvLine(lines[0]).map(s=>s.trim());
  const rows:string[][] = [];
  for (let i=1;i<lines.length;i++) rows.push(parseCsvLine(lines[i]).map(s=>s.trim()));
  return { headers, rows };
}
function parseCsvLine(line:string){ const out:string[]=[]; let cur=''; let q=false;
  for(let i=0;i<line.length;i++){ const ch=line[i];
    if(ch==='"'){ if(q && line[i+1]==='"'){ cur+='"'; i++; } else q=!q; }
    else if(ch===',' && !q){ out.push(cur); cur=''; }
    else cur+=ch;
  } out.push(cur); return out;
}
function reqStr(v:any){ const s=(v??'').toString().trim(); return s||null; }
function optStr(v:any){ const s=(v??'').toString().trim(); return s||null; }
