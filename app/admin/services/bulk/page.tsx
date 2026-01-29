'use client';

import { useState } from 'react';

const S = {
  wrap: { maxWidth: 1000, margin: '30px auto', padding: '0 16px' } as React.CSSProperties,
  card: { border: '1px solid #e5e7eb', borderRadius: 12, background: '#fff', padding: 12 } as React.CSSProperties,
  input: { padding: 8, border: '1px solid #e5e7eb', borderRadius: 8 } as React.CSSProperties,
  btn: { padding: '8px 12px', borderRadius: 8, border: '1px solid #e5e7eb', background: '#fff', cursor: 'pointer' } as React.CSSProperties,
  primary: { padding: '8px 12px', borderRadius: 8, border: '1px solid #0ea5e9', background: '#0ea5e9', color: '#fff', cursor: 'pointer', fontWeight: 700 } as React.CSSProperties,
  table: { width: '100%', borderCollapse: 'collapse' } as React.CSSProperties,
  th: { textAlign: 'left', borderBottom: '2px solid #e5e7eb', padding: '10px 8px', fontWeight: 800 } as React.CSSProperties,
  td: { borderBottom: '1px solid #f1f5f9', padding: '10px 8px', verticalAlign: 'top' } as React.CSSProperties,
  note: { fontSize: 12, color: '#6b7280' } as React.CSSProperties,
};

type ParsePreview = { headers: string[]; rows: string[][] };

function quickPreview(text: string): ParsePreview {
  const lines = text.replace(/\r\n/g, '\n').split('\n').filter(Boolean);
  if (lines.length === 0) return { headers: [], rows: [] };
  const headers = parseCsvLine(lines[0]);
  const rows: string[][] = [];
  for (let i = 1; i < lines.length; i++) rows.push(parseCsvLine(lines[i]));
  return { headers, rows };
}
function parseCsvLine(line: string): string[] {
  const out: string[] = [];
  let cur = ''; let q = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (q) {
      if (ch === '"') { if (line[i+1] === '"') { cur += '"'; i++; } else q = false; }
      else cur += ch;
    } else {
      if (ch === '"') q = true;
      else if (ch === ',') { out.push(cur); cur = ''; }
      else cur += ch;
    }
  }
  out.push(cur); return out;
}

export default function BulkServicesPage() {
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<ParsePreview | null>(null);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  async function onPick(f: File | null) {
    setFile(f); setPreview(null); setResult(null); setError(null);
    if (!f) return;
    const text = await f.text();
    setPreview(quickPreview(text));
  }

  function downloadTemplate() {
    const header = 'code,name,category\n';
    const blob = new Blob([header], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download = 'services_template.csv'; a.click();
    URL.revokeObjectURL(url);
  }

  async function onSubmit() {
    if (!file) return alert('CSV 파일을 선택하세요.');
    setLoading(true); setError(null); setResult(null);
    try {
      const fd = new FormData();
      fd.append('file', file);
      const res = await fetch('/api/admin/services/bulk', { method: 'POST', body: fd });
      const json = await res.json();
      if (!res.ok || !json.ok) throw new Error(json?.error || '업로드 실패');
      setResult(json);
    } catch (e:any) {
      setError(e?.message || '업로드 실패');
    } finally { setLoading(false); }
  }

  return (
    <main style={S.wrap}>
      <h1 style={{ fontSize: 22, fontWeight: 800, marginBottom: 10 }}>서비스 대량등록 (CSV)</h1>

      <div style={{ ...S.card, marginBottom: 14 }}>
        <div style={{ display:'flex', gap:12, alignItems:'center', flexWrap:'wrap' }}>
          <input type="file" accept=".csv,text/csv" onChange={e => onPick(e.target.files?.[0] || null)} style={S.input} />
          <button onClick={downloadTemplate} style={S.btn}>템플릿 받기</button>
          <button onClick={onSubmit} disabled={!file || loading} style={S.primary}>{loading ? '업로드 중…' : '업로드 실행'}</button>
        </div>
        <p style={{ ...S.note, marginTop: 10 }}>
          * 헤더 포함 CSV. 지원 컬럼: <code>code,name,category</code><br/>
          * 필수: <b>name</b> (유니크 제약은 스키마에 맞춤)
        </p>
      </div>

      {preview && (
        <div style={{ ...S.card, marginBottom:14 }}>
          <h3 style={{ marginTop:0 }}>미리보기 (상위 10행)</h3>
          <div style={{ overflowX:'auto' }}>
            <table style={S.table}>
              <thead><tr>{preview.headers.map((h,i)=><th key={i} style={S.th}>{h}</th>)}</tr></thead>
              <tbody>
                {preview.rows.slice(0,10).map((row,ri)=>(
                  <tr key={ri}>{row.map((c,ci)=><td key={ci} style={S.td}>{c}</td>)}</tr>
                ))}
              </tbody>
            </table>
          </div>
          <div style={{ ...S.note, marginTop: 8 }}>총 {preview.rows.length.toLocaleString()} 행(헤더 제외)</div>
        </div>
      )}

      {error && <div style={{ ...S.card, borderColor:'#fca5a5', background:'#fff1f2' }}><b style={{ color:'#b91c1c' }}>오류</b><pre style={{ whiteSpace:'pre-wrap' }}>{error}</pre></div>}
      {result && (
        <div style={{ ...S.card, borderColor:'#86efac', background:'#f0fdf4' }}>
          <b>완료</b>
          <div style={{ marginTop:6 }}>삽입: <b>{result.inserted}</b> 행, 실패: <b>{result.failed}</b> 행</div>
          {!!(result.errors?.length) && (
            <details style={{ marginTop:8 }}>
              <summary>에러 상세 ({result.errors.length}건)</summary>
              <ul>{result.errors.map((e:any,i:number)=><li key={i} style={{ fontFamily:'ui-monospace,monospace', fontSize:12 }}>#{e.index}: {e.message}</li>)}</ul>
            </details>
          )}
        </div>
      )}
    </main>
  );
}
