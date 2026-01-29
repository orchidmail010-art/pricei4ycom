'use client';

// Next.js 15/16 배포를 위해 반드시 Suspense가 필요합니다.
import { useEffect, useMemo, useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import AdSense from '@/components/AdSense';

// --- 타입 정의 ---
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

// --- 인라인 스타일 정의 (기존 내용 그대로) ---
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

const tdStyle: React.CSSProperties = {
  padding: '12px 8px',
  borderBottom: '1px solid #eee',
  fontSize: 14,
};

const thStyle: React.CSSProperties = {
  ...tdStyle,
  background: '#f9fafb',
  fontWeight: 700,
  textAlign: 'left',
};

// 1. 실제 비즈니스 로직이 담긴 내부 컴포넌트
function ResultsList() {
  const searchParams = useSearchParams();
  const router = useRouter();

  // URL에서 초기값 가져오기
  const initialRegion = searchParams.get('region') || '전체';
  const initialQ = searchParams.get('q') || '';

  const [region, setRegion] = useState(initialRegion);
  const [q, setQ] = useState(initialQ);
  const [items, setItems] = useState<Item[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedService, setSelectedService] = useState('전체');

  // 데이터 페칭
  useEffect(() => {
    async function fetchData() {
      setLoading(true);
      try {
        const res = await fetch(`/api/search?region=${region}&q=${q}`);
        const data = await res.json();
        setItems(data || []);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, [region, q]);

  // 서비스 필터링 로직
  const filteredItems = useMemo(() => {
    if (selectedService === '전체') return items;
    return items.filter((it) => it.service_name === selectedService);
  }, [items, selectedService]);

  const serviceOptions = useMemo(() => {
    const set = new Set(items.map((it) => it.service_name).filter(Boolean));
    return ['전체', ...Array.from(set)];
  }, [items]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    router.push(`/results?region=${region}&q=${q}`);
  };

  return (
    <div style={{ maxWidth: 1000, margin: '40px auto', padding: '0 20px', fontFamily: 'sans-serif' }}>
      <h1 style={{ fontSize: 24, fontWeight: 800, marginBottom: 24 }}>비급여 진료비 검색 결과</h1>

      {/* 상단 검색 바 */}
      <form onSubmit={handleSearch} style={{ display: 'flex', gap: 10, marginBottom: 30, flexWrap: 'wrap' }}>
        <select value={region} onChange={(e) => setRegion(e.target.value)} style={inputStyle}>
          <option value="전체">전체 지역</option>
          <option value="서울">서울</option>
          <option value="인천">인천</option>
          <option value="경기">경기</option>
        </select>
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="병원명 또는 진료항목"
          style={{ ...inputStyle, flex: 1, minWidth: 200 }}
        />
        <button type="submit" style={searchBtn}>검색</button>
      </form>

      {/* 필터 탭 */}
      <div style={{ marginBottom: 20, display: 'flex', gap: 8, overflowX: 'auto', paddingBottom: 10 }}>
        {serviceOptions.map((opt) => (
          <button
            key={opt}
            onClick={() => setSelectedService(opt!)}
            style={{
              padding: '6px 12px',
              borderRadius: 20,
              fontSize: 13,
              border: '1px solid #ddd',
              background: selectedService === opt ? '#16a34a' : '#fff',
              color: selectedService === opt ? '#fff' : '#333',
              cursor: 'pointer',
              whiteSpace: 'nowrap'
            }}
          >
            {opt}
          </button>
        ))}
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: '60px 0', color: '#666' }}>데이터를 불러오는 중입니다...</div>
      ) : (
        <div style={{ overflowX: 'auto', background: '#fff', borderRadius: 12, border: '1px solid #eee' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr>
                <th style={thStyle}>병원명</th>
                <th style={thStyle}>지역</th>
                <th style={thStyle}>진료항목</th>
                <th style={thStyle}>가격</th>
                <th style={thStyle}>비고</th>
                <th style={thStyle}>출처</th>
              </tr>
            </thead>
            <tbody>
              {filteredItems.length > 0 ? (
                filteredItems.map((it) => (
                  <tr key={it.id}>
                    <td style={tdStyle}>
                      {it.provider_id ? (
                        <Link href={`/provider/${it.provider_id}`} style={{ fontWeight: 700, color: '#16a34a' }}>
                          {it.provider_name}
                        </Link>
                      ) : (
                        it.provider_name || '-'
                      )}
                    </td>
                    <td style={tdStyle}>{it.provider_region || '-'}</td>
                    <td style={tdStyle}>{it.service_name || '-'}</td>
                    <td style={{ ...tdStyle, fontWeight: 800 }}>
                      {typeof it.price === 'number' ? `${it.price.toLocaleString()}원` : '-'}
                    </td>
                    <td style={tdStyle}>{it.note || '-'}</td>
                    <td style={tdStyle}>
                      {it.source_url ? (
                        <a href={it.source_url} target="_blank" rel="noopener noreferrer" style={{ color: '#2563eb', fontSize: 12 }}>
                          공식 홈페이지
                        </a>
                      ) : '-'}
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={6} style={{ padding: '40px', textAlign: 'center', color: '#999' }}>결과가 없습니다.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      <div style={{ marginTop: 30 }}>
        <AdSense />
      </div>
    </div>
  );
}

// 2. 최종 Export: Suspense 경계로 감싸기 (배포 에러 해결의 핵심)
export default function ResultsPage() {
  return (
    <Suspense fallback={<div style={{ textAlign: 'center', padding: '100px 0' }}>페이지를 준비 중입니다...</div>}>
      <ResultsList />
    </Suspense>
  );
}