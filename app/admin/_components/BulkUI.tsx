'use client';

import React, { useState } from 'react';

export type BulkResult = {
  ok: boolean;
  inserted?: number;
  upserted?: number;
  failed?: number;
  errors?: { index: number; message: string }[];
  error?: string;
};

export type BulkUIProps = {
  title: string;                // 페이지 제목
  apiPath: string;              // POST 업로드 API 경로
  templateName: string;         // 템플릿 파일 이름
  templateCSV: string;          // 템플릿 CSV 내용
  requiredDesc: string;         // 필수 컬럼 설명
  allowedCols: string;          // 지원 컬럼
};

export default function BulkUI({
  title, apiPath, templateName, templateCSV, requiredDesc, allowedCols,
}: BulkUIProps) {
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<{ headers: string[]; rows: string[][] } | null>(null);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<BulkResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function onPick(f: File | null) {
    setFile(f); setPreview(null); setResult(null); setError(null);
    if (!f) return;
    const text = await f.text();
    setPreview(quickPreview(text));
  }

  async function onSubmit() {
    if (!file) return alert('CSV 파일을 선택하세요.');
    setLoading(true); setError(null); setResult(null);
    try {
      const fd = new FormData();
      fd.append('file', file);
      const res = await fetch(apiPath, { method: 'POST', body: fd });
      const json = await res.json();
      if (!res.ok || !json.ok) throw new Error(json?.error || '업로드 실패');
      setResult(json);
    } catch (e: any) {
      setError(e?.message || '업로드 실패');
    } finally { setLoading(false); }
  }

  function downloadTemplate() {
    const blob = new Blob([templateCSV], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = templateName; a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <main style={S.wrap}>
      <h1 style={{ fontSize: 22, fontWeight: 800, marginBottom: 10 }}>{title}</h1>

      <div style={{ ...S.card, marginBottom: 14 }}>
        <div style={{ display:'flex', gap:12, alignItems:'center', flexWrap:'wrap' }}>
          <input type="file" accept=".csv,text/csv" onChange={e => onPick(e.target.files?.[0] || null)} style={S.input} />
          <button onClick={downloadTemplate} style={S.btn}>템플릿 받기</button>
          <button onClick={onSubmit} disabled={!file || loading} style={S.primary}>
            {loading ? '업로드 중…' : '업로드 실행'}
          </button>
        </div>
        <p style={{ ...S.note, marginTop: 10 }}>
          * 헤더 포함 CSV<br/>
          * 지원 컬럼: <code>{allowedCols}</code><br/>
          * 필수: <b>{requiredDesc}</b>
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
          <div style={{ ...S.note, marginTop: 8 }}>
            총 {preview.rows.length.toLocaleString()} 행(헤더 제외).
          </div>
        </div>
      )}

      {error && (
        <div style={{ ...S.card, borderColor:'#fca5a5', background:'#fff1f2' }}>
          <b style={{ color:'#b91c1c' }}>오류</b>
          <pre>{error}</pre>
        </div>
      )}

      {result && (
        <div style={{ ...S.card, borderColor:'#86efac', background:'#f0fdf4' }}>
          <b>완료</b>
          <div style={{ marginTop:6 }}>
            삽입/업서트: <b>{result.inserted ?? result.upserted}</b> 행, 실패: <b>{result.failed}</b> 행
          </div>
          {!!(result.errors?.length) && (
            <details style={{ marginTop:8 }}>
              <summary>에러 상세 ({result.errors.length}건)</summary>
              <ul>{result.errors.map((e:any,i:number)=>
                <li key={i} style={{ fontFamily:'ui-monospace,monospace', fontSize:12 }}>
                  #{e.index}: {e.message}
                </li>)}</ul>
            </details>
          )}
        </div>
      )}
    </main>
  );
}

/* ---------- Style ---------- */
const S = {
  wrap: { maxWidth: 900, margin: '30px auto', padding: '0 16px' } as React.CSSProperties,
  card: { border: '1px solid #e5e7eb', borderRadius: 12, background: '#fff', padding: 16 } as React.CSSProperties,
  input: { width: '100%', padding: 10, border: '1px solid #e5e7eb', borderRadius: 8 } as React.CSSProperties,
  btn: { padding: '10px 14px', borderRadius: 8, border: '1px solid #e5e7eb', background: '#fff', cursor: 'pointer' } as React.CSSProperties,
  primary: { padding: '10px 14px', borderRadius: 8, border: '1px solid #0ea5e9', background: '#0ea5e9', color: '#fff', cursor: 'pointer', fontWeight: 700 } as React.CSSProperties,
  table: { width: '100%', borderCollapse: 'collapse', fontSize: 14 } as React.CSSProperties,
  th: { textAlign: 'left', borderBottom: '2px solid #e5e7eb', padding: '6px 8px' } as React.CSSProperties,
  td: { borderBottom: '1px solid #f1f5f9', padding: '6px 8px', whiteSpace: 'nowrap' } as React.CSSProperties,
  note: { color: '#6b7280', fontSize: 13 } as React.CSSProperties,
};

/* ---------- CSV 미리보기 Helper ---------- */
function quickPreview(text: string) {
  const lines = text.replace(/\r\n/g,'\n').replace(/\r/g,'\n').split('\n').filter(Boolean);
  if (!lines.length) return { headers: [], rows: [] };
  const headers = parseCsvLine(lines[0]);
  const rows: string[][] = [];
  for (let i=1;i<lines.length;i++) rows.push(parseCsvLine(lines[i]));
  return { headers, rows };
}
function parseCsvLine(line:string){
  const out:string[]=[]; let cur=''; let q=false;
  for(let i=0;i<line.length;i++){const ch=line[i];
    if(ch==='"'){ if(q && line[i+1]==='"'){cur+='"'; i++;} else q=!q; }
    else if(ch===',' && !q){ out.push(cur); cur=''; }
    else cur+=ch;
  } out.push(cur); return out.map(s=>s.trim());
}
