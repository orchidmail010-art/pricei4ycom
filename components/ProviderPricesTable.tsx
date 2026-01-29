'use client';

import { useMemo, useState } from 'react';

type Service = { id: number; name: string; category: string | null };
type Row = {
  id: number;
  price: number;
  unit: string | null;
  note: string | null;
  updated_at: string | null;
  source_url: string | null;
  last_checked_at: string | null;
  provider_id: number;
  service_id: number;
  service?: Service;
};

export default function ProviderPricesTable({ rows }: { rows: Row[] }) {
  // 상태들
  const [kw, setKw] = useState('');
  const [activeCat, setActiveCat] = useState<string | 'ALL'>('ALL');
  const [dense, setDense] = useState(false);
  const [sort, setSort] = useState<'price-asc' | 'price-desc' | 'name-asc'>('price-asc');

  // 카테고리 목록
  const categories = useMemo(() => {
    const set = new Set<string>();
    rows.forEach(r => { if (r.service?.category) set.add(r.service.category); });
    return ['ALL', ...Array.from(set)];
  }, [rows]);

  // 필터 + 정렬
  const filtered = useMemo(() => {
    const lower = kw.trim().toLowerCase();
    let arr = rows.filter(r => {
      const okCat = activeCat === 'ALL' || r.service?.category === activeCat;
      const okKw =
        !lower ||
        r.service?.name?.toLowerCase().includes(lower) ||
        r.note?.toLowerCase().includes(lower);
      return okCat && okKw;
    });

    switch (sort) {
      case 'price-asc':  arr = arr.slice().sort((a, b) => a.price - b.price); break;
      case 'price-desc': arr = arr.slice().sort((a, b) => b.price - a.price); break;
      case 'name-asc':   arr = arr.slice().sort((a, b) => (a.service?.name || '').localeCompare(b.service?.name || '')); break;
    }
    return arr;
  }, [rows, kw, activeCat, sort]);

  // 스타일
  const thStyle: React.CSSProperties = {
    position: 'sticky', top: 0, background: '#fff', zIndex: 1,
    borderBottom: '1px solid #e5e7eb', padding: dense ? '8px' : '12px', textAlign: 'left'
  };
  const tdStyle: React.CSSProperties = {
    borderBottom: '1px solid #f1f5f9', padding: dense ? '8px' : '12px', verticalAlign: 'top'
  };

  return (
    <div>
      {/* 컨트롤바 */}
      <div style={{ display:'flex', gap:10, alignItems:'center', marginBottom:12, flexWrap:'wrap' }}>
        <input
          value={kw}
          onChange={(e) => setKw(e.target.value)}
          placeholder="항목명/비고 검색 (예: 임플란트, 초음파)"
          style={{ flex:'1 1 240px', minWidth:240, padding:'10px 12px', border:'1px solid #ddd', borderRadius:8 }}
        />

        <select
          value={sort}
          onChange={(e) => setSort(e.target.value as any)}
          style={{ padding:'10px 12px', border:'1px solid #ddd', borderRadius:8 }}
        >
          <option value="price-asc">가격 낮은순</option>
          <option value="price-desc">가격 높은순</option>
          <option value="name-asc">항목명 가나다순</option>
        </select>

        <label style={{ display:'flex', alignItems:'center', gap:6, fontSize:14 }}>
          <input type="checkbox" checked={dense} onChange={(e) => setDense(e.target.checked)} />
          촘촘히 보기
        </label>
      </div>

      {/* 카테고리 탭 */}
      <div style={{ display:'flex', gap:8, flexWrap:'wrap', marginBottom:10 }}>
        {categories.map(cat => (
          <button
            key={cat}
            onClick={() => setActiveCat(cat as any)}
            style={{
              padding:'6px 10px', borderRadius:999, border:'1px solid #e5e7eb',
              background: activeCat === cat ? '#0ea5e9' : '#fff',
              color: activeCat === cat ? '#fff' : '#111', cursor:'pointer'
            }}
          >
            {cat === 'ALL' ? '전체' : cat}
          </button>
        ))}
      </div>

      {/* 결과 요약 */}
      <div style={{ fontSize:13, color:'#6b7280', marginBottom:8 }}>
        총 <b>{filtered.length.toLocaleString()}</b>건
      </div>

      {/* 표 */}
      <div style={{ overflowX:'auto', border:'1px solid #e5e7eb', borderRadius:10 }}>
        <table style={{ width:'100%', borderCollapse:'separate', borderSpacing:0, fontSize: dense ? 14 : 15 }}>
          <thead>
            <tr>
              <th style={thStyle}>항목명</th>
              <th style={thStyle}>카테고리</th>
              <th style={{ ...thStyle, textAlign:'right' }}>가격</th>
              <th style={thStyle}>단위</th>
              <th style={thStyle}>비고</th>
              <th style={thStyle}>업데이트</th>
              <th style={thStyle}>출처</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map(r => (
              <tr key={r.id}>
                <td style={tdStyle}>{r.service?.name ?? `#${r.service_id}`}</td>
                <td style={tdStyle}>{r.service?.category ?? '-'}</td>
                <td style={{ ...tdStyle, textAlign:'right', whiteSpace:'nowrap' }}>
                  <b>{Number(r.price).toLocaleString()}</b> 원
                </td>
                <td style={tdStyle}>{r.unit || '회당'}</td>
                <td style={tdStyle}>{r.note || '-'}</td>
                <td style={tdStyle}>{r.updated_at || '-'}</td>
                <td style={tdStyle}>
                  {r.source_url ? (
                    <a href={r.source_url} target="_blank" rel="noopener noreferrer">링크</a>
                  ) : '-'}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
