'use client';


import { useEffect, useMemo, useState } from 'react';
import { supabaseBrowser } from '@/lib/supabase/client';
const supabase = supabaseBrowser();


type Service = {
  id: number;
  code: string | null;
  name: string;              // NOT NULL 반영
  category: string | null;
};

type SortKey = 'id' | 'code' | 'name' | 'category';

const PAGE_SIZE = 20;

const styles = {
  wrap: { maxWidth: 1000, margin: '30px auto', padding: '0 16px' } as React.CSSProperties,
  toolbar: { display: 'flex', gap: 12, alignItems: 'center', marginBottom: 12 } as React.CSSProperties,
  btn: {
    padding: '8px 12px',
    borderRadius: 8,
    border: '1px solid #e5e7eb',
    background: '#fff',
    cursor: 'pointer',
  } as React.CSSProperties,
  btnPrimary: {
    padding: '8px 12px',
    borderRadius: 8,
    border: '1px solid #0ea5e9',
    background: '#0ea5e9',
    color: '#fff',
    cursor: 'pointer',
    fontWeight: 700,
  } as React.CSSProperties,
  table: { width: '100%', borderCollapse: 'collapse' } as React.CSSProperties,
  th: { textAlign: 'left', borderBottom: '2px solid #e5e7eb', padding: '10px 8px', fontWeight: 800 } as React.CSSProperties,
  td: { borderBottom: '1px solid #f1f5f9', padding: '10px 8px', verticalAlign: 'top' } as React.CSSProperties,
  input: { width: '100%', padding: 8, border: '1px solid #e5e7eb', borderRadius: 8 } as React.CSSProperties,
  code: { fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Consolas, monospace', fontSize: 13 } as React.CSSProperties,
};

export default function AdminServicesPage() {
  // 데이터 상태
  const [rows, setRows] = useState<Service[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  // 검색/정렬/페이지
  const [kw, setKw] = useState('');                // ✅ kw 정의
  const debouncedKw = useDebounce(kw, 250);
  const [sort, setSort] = useState<SortKey>('name');
  const [dir, setDir] = useState<'asc' | 'desc'>('asc');
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);

  // 인라인 생성행
  const [createOpen, setCreateOpen] = useState(false);
  const [draft, setDraft] = useState<Partial<Service>>({ code: '', name: '', category: '' });

  // 인라인 수정 상태: service.id → 부분필드
  const [editing, setEditing] = useState<Record<number, Partial<Service>>>({});

  const totalPages = useMemo(() => Math.max(1, Math.ceil(total / PAGE_SIZE)), [total]);
  const pageSafe = Math.min(page, totalPages);

  useEffect(() => {
    fetchRows();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debouncedKw, sort, dir, pageSafe]);

  async function fetchRows() {
    setLoading(true);
    setErr(null);
    try {
      const term = debouncedKw.trim();

      // --- COUNT ---
      let countQuery = supabase.from('services').select('id', { count: 'exact', head: true });
      if (term) {
        const orExpr = buildOrLike(term);
        if (orExpr) countQuery = countQuery.or(orExpr);   // ✅ 빈 문자열이면 호출 금지
      }
      const { count, error: countErr } = await countQuery;
      if (countErr) throw countErr;

      // --- PAGE DATA ---
      const from = (pageSafe - 1) * PAGE_SIZE;
      const to = from + PAGE_SIZE - 1;

      let dataQuery = supabase
        .from('services')
        .select('id,code,name,category')
        .order(sort, { ascending: dir === 'asc' })
        .eq("is_active", true)
        .range(from, to);

      if (term) {
        const orExpr = buildOrLike(term);
        if (orExpr) dataQuery = dataQuery.or(orExpr);     // ✅ 동일 가드
      }

      const { data, error: dataErr } = await dataQuery;
      if (dataErr) throw dataErr;

      setRows((data ?? []) as Service[]);
      setTotal(count ?? 0);
    } catch (e: any) {
      setErr(e?.message || '불러오기 실패');
    } finally {
      setLoading(false);
    }
  }

  function toggleSort(k: SortKey) {
    if (sort === k) setDir(d => (d === 'asc' ? 'desc' : 'asc'));
    else { setSort(k); setDir('asc'); }
    setPage(1);
  }

  function setEdit(id: number, patch: Partial<Service>) {
    setEditing(prev => ({ ...prev, [id]: { ...prev[id], ...patch } }));
  }

  async function saveEdit(id: number) {
    const patch = editing[id];
    if (!patch) return;

    const base = rows.find(r => r.id === id)!;
    const code = (patch.code ?? base.code ?? '').toString().trim() || null;
    const name = (patch.name ?? base.name ?? '').toString().trim();
    const category = (patch.category ?? base.category ?? '').toString().trim() || null;

    if (!name) {
      alert('name은 필수입니다.');
      return;
    }

    // 낙관적 업데이트
    const old = rows.slice();
    setRows(prev => prev.map(r => (r.id === id ? { ...r, code, name, category } : r)));

    const { error } = await supabase.from('services').update({ code, name, category }).eq('id', id); // ✅ upsert → update
    if (error) {
      setRows(old);
      alert(`저장 실패: ${error.message}`);
      return;
    }
    setEditing(prev => {
      const n = { ...prev };
      delete n[id];
      return n;
    });
  }

  function cancelEdit(id: number) {
    setEditing(prev => {
      const n = { ...prev };
      delete n[id];
      return n;
    });
  }

  async function removeRow(id: number) {
    if (!confirm('정말 삭제할까요? (참조 중인 prices가 있으면 FK 오류가 납니다)')) return;
    const old = rows.slice();
    setRows(prev => prev.filter(r => r.id !== id));
    const { error } = await supabase.from('services').delete().eq('id', id);
    if (error) {
      setRows(old);
      alert(`삭제 실패: ${error.message}`);
    }
  }

  async function createRow() {
    const code = (draft.code ?? '').toString().trim() || null;
    const name = (draft.name ?? '').toString().trim();      // ✅ null 금지
    const category = (draft.category ?? '').toString().trim() || null;

    if (!name) {
      alert('name은 필수입니다.');
      return;
    }

    const { error } = await supabase.from('services').insert([{ code, name, category }]);
    if (error) {
      alert(`생성 실패: ${error.message}`);
      return;
    }
    setDraft({ code: '', name: '', category: '' });
    setCreateOpen(false);
    setPage(1);
    fetchRows();
  }

  return (
    <main style={styles.wrap}>
      <h1 style={{ fontSize: 22, fontWeight: 800, marginBottom: 10 }}>서비스 관리</h1>

      {/* 툴바 */}
      <div style={styles.toolbar}>
        <input
          value={kw}
          onChange={(e) => { setPage(1); setKw(e.target.value); }}
          placeholder="검색: code / name / category"
          style={{ ...styles.input, maxWidth: 360 }}
        />
        {/* CSV 대량등록 페이지가 준비되면 아래 링크 활성화 */}
        {/* <a href="/admin/services/bulk" style={{ marginLeft: 'auto', textDecoration: 'none' }}>
          <button style={styles.btn}>대량등록(CSV)</button>
        </a> */}
        <button
          style={{ ...styles.btnPrimary, marginLeft: 'auto' }}
          onClick={() => setCreateOpen(v => !v)}
          aria-expanded={createOpen}
        >
          {createOpen ? '생성 취소' : '새 서비스 추가'}
        </button>
      </div>

      {/* 생성 폼 */}
      {createOpen && (
        <div style={{ border: '1px solid #e5e7eb', borderRadius: 12, padding: 12, background: '#fff', marginBottom: 12 }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr auto', gap: 12 }}>
            <input
              placeholder="code (선택, 예: SVC-IMPL)"
              value={draft.code ?? ''}
              onChange={(e) => setDraft(d => ({ ...d, code: e.target.value }))}
              style={styles.input}
            />
            <input
              placeholder="name (필수, 예: 임플란트)"
              value={draft.name ?? ''}
              onChange={(e) => setDraft(d => ({ ...d, name: e.target.value }))}
              style={styles.input}
            />
            <input
              placeholder="category (선택, 예: 치과)"
              value={draft.category ?? ''}
              onChange={(e) => setDraft(d => ({ ...d, category: e.target.value }))}
              style={styles.input}
            />
            <button onClick={createRow} style={styles.btnPrimary}>추가</button>
          </div>
          <div style={{ marginTop: 8, color: '#6b7280', fontSize: 12 }}>
            * code에 유니크 제약이 있다면 중복 시 에러가 납니다.
          </div>
        </div>
      )}

      {/* 에러/로딩 */}
      {err && <pre style={{ color: 'red' }}>{err}</pre>}
      {loading && <p>불러오는 중…</p>}

      {!loading && !err && (
        <>
          {/* 표 */}
          <div style={{ overflowX: 'auto', background: '#fff', border: '1px solid #e5e7eb', borderRadius: 12 }}>
            <table style={styles.table}>
              <thead>
                <tr>
                  {headerCell('ID', 'id', sort, dir, toggleSort)}
                  {headerCell('Code', 'code', sort, dir, toggleSort)}
                  {headerCell('Name', 'name', sort, dir, toggleSort)}
                  {headerCell('Category', 'category', sort, dir, toggleSort)}
                  <th style={styles.th}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {rows.length === 0 && (
                  <tr>
                    <td colSpan={5} style={{ padding: 24, textAlign: 'center', color: '#6b7280' }}>
                      데이터가 없습니다.
                    </td>
                  </tr>
                )}
                {rows.map(r => {
                  const ed = editing[r.id] || {};
                  const isEditing = !!editing[r.id];
                  const val = (k: keyof Service) =>
                    (isEditing ? (ed as any)[k] ?? (r as any)[k] : (r as any)[k]) ?? '';

                  return (
                    <tr key={r.id}>
                      <td style={styles.td}><span style={styles.code}>{r.id}</span></td>
                      <td style={styles.td}>
                        {isEditing ? (
                          <input
                            style={styles.input}
                            value={val('code')}
                            onChange={(e) => setEdit(r.id, { code: e.target.value })}
                            placeholder="code"
                          />
                        ) : (
                          <span style={styles.code}>{r.code ?? <em style={{ color: '#9ca3af' }}>—</em>}</span>
                        )}
                      </td>
                      <td style={styles.td}>
                        {isEditing ? (
                          <input
                            style={styles.input}
                            value={val('name')}
                            onChange={(e) => setEdit(r.id, { name: e.target.value })}
                            placeholder="name (필수)"
                          />
                        ) : (
                          r.name || <em style={{ color: '#9ca3af' }}>—</em>
                        )}
                      </td>
                      <td style={styles.td}>
                        {isEditing ? (
                          <input
                            style={styles.input}
                            value={val('category')}
                            onChange={(e) => setEdit(r.id, { category: e.target.value })}
                            placeholder="category"
                          />
                        ) : (
                          r.category || <em style={{ color: '#9ca3af' }}>—</em>
                        )}
                      </td>
                      <td style={styles.td}>
                        {!isEditing ? (
                          <div style={{ display: 'flex', gap: 8 }}>
                            <button style={styles.btn} onClick={() => setEditing(p => ({ ...p, [r.id]: {} }))}>수정</button>
                            <button style={styles.btn} onClick={() => removeRow(r.id)}>삭제</button>
                          </div>
                        ) : (
                          <div style={{ display: 'flex', gap: 8 }}>
                            <button style={styles.btnPrimary} onClick={() => saveEdit(r.id)}>저장</button>
                            <button style={styles.btn} onClick={() => cancelEdit(r.id)}>취소</button>
                          </div>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* 페이지네이션 */}
          <div style={{ display: 'flex', gap: 8, justifyContent: 'center', marginTop: 14 }}>
            <button
              onClick={() => setPage(p => Math.max(1, p - 1))}
              disabled={pageSafe <= 1}
              style={styles.btn}
            >
              이전
            </button>
            <div style={{ padding: '8px 12px', color: '#6b7280' }}>
              {pageSafe} / {totalPages}
            </div>
            <button
              onClick={() => setPage(p => Math.min(totalPages, p + 1))}
              disabled={pageSafe >= totalPages}
              style={styles.btn}
            >
              다음
            </button>
          </div>
        </>
      )}
    </main>
  );
}

/* ---------- 테이블 헤더 유틸 ---------- */
function headerCell(label: string, key: SortKey, sort: SortKey, dir: 'asc'|'desc', onClick: (k: SortKey)=>void) {
  return (
    <th style={styles.th}>
      <button
        onClick={() => onClick(key)}
        style={{ background: 'none', border: 'none', cursor: 'pointer', fontWeight: 800 }}
      >
        {label} {sort === key ? (dir === 'asc' ? '↑' : '↓') : ''}
      </button>
    </th>
  );
}

/* ---------- 검색 .or() 유틸 ---------- */
function escapeOrValue(s: string) {
  // .or() 구문에서 쉼표 충돌 방지
  return s.replace(/,/g, '\\,');
}
function buildOrLike(term: string) {
  const t = term.trim();
  if (!t) return '';
  const like = `%${escapeOrValue(t)}%`;
  return `code.ilike.${like},name.ilike.${like},category.ilike.${like}`;
}

/* ---------- 디바운스 훅 ---------- */
function useDebounce<T>(value: T, delay = 250) {
  const [v, setV] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setV(value), delay);
    return () => clearTimeout(t);
  }, [value, delay]);
  return v;
}
