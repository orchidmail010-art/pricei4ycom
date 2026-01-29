'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import AdSense from '@/components/AdSense';

type Item = {
  id: number;
  provider_id?: number | null;
  provider_name: string | null;
  provider_region: string | null;

  service_id?: number | null;
  service_name: string | null;
  service_category?: string | null;

  price: number | null;
  min_price?: number | null;
  max_price?: number | null;

  unit?: string | null;
  note: string | null;
  original_name?: string | null;
  detail_name?: string | null;

  source_url?: string | null;
  updated_at?: string | null;
};

const inputStyle: React.CSSProperties = {
  padding: '10px 12px',
  borderRadius: 8,
  border: '1px solid #ddd',
  background: '#fff',
  outline: 'none',
};

const searchBtn: React.CSSProperties = {
  background: '#16a34a',
  color: '#fff',
  borderRadius: 8,
  padding: '10px 18px',
  border: 'none',
  fontWeight: 700,
  cursor: 'pointer',
};

const applyBtn: React.CSSProperties = {
  background: '#f3f4f6',
  borderRadius: 8,
  padding: '10px 18px',
  border: '1px solid #ddd',
  fontWeight: 700,
  cursor: 'pointer',
};

const thStyle: React.CSSProperties = {
  textAlign: 'left',
  padding: 12,
  fontWeight: 800,
  borderBottom: '1px solid #eee',
  background: '#fafafa',
};

const tdStyle: React.CSSProperties = {
  padding: 12,
  borderBottom: '1px solid #f2f2f2',
  verticalAlign: 'top',
};

