'use client';

import { useEffect, useState, useMemo } from 'react';
import { supabaseBrowser } from '@/lib/supabase/client';
const supabase = supabaseBrowser();
// 이름 다르면 맞춰 바꿔줘요.



type Provider = { id: number; name: string; region: string | null; is_active?: boolean | null };
type Service = { id: number; name: string; category: string | null };

type PriceWithNames = {
  id: number;
  provider_id: number;
  service_id: number;
  provider_name: string | null;
  provider_region: string | null;
  service_name: string | null;
  service_category: string | null;
  price: number | null;
  unit: string | null;
  note: string | null;
  source_url: string | null;
  updated_at: string | null;
};

type Draft = {
  provider_id: string; // select value
  service_id: string;  // select value
  price: string;
  unit: string;
  note: string;
  source_url: string;
};

const emptyDraft: Draft = {
  provider_id: '',
  service_id: '',
  price: '',
  unit: '',
  note: '',
  source_url: '',
};

export default function AdminPricesPage() {
  const [loading, setLoading] = useState(true);

  const [providers, setProviders] = useState<Provider[]>([]);
  const [services, setServices] = useState<Service[]>([]);
  const [rows, setRows] = useState<PriceWithNames[]>([]);

  const [q, setQ] = useState('');
  const [creating, setCreating] = useState(false);

  const [draft, setDraft] = useState<Draft>(emptyDraft);

  const [editingId, setEditingId] = useState<number | null>(null);
  const [editDraft, setEditDraft] = useState<Draft>(emptyDraft);

  const providerMap = useMemo(() => new Map(providers.map(p => [p.id, p])), [providers]);
  const serviceMap = useMemo(() => new Map(services.map(s => [s.id, s])), [services]);

  const filtered = useMemo(() => {
    const k = q.trim().toLowerCase();
    if (!k) return rows;

    return rows.filter(r => {
      const hay = [
        r.id,
        r.provider_id,
        r.service_id,
        r.provider_name ?? '',
        r.provider_region ?? '',
        r.service_name ?? '',
        r.service_category ?? '',
        r.unit ?? '',
        r.note ?? '',
        r.source_url ?? '',
        r.price ?? '',
      ]
        .join(' ')
        .toLowerCase();
      return hay.includes(k);
    });
  }, [rows, q]);

  useEffect(() => {
    void loadAll();
  }, []);

  async function loadAll() {
    setLoading(true);

    const [pRes, sRes, rRes] = await Promise.all([
      supabase
        .from('providers')
        .select('id,name,region,is_active')
        .eq('is_active', true)
        .order('name', { ascending: true }),
      supabase
        .from('services')
        .select('id,name,category')
        .order('name', { ascending: true }),
      supabase
        .from('prices_with_names')
        .select('*')
        .order('updated_at', { ascending: false }),
    ]);

    if (pRes.error) console.error('providers load error', pRes.error);
    if (sRes.error) console.error('services load error', sRes.error);
    if (rRes.error) console.error('prices load error', rRes.error);

    setProviders(pRes.data ?? []);
    setServices(sRes.data ?? []);
    setRows(rRes.data ?? []);
    setLoading(false);
  }

  function resetCreate() {
    setDraft(emptyDraft);
    setCreating(false);
  }

  function startEdit(row: PriceWithNames) {
    setEditingId(row.id);
    setEditDraft({
      provider_id: String(row.provider_id ?? ''),
      service_id: String(row.service_id ?? ''),
      price: row.price != null ? String(row.price) : '',
      unit: row.unit ?? '',
      note: row.note ?? '',
      source_url: row.source_url ?? '',
    });
  }

  function cancelEdit() {
    setEditingId(null);
    setEditDraft(emptyDraft);
  }

  async function onCreate() {
    // validation
    if (!draft.provider_id || !draft.service_id || !draft.price) {
      alert('병원/서비스/가격은 필수입니다.');
      return;
    }
    const priceNum = Number(draft.price);
    if (!Number.isFinite(priceNum) || priceNum <= 0) {
      alert('가격은 0보다 큰 숫자여야 합니다.');
      return;
    }

    const payload = {
      provider_id: Number(draft.provider_id),
      service_id: Number(draft.service_id),
      price: priceNum,
      unit: draft.unit.trim() ? draft.unit.trim() : null,
      note: draft.note.trim() ? draft.note.trim() : null,
      source_url: draft.source_url.trim() ? draft.source_url.trim() : null,
    };

    const { error } = await supabase.from('prices').insert(payload);
    if (error) {
      alert(error.message);
      return;
    }

    resetCreate();
    await loadAll();
  }

  async function onUpdate(id: number) {
    if (!editDraft.provider_id || !editDraft.service_id || !editDraft.price) {
      alert('병원/서비스/가격은 필수입니다.');
      return;
    }
    const priceNum = Number(editDraft.price);
    if (!Number.isFinite(priceNum) || priceNum <= 0) {
      alert('가격은 0보다 큰 숫자여야 합니다.');
      return;
    }

    const payload = {
      provider_id: Number(editDraft.provider_id),
      service_id: Number(editDraft.service_id),
      price: priceNum,
      unit: editDraft.unit.trim() ? editDraft.unit.trim() : null,
      note: editDraft.note.trim() ? editDraft.note.trim() : null,
      source_url: editDraft.source_url.trim() ? editDraft.source_url.trim() : null,
      // updated_at은 DB에서 default/trigger로 처리하는 게 정석이라 여기선 건드리지 않음
    };

    const { error } = await supabase.from('prices').update(payload).eq('id', id);
    if (error) {
      alert(error.message);
      return;
    }

    cancelEdit();
    await loadAll();
  }

  async function onDelete(id: number) {
    if (!confirm('정말 삭제하시겠습니까?')) return;
    const { error } = await supabase.from('prices').delete().eq('id', id);
    if (error) {
      alert(error.message);
      return;
    }
    await loadAll();
  }

  return (
    <div style={S.wrap}>
      <div style={S.headerRow}>
        <h1 style={S.h1}>가격 관리</h1>
      </div>

      {/* 검색 + 생성 토글 */}
      <div style={S.topRow}>
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="검색: 병원명 / 서비스명 / 가격 / unit / note / source_url"
          style={S.search}
        />
        <button
          style={creating ? S.btnGhost : S.btnPrimary}
          onClick={() => (creating ? resetCreate() : setCreating(true))}
        >
          {creating ? '생성 취소' : '새 가격 추가'}
        </button>
      </div>

      {/* 생성 폼 (서비스 관리처럼 한 줄 폼) */}
      {creating && (
        <div style={S.createCard}>
          <div style={S.createGrid}>
            <select
              style={S.input}
              value={draft.provider_id}
              onChange={(e) => setDraft((d) => ({ ...d, provider_id: e.target.value }))}
            >
              <option value="">병원 선택 (필수)</option>
              {providers.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}{p.region ? ` (${p.region})` : ''}
                </option>
              ))}
            </select>

            <select
              style={S.input}
              value={draft.service_id}
              onChange={(e) => setDraft((d) => ({ ...d, service_id: e.target.value }))}
            >
              <option value="">서비스 선택 (필수)</option>
              {services.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}{s.category ? ` (${s.category})` : ''}
                </option>
              ))}
            </select>

            <input
              style={S.input}
              type="number"
              inputMode="numeric"
              placeholder="price (필수)"
              value={draft.price}
              onChange={(e) => setDraft((d) => ({ ...d, price: e.target.value }))}
            />

            <input
              style={S.input}
              placeholder="unit (예: 회당)"
              value={draft.unit}
              onChange={(e) => setDraft((d) => ({ ...d, unit: e.target.value }))}
            />

            <input
              style={S.input}
              placeholder="note (비고)"
              value={draft.note}
              onChange={(e) => setDraft((d) => ({ ...d, note: e.target.value }))}
            />

            <input
              style={S.input}
              placeholder="source_url (출처 URL)"
              value={draft.source_url}
              onChange={(e) => setDraft((d) => ({ ...d, source_url: e.target.value }))}
            />
          </div>

          <div style={S.createActions}>
            <div style={S.helpText}>
              * 병원/서비스는 드롭다운에서 선택합니다. (테스트 병원은 is_active=true만 노출)
            </div>
            <button style={S.btnPrimary} onClick={onCreate}>추가</button>
          </div>
        </div>
      )}

      {/* 테이블 */}
      <div style={S.tableCard}>
        <div style={S.tableHeader}>
          <div style={S.tableTitle}>가격 목록</div>
          <div style={S.tableMeta}>
            총 <b>{filtered.length}</b>건
          </div>
        </div>

        {loading ? (
          <div style={S.empty}>로딩 중...</div>
        ) : filtered.length === 0 ? (
          <div style={S.empty}>데이터가 없습니다.</div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={S.table}>
              <thead>
                <tr>
                  <th style={S.th}>ID</th>
                  <th style={S.th}>병원</th>
                  <th style={S.th}>지역</th>
                  <th style={S.th}>서비스</th>
                  <th style={S.thRight}>가격</th>
                  <th style={S.th}>단위</th>
                  <th style={S.th}>비고</th>
                  <th style={S.th}>Updated</th>
                  <th style={S.thCenter}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((r) => {
                  const isEditing = editingId === r.id;

                  const p = providerMap.get(r.provider_id);
                  const s = serviceMap.get(r.service_id);

                  const providerName = r.provider_name ?? p?.name ?? `#${r.provider_id}`;
                  const providerRegion = r.provider_region ?? p?.region ?? '-';
                  const serviceName = r.service_name ?? s?.name ?? `#${r.service_id}`;

                  return (
                    <tr key={r.id} style={S.tr}>
                      <td style={S.tdMono}>{r.id}</td>

                      {/* 병원 */}
                      <td style={S.td}>
                        {!isEditing ? (
                          providerName
                        ) : (
                          <select
                            style={S.inputInline}
                            value={editDraft.provider_id}
                            onChange={(e) =>
                              setEditDraft((d) => ({ ...d, provider_id: e.target.value }))
                            }
                          >
                            <option value="">병원 선택</option>
                            {providers.map((pp) => (
                              <option key={pp.id} value={pp.id}>
                                {pp.name}{pp.region ? ` (${pp.region})` : ''}
                              </option>
                            ))}
                          </select>
                        )}
                      </td>

                      {/* 지역 */}
                      <td style={S.td}>{providerRegion ?? '-'}</td>

                      {/* 서비스 */}
                      <td style={S.td}>
                        {!isEditing ? (
                          serviceName
                        ) : (
                          <select
                            style={S.inputInline}
                            value={editDraft.service_id}
                            onChange={(e) =>
                              setEditDraft((d) => ({ ...d, service_id: e.target.value }))
                            }
                          >
                            <option value="">서비스 선택</option>
                            {services.map((ss) => (
                              <option key={ss.id} value={ss.id}>
                                {ss.name}{ss.category ? ` (${ss.category})` : ''}
                              </option>
                            ))}
                          </select>
                        )}
                      </td>

                      {/* 가격 */}
                      <td style={S.tdRight}>
                        {!isEditing ? (
                          (r.price ?? 0).toLocaleString() + '원'
                        ) : (
                          <input
                            style={S.inputInlineRight}
                            type="number"
                            value={editDraft.price}
                            onChange={(e) => setEditDraft((d) => ({ ...d, price: e.target.value }))}
                          />
                        )}
                      </td>

                      {/* unit */}
                      <td style={S.td}>
                        {!isEditing ? (
                          r.unit ?? '-'
                        ) : (
                          <input
                            style={S.inputInline}
                            value={editDraft.unit}
                            onChange={(e) => setEditDraft((d) => ({ ...d, unit: e.target.value }))}
                            placeholder="회당"
                          />
                        )}
                      </td>

                      {/* note */}
                      <td style={S.td}>
                        {!isEditing ? (
                          r.note ?? '-'
                        ) : (
                          <input
                            style={S.inputInline}
                            value={editDraft.note}
                            onChange={(e) => setEditDraft((d) => ({ ...d, note: e.target.value }))}
                            placeholder="비고"
                          />
                        )}
                      </td>

                      {/* updated */}
                      <td style={S.td}>
                        {(r.updated_at?.slice(0, 10)) ?? '-'}
                      </td>

                      {/* actions */}
                      <td style={S.tdCenter}>
                        {!isEditing ? (
                          <>
                            <button style={S.btnSmall} onClick={() => startEdit(r)}>수정</button>
                            <button style={S.btnSmallDanger} onClick={() => onDelete(r.id)}>삭제</button>
                          </>
                        ) : (
                          <>
                            <button style={S.btnSmallPrimary} onClick={() => onUpdate(r.id)}>저장</button>
                            <button style={S.btnSmall} onClick={cancelEdit}>취소</button>
                          </>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>

            {/* source_url은 표가 너무 넓어져서 기본은 숨김.
                필요하면 "비고" 옆에 컬럼 추가해줄게요. */}
          </div>
        )}
      </div>
    </div>
  );
}

/* ===================== 스타일 (서비스 관리 느낌) ===================== */
const S: Record<string, React.CSSProperties> = {
  wrap: { padding: 20, maxWidth: 1200, margin: '0 auto' },
  headerRow: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 },
  h1: { fontSize: 24, margin: 0 },

  topRow: { display: 'flex', gap: 10, alignItems: 'center', marginBottom: 12 },
  search: {
    flex: 1,
    padding: '12px 14px',
    borderRadius: 10,
    border: '1px solid #e5e7eb',
    outline: 'none',
    fontSize: 14,
  },

  btnPrimary: {
    padding: '12px 16px',
    borderRadius: 10,
    border: '1px solid transparent',
    background: '#0ea5e9',
    color: '#fff',
    fontWeight: 700,
    cursor: 'pointer',
    whiteSpace: 'nowrap',
  },
  btnGhost: {
    padding: '12px 16px',
    borderRadius: 10,
    border: '1px solid #e5e7eb',
    background: '#fff',
    color: '#111827',
    fontWeight: 700,
    cursor: 'pointer',
    whiteSpace: 'nowrap',
  },

  createCard: {
    border: '1px solid #e5e7eb',
    borderRadius: 14,
    padding: 14,
    background: '#fff',
    marginBottom: 14,
  },
  createGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(3, minmax(0, 1fr))',
    gap: 10,
  },
  createActions: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 12,
    gap: 10,
  },
  helpText: { fontSize: 12, color: '#6b7280' },

  input: {
    padding: '12px 12px',
    borderRadius: 10,
    border: '1px solid #e5e7eb',
    fontSize: 14,
    outline: 'none',
    background: '#fff',
    width: '100%',
  },

  tableCard: {
    border: '1px solid #e5e7eb',
    borderRadius: 14,
    overflow: 'hidden',
    background: '#fff',
  },
  tableHeader: {
    padding: '14px 14px',
    borderBottom: '1px solid #f1f5f9',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  tableTitle: { fontWeight: 800 },
  tableMeta: { fontSize: 13, color: '#6b7280' },

  table: { width: '100%', borderCollapse: 'separate', borderSpacing: 0 },
  th: {
    textAlign: 'left',
    fontWeight: 800,
    fontSize: 13,
    color: '#111827',
    background: '#f8fafc',
    padding: '12px 12px',
    borderBottom: '1px solid #eef2f7',
    whiteSpace: 'nowrap',
  },
  thRight: {
    textAlign: 'right',
    fontWeight: 800,
    fontSize: 13,
    color: '#111827',
    background: '#f8fafc',
    padding: '12px 12px',
    borderBottom: '1px solid #eef2f7',
    whiteSpace: 'nowrap',
  },
  thCenter: {
    textAlign: 'center',
    fontWeight: 800,
    fontSize: 13,
    color: '#111827',
    background: '#f8fafc',
    padding: '12px 12px',
    borderBottom: '1px solid #eef2f7',
    whiteSpace: 'nowrap',
  },

  tr: { borderBottom: '1px solid #f1f5f9' },
  td: {
    padding: '12px 12px',
    borderBottom: '1px solid #f1f5f9',
    fontSize: 14,
    verticalAlign: 'middle',
    whiteSpace: 'nowrap',
  },
  tdMono: {
    padding: '12px 12px',
    borderBottom: '1px solid #f1f5f9',
    fontSize: 13,
    fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace',
    whiteSpace: 'nowrap',
  },
  tdRight: {
    padding: '12px 12px',
    borderBottom: '1px solid #f1f5f9',
    fontSize: 14,
    textAlign: 'right',
    whiteSpace: 'nowrap',
  },
  tdCenter: {
    padding: '12px 12px',
    borderBottom: '1px solid #f1f5f9',
    fontSize: 14,
    textAlign: 'center',
    whiteSpace: 'nowrap',
  },

  inputInline: {
    padding: '10px 10px',
    borderRadius: 10,
    border: '1px solid #e5e7eb',
    fontSize: 14,
    outline: 'none',
    width: '100%',
    background: '#fff',
    minWidth: 180,
  },
  inputInlineRight: {
    padding: '10px 10px',
    borderRadius: 10,
    border: '1px solid #e5e7eb',
    fontSize: 14,
    outline: 'none',
    width: 140,
    textAlign: 'right',
    background: '#fff',
  },

  btnSmall: {
    padding: '8px 12px',
    borderRadius: 10,
    border: '1px solid #e5e7eb',
    background: '#fff',
    cursor: 'pointer',
    fontWeight: 700,
    marginRight: 8,
  },
  btnSmallPrimary: {
    padding: '8px 12px',
    borderRadius: 10,
    border: '1px solid transparent',
    background: '#0ea5e9',
    color: '#fff',
    cursor: 'pointer',
    fontWeight: 800,
    marginRight: 8,
  },
  btnSmallDanger: {
    padding: '8px 12px',
    borderRadius: 10,
    border: '1px solid #fee2e2',
    background: '#fff',
    color: '#dc2626',
    cursor: 'pointer',
    fontWeight: 800,
  },

  empty: { padding: 22, textAlign: 'center', color: '#6b7280' },
};
