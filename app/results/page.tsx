'use client';

export const dynamic = 'force-dynamic';

import { useEffect, useMemo, useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import AdSense from '@/components/AdSense';

function ResultsContent() {
  const sp = useSearchParams();
  const router = useRouter();

  const regionParam = sp.get('region') || '전체';
  const qParam = sp.get('q') || '전체';
  const minParam = sp.get('min') || '';
  const maxParam = sp.get('max') || '';

  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const [region, setRegion] = useState(regionParam);
  const [service, setService] = useState(qParam);
  const [minPrice, setMinPrice] = useState(minParam);
  const [maxPrice, setMaxPrice] = useState(maxParam);

  useEffect(() => {
    setRegion(regionParam);
    setService(qParam);
    setMinPrice(minParam);
    setMaxPrice(maxParam);
  }, [regionParam, qParam, minParam, maxParam]);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const url = `/api/public/prices?region=${encodeURIComponent(regionParam)}&page=1&pageSize=500`;
        const res = await fetch(url, { cache: 'no-store' });
        const json = await res.json();
        setItems(json.ok ? json.items : []);
      } catch (e) {
        console.error("Fetch error:", e);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [regionParam]);

  const serviceOptions = useMemo(() => {
    const set = new Set<string>();
    items.forEach(it => it.service_name && set.add(it.service_name.trim()));
    return ['전체', ...Array.from(set).sort()];
  }, [items]);

  const filtered = useMemo(() => {
    return items.filter(it => {
      if (qParam !== '전체' && it.service_name !== qParam) return false;
      const p = it.price ?? 0;
      const min = Number(minParam.replace(/,/g, '')) || 0;
      const max = Number(maxParam.replace(/,/g, '')) || Infinity;
      return p >= min && p <= max;
    });
  }, [items, qParam, minParam, maxParam]);

  const handleSearch = () => {
    const params = new URLSearchParams(sp.toString());
    params.set('region', region);
    params.set('q', service);
    router.push(`/results?${params.toString()}`);
  };

  const handlePriceApply = () => {
    const params = new URLSearchParams(sp.toString());
    params.set('min', minPrice);
    params.set('max', maxPrice);
    router.push(`/results?${params.toString()}`);
  };

  // ✅ [수정] 지역 변경 시 즉시 데이터를 불러오는 함수 (JS 영역의 올바른 위치)
  const handleRegionChange = async (newRegion: string) => {
    setRegion(newRegion);
    const params = new URLSearchParams(sp.toString());
    params.set('region', newRegion);
    params.set('q', '전체'); 
    router.push(`/results?${params.toString()}`);

    setLoading(true);
    try {
      const url = `/api/public/prices?region=${encodeURIComponent(newRegion)}&page=1&pageSize=500`;
      const res = await fetch(url, { cache: 'no-store' });
      const json = await res.json();
      setItems(json.ok ? json.items : []);
      setService('전체');
    } catch (e) {
      console.error("Fetch error:", e);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-[800px] mx-auto px-4 py-6">
      <h2 className="text-xl font-extrabold mb-4 text-gray-900">검색 결과 ({filtered.length})</h2>
      
      <div className="mb-4"><AdSense /></div>

      {/* 필터 카드 영역 */}
      <div className="bg-white rounded-xl shadow-sm p-5 mb-5 border border-gray-200 animate-fadeIn">
        {/* 상단: 지역/서비스/검색 - 모바일 대응 레이아웃 */}
        <div className="flex flex-col sm:flex-row gap-3 mb-3">
          <div className="flex gap-2 flex-1">
            <select 
              className="w-1/3 sm:w-[120px] border border-gray-300 rounded-lg px-3 py-2 text-sm outline-none focus:border-green-500"
              value={region} 
              onChange={(e) => handleRegionChange(e.target.value)}
            >
              <option value="전체">전체 지역</option>
              <option value="서울">서울</option>
              <option value="인천">인천</option>
              <option value="경기">경기</option>
            </select>
            <select 
              className="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm outline-none focus:border-green-500"
              value={service} 
              onChange={(e) => setService(e.target.value)}
            >
              {serviceOptions.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>
          <button onClick={handleSearch} className="btn bg-green-600 text-white hover:bg-green-700 font-bold px-6 py-2 sm:py-0 rounded-lg">
            검색
          </button>
        </div>

        {/* 하단: 가격 필터 - 모바일에서 삐져나가지 않게 수정 */}
        <div className="flex flex-col sm:flex-row gap-2">
          <div className="flex gap-2 flex-1 w-full">
            <input 
              type="number"
              className="w-1/2 sm:flex-1 border border-gray-200 rounded-lg px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-green-500"
              placeholder="최소 가격" 
              value={minPrice} 
              onChange={(e) => setMinPrice(e.target.value)}
            />
            <input 
              type="number"
              className="w-1/2 sm:flex-1 border border-gray-200 rounded-lg px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-green-500"
              placeholder="최대 가격" 
              value={maxPrice} 
              onChange={(e) => setMaxPrice(e.target.value)}
            />
          </div>
          <button 
            onClick={handlePriceApply} 
            className="w-full sm:w-auto btn btn-outline border-gray-200 text-gray-600 font-bold py-2.5 px-4 rounded-lg hover:bg-gray-50 whitespace-nowrap"
          >
            가격적용
          </button>
        </div>
      </div>

      {/* 결과 테이블 */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <table className="w-full table-fixed border-collapse text-left">
          <thead>
            <tr className="bg-gray-50 border-b border-gray-100">
              <th className="w-[30%] py-3 px-3 text-xs font-bold text-gray-500">병원</th>
              <th className="w-[15%] py-3 px-2 text-xs font-bold text-gray-500">지역</th>
              <th className="w-[15%] py-3 px-2 text-xs font-bold text-gray-500">서비스</th>
              <th className="w-[20%] py-3 px-2 text-right text-xs font-bold text-gray-500">가격</th>
              <th className="w-[10%] py-3 px-2 text-center text-xs font-bold text-gray-500">출처</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {loading ? (
              <tr><td colSpan={5} className="py-20 text-center text-gray-400">데이터 로딩 중...</td></tr>
            ) : filtered.length === 0 ? (
              <tr><td colSpan={5} className="py-20 text-center text-gray-400">검색 결과가 없습니다.</td></tr>
            ) : (
              filtered.map((it) => (
                <tr key={it.id} className="hover:bg-green-50/30 transition-colors">
                  <td className="py-4 px-3 text-sm font-bold text-green-700 truncate">
                    <Link href={`/provider/${it.provider_id}`}>{it.provider_name}</Link>
                  </td>
                  <td className="py-4 px-2 text-sm text-gray-600">{it.provider_region}</td>
                  <td className="py-4 px-2 text-sm text-gray-600 truncate">{it.service_name}</td>
                  <td className="py-4 px-2 text-sm font-black text-right text-gray-900">
                    {it.price?.toLocaleString()}원
                  </td>
                  <td className="py-4 px-2 text-center">
                    {it.source_url ? (
                      <a href={it.source_url} target="_blank" className="text-blue-500 hover:underline text-xs font-bold">공식</a>
                    ) : '-'}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
      <div className="mt-6"><AdSense /></div>
    </div>
  );
}

export default function ResultsPage() {
  return (
    <Suspense fallback={null}>
      <ResultsContent />
    </Suspense>
  );
}