export default function ResultsPage() {
  const sp = useSearchParams();
  const router = useRouter();

  // URL 파라미터
  const regionParam = (sp.get('region') || '전체').trim();
  const qParam = (sp.get('q') || '').trim(); // 서비스명으로 사용
  const minParam = (sp.get('min') || '').trim();
  const maxParam = (sp.get('max') || '').trim();

  // 화면 상태
  const [items, setItems] = useState<Item[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // 필터 UI 상태 (URL과 동기화)
  const [region, setRegion] = useState(regionParam);
  const [service, setService] = useState(qParam || '전체');
  const [minPrice, setMinPrice] = useState(minParam);
  const [maxPrice, setMaxPrice] = useState(maxParam);

  useEffect(() => setRegion(regionParam), [regionParam]);
  useEffect(() => setService(qParam || '전체'), [qParam]);
  useEffect(() => setMinPrice(minParam), [minParam]);
  useEffect(() => setMaxPrice(maxParam), [maxParam]);

  // URL 갱신 헬퍼
  const pushParams = (patch: Record<string, string>) => {
    const params = new URLSearchParams(sp.toString());
    for (const [k, v] of Object.entries(patch)) {
      if (!v) params.delete(k);
      else params.set(k, v);
    }
    router.push(`/results?${params.toString()}`);
  };

  // ✅ 데이터 로딩 (서버에서는 지역만 필터해도 되지만, 일단 전체 받아도 OK)
  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      setError(null);

      try {
        // region=전체도 API가 처리 가능하지만, 혹시 모르니 그냥 region을 그대로 전달
        const url = `/api/public/prices?region=${encodeURIComponent(region)}&page=1&pageSize=500`;
        const res = await fetch(url, { cache: 'no-store' });
        const json = await res.json();

        if (!json.ok) throw new Error(json.error || 'API error');
        setItems(Array.isArray(json.items) ? json.items : []);
      } catch (e: any) {
        setError(e?.message || '로딩 오류');
        setItems([]);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [region]);

  // ✅ 서비스 드롭다운 옵션(유니크)
  const serviceOptions = useMemo(() => {
    const set = new Set<string>();
    for (const it of items) {
      const s = (it.service_name || '').trim();
      if (s) set.add(s);
    }
    return ['전체', ...Array.from(set).sort((a, b) => a.localeCompare(b, 'ko'))];
  }, [items]);

  // ✅ 가격 파싱
  const minN = useMemo(() => {
    const n = Number(String(minPrice).replace(/,/g, ''));
    return Number.isFinite(n) && n > 0 ? n : null;
  }, [minPrice]);

  const maxN = useMemo(() => {
    const n = Number(String(maxPrice).replace(/,/g, ''));
    return Number.isFinite(n) && n > 0 ? n : null;
  }, [maxPrice]);

  // ✅ 최종 필터링 (프론트에서만)
  const filtered = useMemo(() => {
    return items.filter((it) => {
      // 지역
      if (region !== '전체' && it.provider_region !== region) return false;

      // 서비스
      if (service !== '전체') {
        const s = (it.service_name || '').trim();
        if (s !== service) return false;
      }

      // 가격 (price 우선, 없으면 min/max 활용)
      const p = typeof it.price === 'number' ? it.price : null;
      const pMin = typeof it.min_price === 'number' ? it.min_price : null;
      const pMax = typeof it.max_price === 'number' ? it.max_price : null;

      const effectiveMin = p ?? pMin ?? null;
      const effectiveMax = p ?? pMax ?? null;

      if (minN !== null) {
        if (effectiveMin === null) return false;
        if (effectiveMin < minN) return false;
      }
      if (maxN !== null) {
        if (effectiveMax === null) return false;
        if (effectiveMax > maxN) return false;
      }

      return true;
    });
  }, [items, region, service, minN, maxN]);

  // 버튼 동작
  const onClickSearch = () => {
    // "검색"은 사실상 서비스 선택을 URL에 반영하는 트리거
    pushParams({ region, q: service === '전체' ? '' : service });
  };

  const onClickApplyPrice = () => {
    pushParams({ min: minPrice.trim(), max: maxPrice.trim() });
  };

  return (
    <div style={{ padding: 24, maxWidth: 1100, margin: '0 auto' }}>
      <h2 style={{ marginBottom: 14 }}>검색 결과 ({filtered.length})</h2>
          {/* ✅ 상단 광고 */}
            <AdSense />

      {/* 🔴 빨간 박스처럼 보이는 상단 검색 영역 */}
      <div
        style={{
          border: '2px solid #ef4444',
          borderRadius: 14,
          padding: 16,
          marginBottom: 18,
          background: '#fff',
        }}
      >
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center' }}>
          {/* 지역 */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            <div style={{ fontSize: 12, color: '#6b7280' }}>지역</div>
            <select
              value={region}
              onChange={(e) => setRegion(e.target.value)}
              style={{ ...inputStyle, minWidth: 140 }}
            >
              <option value="전체">전체</option>
              <option value="서울">서울</option>
              <option value="인천">인천</option>
              <option value="경기">경기</option>
            </select>
          </div>

          {/* 서비스 드롭다운 */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6, flex: '1 1 260px' }}>
            <div style={{ fontSize: 12, color: '#6b7280' }}>서비스 선택</div>
            <select
              value={service}
              onChange={(e) => setService(e.target.value)}
              style={{ ...inputStyle, width: '100%' }}
            >
              {serviceOptions.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </div>

          {/* 검색 버튼 */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            <div style={{ fontSize: 12, color: 'transparent' }}>.</div>
            <button onClick={onClickSearch} style={searchBtn}>
              검색
            </button>
          </div>

          {/* 최소/최대 가격 */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            <div style={{ fontSize: 12, color: '#6b7280' }}>최소가격</div>
            <input
              value={minPrice}
              onChange={(e) => setMinPrice(e.target.value)}
              placeholder="최소가격"
              inputMode="numeric"
              style={{ ...inputStyle, width: 150 }}
            />
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            <div style={{ fontSize: 12, color: '#6b7280' }}>최대가격</div>
            <input
              value={maxPrice}
              onChange={(e) => setMaxPrice(e.target.value)}
              placeholder="최대가격"
              inputMode="numeric"
              style={{ ...inputStyle, width: 150 }}
            />
          </div>

          {/* 적용 */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            <div style={{ fontSize: 12, color: 'transparent' }}>.</div>
            <button onClick={onClickApplyPrice} style={applyBtn}>
              적용
            </button>
          </div>
        </div>

        {/* 에러는 빨간 박스 안에 노출하지 않고, 아래에서만 최소 표시 */}
        {error ? (
          <div style={{ marginTop: 10, color: '#b91c1c', fontSize: 13 }}>
            오류: {error}
          </div>
        ) : null}
      </div>

      {/* 결과 영역 */}
      {loading ? (
        <div style={{ padding: 24 }}>로딩 중...</div>
      ) : filtered.length === 0 ? (
        <div
          style={{
            padding: 40,
            textAlign: 'center',
            border: '1px solid #eee',
            borderRadius: 14,
            background: '#fff',
          }}
        >
          <h3 style={{ marginBottom: 8 }}>검색 결과가 없습니다.</h3>
          <div style={{ color: '#6b7280' }}>다른 지역/서비스/가격을 선택해 보세요.</div>
        </div>
      ) : (
        <div style={{ border: '1px solid #eee', borderRadius: 14, overflow: 'hidden', background: '#fff' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr>
                <th style={thStyle}>병원</th>
                <th style={thStyle}>지역</th>
                <th style={thStyle}>서비스</th>
                <th style={{ ...thStyle, textAlign: 'center' }}>가격</th>
                <th style={thStyle}>비고</th>
                <th style={thStyle}>출처</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((it) => (
                <tr key={it.id}>
                  

<td style={tdStyle}>
  {it.provider_id ? (
    <Link href={`/provider/${it.provider_id}`} style={{ fontWeight: 700 }}>
      {it.provider_name}
    </Link>
  ) : (
    it.provider_name || '-'
  )}
</td>

                  <td style={tdStyle}>{it.provider_region || '-'}</td>
                  <td style={tdStyle}>{it.service_name || '-'}</td>
                  <td style={{ ...tdStyle, textAlign: 'center', fontWeight: 800 }}>
                    {typeof it.price === 'number' ? `${it.price.toLocaleString()}원` : '-'}
                  </td>
                  <td style={tdStyle}>{it.note || '-'}</td>
                  <td style={tdStyle}>{it.source_url ? (
                      <a href={it.source_url} 
                        target="_blank"
                        rel="noopener noreferrer"
                        style={{
                          color: '#2563eb',
                          fontWeight: 600,
                          textDecoration: 'underline',
                        }}
                      >
                        공식 출처
                      </a>
                    ) : (
                      '-'
                    )}
                  </td>

                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* ✅ 하단 광고 (선택) */}
        <AdSense />

      {/* 작은 안내 */}
      <div style={{ marginTop: 12, color: '#6b7280', fontSize: 12 }}>
        * 서비스 드롭다운은 현재 불러온 데이터(items)에서 자동 추출됩니다.
      </div>
    </div>
  );
}
