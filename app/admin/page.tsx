'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';

type Stats = {
  providers: number;
  services: number;
  prices: number;
  latestProviders: Array<{ id:number; name:string; region:string | null }>;
  latestPrices: Array<{ id:number; provider_name:string | null; service_name:string | null; price:number | null; updated_at:string | null }>;
};

const card = {
  border: '1px solid #e5e7eb',
  borderRadius: 12,
  padding: 16,
  background: '#fff',
} as React.CSSProperties;

export default function AdminHome() {
  const [data, setData] = useState<Stats | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      setLoading(true); setErr(null);
      try {
        const res = await fetch('/api/admin/stats', { cache: 'no-store' });
        const json = await res.json();
        if (!res.ok) throw new Error(json?.error || 'failed');
        setData(json as Stats);
      } catch (e:any) {
        setErr(e?.message || '불러오기 실패');
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  return (
    <main style={{ maxWidth: 1100, margin: '30px auto', padding: '0 16px' }}>
      <h1 style={{ fontSize: 22, fontWeight: 800, marginBottom: 12 }}>관리자 대시보드</h1>

      {loading && <p>불러오는 중…</p>}
      {err && <pre style={{ color: 'red' }}>{err}</pre>}

      {data && (
        <>
          {/* 상단 KPI */}
          <section style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12, marginBottom: 16 }}>
            <div style={card}>
              <div style={{ color: '#6b7280', fontSize: 12, marginBottom: 4 }}>병원 수</div>
              <div style={{ fontSize: 28, fontWeight: 800 }}>{data.providers.toLocaleString()}</div>
              <div style={{ marginTop: 8 }}>
                <Link href="/admin/providers">자세히 보기 →</Link>
              </div>
            </div>
            <div style={card}>
              <div style={{ color: '#6b7280', fontSize: 12, marginBottom: 4 }}>서비스 수</div>
              <div style={{ fontSize: 28, fontWeight: 800 }}>{data.services.toLocaleString()}</div>
              <div style={{ marginTop: 8 }}>
                <Link href="/admin/services">자세히 보기 →</Link>
              </div>
            </div>
            <div style={card}>
              <div style={{ color: '#6b7280', fontSize: 12, marginBottom: 4 }}>가격 수</div>
              <div style={{ fontSize: 28, fontWeight: 800 }}>{data.prices.toLocaleString()}</div>
              <div style={{ marginTop: 8 }}>
                <Link href="/admin/prices">자세히 보기 →</Link>
              </div>
            </div>
          </section>

          {/* 최근 등록/수정 */}
          <section style={{ display: 'grid', gridTemplateColumns: '1fr 1.2fr', gap: 12 }}>
            <div style={card}>
              <h2 style={{ fontSize: 16, fontWeight: 800, margin: 0, marginBottom: 10 }}>최근 병원 5건</h2>
              {data.latestProviders.length === 0 ? (
                <p style={{ color: '#6b7280' }}>없음</p>
              ) : (
                <ul style={{ margin: 0, paddingLeft: 18 }}>
                  {data.latestProviders.map(p => (
                    <li key={p.id} style={{ marginBottom: 6 }}>
                      <b>{p.name}</b>
                      {p.region && <span style={{ marginLeft: 8, fontSize: 12, color: '#6b7280' }}>({p.region})</span>}
                    </li>
                  ))}
                </ul>
              )}
              <div style={{ marginTop: 10 }}>
                <Link href="/admin/providers/bulk">병원 대량등록 →</Link>
              </div>
            </div>

            <div style={card}>
              <h2 style={{ fontSize: 16, fontWeight: 800, margin: 0, marginBottom: 10 }}>최근 가격 5건</h2>
              {data.latestPrices.length === 0 ? (
                <p style={{ color: '#6b7280' }}>없음</p>
              ) : (
                <ul style={{ margin: 0, paddingLeft: 18 }}>
                  {data.latestPrices.map(r => (
                    <li key={r.id} style={{ marginBottom: 6 }}>
                      <b>{r.provider_name ?? '병원'}</b> · {r.service_name ?? '서비스'} — <b>{r.price?.toLocaleString() ?? '-'}</b>원
                      <span style={{ marginLeft: 8, fontSize: 12, color: '#6b7280' }}>{r.updated_at ?? ''}</span>
                    </li>
                  ))}
                </ul>
              )}
              <div style={{ marginTop: 10, display: 'flex', gap: 10, alignItems: 'center' }}>
                <Link href="/admin/prices/bulk">가격 대량등록 →</Link>
                <Link href="/admin/services/bulk">서비스 대량등록 →</Link>
              </div>
            </div>
          </section>
        </>
      )}
    </main>
  );
}
