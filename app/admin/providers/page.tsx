'use client';

import { useEffect, useMemo, useState } from 'react';
import { supabaseBrowser } from '@/lib/supabase/client';
const supabase = supabaseBrowser();

/* ---------- 타입 ---------- */
type Provider = {
  id: number;
  name: string;
  addr: string;
  region: string;
  phone: string | null;
  lat: number | null;
  lng: number | null;
  auto_trust_score: number | null; // ✅ 추가
  updated_at: string | null;
};

// 정렬 키에 auto_trust_score 추가
type SortKey = 'id' | 'name' | 'region' | 'addr' | 'phone' | 'updated_at' | 'auto_trust_score';

const PAGE_SIZE = 20;

/* ---------- 스타일 ---------- */
const styles = {
  wrap: { maxWidth: 1100, margin: '30px auto', padding: '0 16px' } as React.CSSProperties,
  toolbar: { display: 'flex', gap: 12, alignItems: 'center', marginBottom: 12, flexWrap: 'wrap' } as React.CSSProperties,
  btn: {
    padding: '8px 12px',
    borderRadius: 8,
    border: '1px solid #e5e7eb',
    background: '#fff',
    cursor: 'pointer',
    fontSize: 13
  } as React.CSSProperties,
  btnPrimary: {
    padding: '8px 12px',
    borderRadius: 8,
    border: '1px solid #0ea5e9',
    background: '#0ea5e9',
    color: '#fff',
    cursor: 'pointer',
    fontWeight: 700,
    fontSize: 13
  } as React.CSSProperties,
  table: { width: '100%', borderCollapse: 'collapse' } as React.CSSProperties,
  th: { textAlign: 'left', borderBottom: '2px solid #e5e7eb', padding: '10px 8px', fontWeight: 800, fontSize: 13 } as React.CSSProperties,
  td: { borderBottom: '1px solid #f1f5f9', padding: '10px 8px', verticalAlign: 'top', fontSize: 14 } as React.CSSProperties,
  input: { width: '100%', padding: 8, border: '1px solid #e5e7eb', borderRadius: 8, fontSize: 13 } as React.CSSProperties,
  code: { fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Consolas, monospace', fontSize: 13 },
};

export default function AdminProvidersPage() {
  const [rows, setRows] = useState<Provider[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  const [kw, setKw] = useState('');
  const debouncedKw = useDebounce(kw, 250);
  const [sort, setSort] = useState<SortKey>('name');
  const [dir, setDir] = useState<'asc' | 'desc'>('asc');
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);

  const [createOpen, setCreateOpen] = useState(false);
  const [draft, setDraft] = useState<Partial<Provider>>({
    name: '', addr: '', region: '', phone: '', lat: '', lng: ''
  } as any);

  const [editing, setEditing] = useState<Record<number, Partial<Provider>>>({});

  const totalPages = useMemo(() => Math.max(1, Math.ceil(total / PAGE_SIZE)), [total]);
  const pageSafe = Math.min(page, totalPages);

  useEffect(() => {
    fetchRows();
  }, [debouncedKw, sort, dir, pageSafe]);

  async function fetchRows() {
    setLoading(true);
    setErr(null);
    try {
      const term = debouncedKw.trim();

      let countQuery = supabase
        .from('providers')
        .select('id', { count: 'exact', head: true })
        .eq('is_active', true);

      if (term) {
        const orExpr = buildOrLikeProvider(term);
        if (orExpr) countQuery = countQuery.or(orExpr);
      }
      const { count, error: countErr } = await countQuery;
      if (countErr) throw countErr;

      const from = (pageSafe - 1) * PAGE_SIZE;
      const to = from + PAGE_SIZE - 1;

      let dataQuery = supabase
        .from('providers')
        .select('id, name, addr, region, phone, lat, lng, updated_at, auto_trust_score')
        .eq('is_active', true)
        .order(sort, { ascending: dir === 'asc' })
        .eq("is_active", true)
        .range(from, to);


      if (term) {
        const orExpr = buildOrLikeProvider(term);
        if (orExpr) dataQuery = dataQuery.or(orExpr);
      }

      const { data, error: dataErr } = await dataQuery;
      if (dataErr) throw dataErr;

      setRows((data ?? []) as Provider[]);
      setTotal(count ?? 0);
    } catch (e: any) {
      setErr(e?.message || '불러오기 실패');
    } finally {
      setLoading(false);
    }
  }

  // ... (기존 CRUD 함수들: saveEdit, removeRow, createRow는 동일하게 유지하되 
  // 필요 시 auto_trust_score 수정 로직을 추가할 수 있습니다. 
  // 보통 신뢰도는 시스템 산출값이므로 수정에서는 제외하는 경우가 많습니다.)

  function toggleSort(k: SortKey) {
    if (sort === k) setDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    else { setSort(k); setDir('asc'); }
    setPage(1);
  }

  function setEdit(id: number, patch: Partial<Provider>) {
    setEditing((prev) => ({ ...prev, [id]: { ...prev[id], ...patch } }));
  }

  async function saveEdit(id: number) {
    const patch = editing[id];
    if (!patch) return;
    const base = rows.find((r) => r.id === id)!;
    const { error } = await supabase.from('providers').update(patch).eq('id', id);
    if (error) { alert(error.message); return; }
    setEditing((prev) => { const n = { ...prev }; delete n[id]; return n; });
    fetchRows();
  }


async function createRow() {
  if (!draft.name || !draft.region) {
    alert('병원명과 지역은 필수입니다');
    return;
  }

  const payload = {
    name: draft.name.trim(),
    region: draft.region.trim(),
    addr: draft.addr?.trim() || null,
    phone: draft.phone?.trim() || null,
    is_active: true
  };

  const { error } = await supabase.from('providers').insert(payload);
  if (error) {
    alert(error.message);
    return;
  }

  setCreateOpen(false);
  setDraft({});
  fetchRows();
}


  return (
    <main style={styles.wrap}>
      <h1 style={{ fontSize: 22, fontWeight: 800, marginBottom: 10 }}>병원 관리</h1>

{/* 신규 병원 생성 폼 */}
{createOpen && (
  <div style={{
    marginBottom: 16,
    padding: 16,
    border: '1px solid #e5e7eb',
    borderRadius: 12,
    background: '#f9fafb'
  }}>
    <h3 style={{ fontSize: 16, fontWeight: 700, marginBottom: 12 }}>
      새 병원 추가
    </h3>

    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
      <input
        placeholder="병원명"
        value={draft.name ?? ''}
        onChange={(e) => setDraft({ ...draft, name: e.target.value })}
        style={styles.input}
      />
      <input
        placeholder="지역 (서울/경기/인천)"
        value={draft.region ?? ''}
        onChange={(e) => setDraft({ ...draft, region: e.target.value })}
        style={styles.input}
      />
      <input
        placeholder="주소"
        value={draft.addr ?? ''}
        onChange={(e) => setDraft({ ...draft, addr: e.target.value })}
        style={styles.input}
      />
      <input
        placeholder="전화번호"
        value={draft.phone ?? ''}
        onChange={(e) => setDraft({ ...draft, phone: e.target.value })}
        style={styles.input}
      />
    </div>

    <div style={{ marginTop: 12, display: 'flex', gap: 8 }}>
      <button style={styles.btnPrimary} onClick={createRow}>
        저장
      </button>
      <button
        style={styles.btn}
        onClick={() => {
          setCreateOpen(false);
          setDraft({});
        }}
      >
        취소
      </button>
    </div>
  </div>
)}




      <div style={styles.toolbar}>
        <input
          value={kw}
          onChange={(e) => { setPage(1); setKw(e.target.value); }}
          placeholder="검색: 이름 / 주소 / 지역 / 전화번호"
          style={{ ...styles.input, maxWidth: 360 }}
        />
        <button
          style={{ ...styles.btnPrimary, marginLeft: 'auto' }}
          onClick={() => setCreateOpen((v) => !v)}
        >
          {createOpen ? '생성 취소' : '새 병원 추가'}
        </button>
      </div>

      {!loading && !err && (
        <div style={{ overflowX: 'auto', background: '#fff', border: '1px solid #e5e7eb', borderRadius: 12 }}>
          <table style={styles.table}>
            <thead>
              <tr>
                {headerCell('ID', 'id', sort, dir, toggleSort)}
                {headerCell('Name', 'name', sort, dir, toggleSort)}
                {headerCell('Addr', 'addr', sort, dir, toggleSort)}
                {headerCell('Region', 'region', sort, dir, toggleSort)}
                {headerCell('Phone', 'phone', sort, dir, toggleSort)}
                {headerCell('Trust', 'auto_trust_score', sort, dir, toggleSort)}
                {headerCell('Updated', 'updated_at', sort, dir, toggleSort)}
                <th style={styles.th}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => {
                const ed = editing[r.id] || {};
                const isEditing = !!editing[r.id];
                
                return (
                  <tr key={r.id}>
                    <td style={styles.td}><span style={styles.code}>{r.id}</span></td>
                    <td style={styles.td}>
                      {isEditing ? (
                        <input style={styles.input} value={ed.name ?? r.name} onChange={(e) => setEdit(r.id, { name: e.target.value })} />
                      ) : (
                        <div>
                          <div style={{ fontWeight: 600 }}>{r.name}</div>
                          {/* ✅ 이름 하단에 신뢰도 표시 (요청하신 로직 적용) */}
                          {r.auto_trust_score !== null && (
                            <div style={{ fontSize: 11, marginTop: 2 }} className={
                              r.auto_trust_score >= 0.9 ? "text-green-600 font-bold" : 
                              r.auto_trust_score >= 0.7 ? "text-yellow-600" : "text-red-600"
                            }>
                              자동 신뢰도 {r.auto_trust_score.toFixed(2)}
                            </div>
                          )}
                        </div>
                      )}
                    </td>
                    <td style={styles.td}>
                      {isEditing ? <input style={styles.input} value={ed.addr ?? r.addr} onChange={(e) => setEdit(r.id, { addr: e.target.value })} /> : r.addr}
                    </td>
                    <td style={styles.td}>{r.region}</td>
                    <td style={styles.td}>{r.phone || '—'}</td>
                    {/* ✅ 신뢰도 전용 컬럼 (선택 사항: 위 Name 하단에 넣었으므로 여기선 수치만 표시) */}
                    <td style={styles.td}>
                       <span className={
                         (r.auto_trust_score ?? 0) >= 0.9 ? "text-green-600" : 
                         (r.auto_trust_score ?? 0) >= 0.7 ? "text-yellow-600" : "text-red-600"
                       }>
                         {r.auto_trust_score?.toFixed(2) ?? '—'}
                       </span>
                    </td>
                    <td style={styles.td}><small style={{ color: '#9ca3af' }}>{r.updated_at?.split('T')[0] || '—'}</small></td>
                    <td style={styles.td}>
                      <div style={{ display: 'flex', gap: 6 }}>
                        {isEditing ? (
                          <button style={styles.btnPrimary} onClick={() => saveEdit(r.id)}>저장</button>
                        ) : (
                          <button style={styles.btn} onClick={() => setEditing({ [r.id]: {} })}>수정</button>
                        )}
                        <button style={styles.btn} onClick={() => removeRow(r.id)}>삭제</button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
      
      {/* ... 페이지네이션 부분은 동일 ... */}
    </main>
  );
}

// (기존 유틸리티 함수들 유지: headerCell, useDebounce, buildOrLikeProvider 등)

/* ---------- 디바운스 훅 (에러 해결용) ---------- */
function useDebounce<T>(value: T, delay = 250) {
  const [debouncedValue, setDebouncedValue] = useState(value);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => {
      clearTimeout(handler);
    };
  }, [value, delay]);

  return debouncedValue;
}

/* ---------- 입력 보정 유틸 (함께 누락되었을 수 있음) ---------- */
function toNullableNumber(v: any): number | null {
  if (v === null || v === undefined || v === '') return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

function normalizeEmpty(v: any): string | null {
  const s = (v ?? '').toString().trim();
  return s === '' ? null : s;
}

/* ---------- 검색 .or() 유틸 ---------- */
function escapeOrValue(s: string) {
  return s.replace(/,/g, '\\,');
}

function buildOrLikeProvider(term: string) {
  const t = term.trim();
  if (!t) return '';
  const like = `%${escapeOrValue(t)}%`;
  return `name.ilike.${like},addr.ilike.${like},region.ilike.${like},phone.ilike.${like}`;
}
/* ---------- 테이블 헤더 유틸 (에러 해결용) ---------- */
function headerCell(
  label: string, 
  key: SortKey, 
  sort: SortKey, 
  dir: 'asc' | 'desc', 
  onClick: (k: SortKey) => void
) {
  return (
    <th style={styles.th}>
      <button
        type="button"
        onClick={() => onClick(key)}
        style={{ 
          background: 'none', 
          border: 'none', 
          cursor: 'pointer', 
          fontWeight: 800,
          fontSize: 'inherit',
          padding: 0,
          display: 'flex',
          alignItems: 'center',
          gap: '4px'
        }}
      >
        {label} 
        <span style={{ fontSize: '10px', color: sort === key ? '#0ea5e9' : '#d1d5db' }}>
          {sort === key ? (dir === 'asc' ? '▲' : '▼') : '↕'}
        </span>
      </button>
    </th>
  );
}