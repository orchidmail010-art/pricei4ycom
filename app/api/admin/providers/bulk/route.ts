// app/api/admin/providers/bulk/route.ts
import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

// 서버용 Supabase 클라이언트 (환경변수 사용)
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY! // RLS 통과 필요 시 SRK 사용. (일반 anon이면 정책에 맞춰 조정)
)

export async function POST(req: Request) {
  try {
    const form = await req.formData()
    const file = form.get('file') as File | null
    if (!file) {
      return NextResponse.json({ ok: false, error: '파일이 없습니다.' }, { status: 400 })
    }

    const text = await file.text()
    const { headers, rows } = quickPreview(text)
    // 기대 헤더: name,addr,region,phone,lat,lng,updated_at
    const idx = mapIndex(headers, ['name','addr','region','phone','lat','lng','updated_at'])

    let inserted = 0
    const errors: Array<{ index:number; message:string }> = []

    for (let i = 0; i < rows.length; i++) {
      const r = rows[i]
      try {
        const payload = {
          name: get(r, idx.name) || null,
          addr: get(r, idx.addr) || null,
          region: get(r, idx.region) || null,
          phone: get(r, idx.phone) || null,
          lat: toNum(get(r, idx.lat)),
          lng: toNum(get(r, idx.lng)),
          updated_at: get(r, idx.updated_at) || null,
        }

        if (!payload.name || !payload.addr) {
          throw new Error('name, addr는 필수입니다.')
        }

        // name+addr 유니크 기준으로 업서트
        const { error } = await supabase
          .from('providers')
          .upsert(payload, { onConflict: 'name,addr' })

        if (error) throw error
        inserted++
      } catch (e: any) {
        errors.push({ index: i + 1, message: e?.message || '알 수 없는 오류' })
      }
    }

    return NextResponse.json({
      ok: true,
      inserted,
      failed: errors.length,
      errors,
    })
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e?.message || '서버 오류' }, { status: 500 })
  }
}

/* ---- CSV helper (헤더+행 파싱) ---- */
function quickPreview(text: string) {
  const lines = text.replace(/\r\n/g, '\n').split('\n').filter(Boolean)
  if (!lines.length) return { headers: [] as string[], rows: [] as string[][] }
  const headers = parseLine(lines[0])
  const rows = lines.slice(1).map(parseLine)
  return { headers, rows }
}

function parseLine(line: string) {
  const out: string[] = []
  let cur = '', q = false
  for (let i = 0; i < line.length; i++) {
    const ch = line[i]
    if (q) {
      if (ch === '"') { if (line[i + 1] === '"') { cur += '"'; i++ } else q = false }
      else cur += ch
    } else {
      if (ch === '"') q = true
      else if (ch === ',') { out.push(cur); cur = '' }
      else cur += ch
    }
  }
  out.push(cur)
  return out
}

function mapIndex(headers: string[], keys: string[]) {
  const m: Record<string, number> = {}
  keys.forEach(k => { m[k] = headers.findIndex(h => h.trim() === k) })
  return m as Record<'name'|'addr'|'region'|'phone'|'lat'|'lng'|'updated_at', number>
}
const get = (row: string[], i: number) => (i >= 0 ? row[i]?.trim() : '')
const toNum = (v: string) => v ? Number(v) : null
