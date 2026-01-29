'use client';

export const dynamic = 'force-dynamic';

import { useEffect, useMemo, useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import AdSense from '@/components/AdSense';

// --- 스타일 최적화 (좁은 폭에서도 한 줄 유지를 위함) ---
const inputStyle: React.CSSProperties = { padding: '8px 10px', borderRadius: 8, border: '1px solid #ddd', background: '#fff', outline: 'none', fontSize: '13px' };
const searchBtn: React.CSSProperties = { background: '#16a34a', color: '#fff', borderRadius: 8, padding: '8px 14px', border: 'none', fontWeight: 700, cursor: 'pointer', fontSize: '13px' };
const applyBtn: React.CSSProperties = { background: '#f3f4f6', borderRadius: 8, padding: '8px 14px', border: '1px solid #ddd', fontWeight: 700, cursor: 'pointer', fontSize: '13px' };

// 테이블 폰트 크기를 13px로 줄여 모든 열(Column)이 한 줄에 나오게 함
const thStyle: React.CSSProperties = { textAlign: 'left', padding: '10px 6px', fontWeight: 800, borderBottom: '1px solid #eee', background: '#fafafa', fontSize: '13px', whiteSpace: 'nowrap' };
const tdStyle: React.CSSProperties = { padding: '10px 6px', borderBottom: '1px solid #f2f2f2', verticalAlign: 'middle', fontSize: '13px' };

function ResultsContent() {
  const sp = useSearchParams();
  const router = useRouter();

  const regionParam = (sp.get('region') || '전체').trim();
  const qParam = (sp.get('q') || '').trim();
  const minParam = (sp.get('min') || '').trim();
  const maxParam = (sp.get('max') || '').trim();

  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [region, setRegion] = useState(regionParam);
  const [service, setService] = useState(qParam || '전체');
  const [minPrice, setMinPrice] = useState(minParam);
  const [maxPrice, setMaxPrice] = useState(maxParam);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const url = `/api/public/prices?region=${encodeURIComponent(region)}&page=1&pageSize=500`;
        const res = await fetch(url, { cache: 'no-store' });
        const json = await res.json();
        setItems(json.ok && Array.isArray(json.items) ? json.items : []);
      } catch (e: any) {
        setError('데이터 로딩 중 오류가 발생했습니다.');
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [region]);

  const serviceOptions = useMemo(() => {
    const set = new Set<string>();
    items.forEach(it => it.service_name && set.add(it.service_name.trim()));
    return ['전체', ...Array.from(set).sort()];
  }, [items]);

  const filtered = useMemo(() => {
    return items.filter(it => {
      if (region !== '전체' && it.provider_region !== region) return false;
      if (service !== '전체' && it.service_name !== service) return false;
      const p = it.price ?? 0;
      const min = Number(minPrice.replace(/,/g, '')) || 0;
      const max = Number(maxPrice.replace(/,/g, '')) || Infinity;
      return p >= min && p <= max;
    });
  }, [items, region, service, minPrice, maxPrice]);

  return (
    // ✅ 이미지의 좁은 폭 유지 (maxWidth: 800px)
    <div style={{ padding: '15px', maxWidth: '800px', margin: '0 auto' }}>
      <h2 style={{ marginBottom: 12, fontSize: '18px' }}>검색 결과 ({filtered.length})</h2>
      <AdSense />

      <div style={{ border: '2px solid #ef4444', borderRadius: 14, padding: '12px', marginBottom: 15, background: '#fff' }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr auto', gap: '8px', marginBottom: '8px' }}>
          <select value={region} onChange={(e) => setRegion(e.target.value)} style={inputStyle}>
            <option value="전체">전체</option><option value="서울">서울</option><option value="인천">인천</option><option value="경기">경기</option>
          </select>
          <select value={service} onChange={(e) => setService(e.target.value)} style={inputStyle}>
            {serviceOptions.map(s => <option key={s} value={s}>{s}</option>)}
          </select>
          <button onClick={() => router.push(`/results?region=${region}&q=${service === '전체' ? '' : service}`)} style={searchBtn}>검색</button>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr auto', gap: '8px' }}>
          <input value={minPrice} onChange={(e) => setMinPrice(e.target.value)} placeholder="최소가격" style={inputStyle} />
          <input value={maxPrice} onChange={(e) => setMaxPrice(e.target.value)} placeholder="최대가격" style={inputStyle} />
          <button onClick={() => router.push(`/results?min=${minPrice}&max=${maxPrice}`)} style={applyBtn}>가격적용</button>
        </div>
      </div>

      {loading ? <div style={{ textAlign: 'center', padding: 20 }}>로딩 중...</div> : (
        <div style={{ border: '1px solid #eee', borderRadius: 12, overflow: 'hidden', background: '#fff' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', tableLayout: 'fixed' }}>
            <thead style={{ background: '#fafafa' }}>
              <tr>
                <th style={{ ...thStyle, width: '25%' }}>병원</th>
                <th style={{ ...thStyle, width: '12%' }}>지역</th>
                <th style={{ ...thStyle, width: '15%' }}>서비스</th>
                <th style={{ ...thStyle, width: '18%', textAlign: 'center' }}>가격</th>
                <th style={{ ...thStyle, width: '20%' }}>비고</th>
                <th style={{ ...thStyle, width: '10%' }}>출처</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(it => (
                <tr key={it.id}>
                  <td style={{ ...tdStyle, fontWeight: 700, color: '#16a34a', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    <Link href={`/provider/${it.provider_id}`}>{it.provider_name}</Link>
                  </td>
                  <td style={tdStyle}>{it.provider_region}</td>
                  <td style={tdStyle}>{it.service_name}</td>
                  <td style={{ ...tdStyle, textAlign: 'center', fontWeight: 800 }}>{it.price?.toLocaleString()}원</td>
                  <td style={{ ...tdStyle, color: '#666', fontSize: '12px' }}>{it.note || '-'}</td>
                  <td style={tdStyle}>
                    {it.source_url ? <a href={it.source_url} target="_blank" style={{ color: '#2563eb', textDecoration: 'underline' }}>공식</a> : '-'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      <AdSense />
    </div>
  );
}

export default function ResultsPage() {
  return <Suspense fallback={null}><ResultsContent /></Suspense>;
}