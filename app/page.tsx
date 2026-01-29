// app/page.tsx
'use client';

import { useRouter } from 'next/navigation';
import { useState, useEffect, FormEvent } from 'react';

type RecentItem = { region: string; q: string; ts: number };
const RECENT_KEY = 'noncovered_recent_searches';
const LAST_KEY = 'noncovered_last_search';
const MAX_RECENT = 6;

export default function Home() {
  const router = useRouter();
  const [region, setRegion] = useState('서울');
  const [q, setQ] = useState('임플란트');
  const [recents, setRecents] = useState<RecentItem[]>([]);

  // 로컬 스토리지 복원 (클라 전용)
  useEffect(() => {
    try {
      const raw = localStorage.getItem(RECENT_KEY);
      if (raw) setRecents(JSON.parse(raw));
      const last = localStorage.getItem(LAST_KEY);
      if (last) {
        const v = JSON.parse(last);
        if (v?.region) setRegion(v.region);
        if (typeof v?.q === 'string') setQ(v.q);
      }
    } catch {}
  }, []);

  const saveRecent = (rg: string, qq: string) => {
    try {
      const item = { region: rg, q: qq, ts: Date.now() };
      const list = [item, ...recents]
        .filter((v, i, a) => i === a.findIndex(x => x.region === v.region && x.q === v.q))
        .slice(0, MAX_RECENT);
      setRecents(list);
      localStorage.setItem(RECENT_KEY, JSON.stringify(list));
      localStorage.setItem(LAST_KEY, JSON.stringify({ region: rg, q: qq }));
    } catch {}
  };

  const onSubmit = (e: FormEvent) => {
    e.preventDefault();
    saveRecent(region, q);
    const params = new URLSearchParams({ region, q });
    router.push(`/results?${params.toString()}`);
  };

  return (
    <main style={{ maxWidth: 720, margin: '40px auto', padding: '0 16px' }}>
      <h1 style={{ fontSize: 28, fontWeight: 800, marginBottom: 14 }}>
        비급여 진료비 비교 (MVP)
      </h1>

      <form onSubmit={onSubmit} style={{ display: 'grid', gap: 12 }}>
        <label style={{ display: 'grid', gap: 6 }}>
          <span>지역</span>
          <select
            value={region}
            onChange={(e) => setRegion(e.target.value)}
            style={{ padding: 10, border: '1px solid #ddd', borderRadius: 8 }}
          >
            <option value="전체">전체</option>
            <option value="서울">서울</option>
            <option value="인천">인천</option>
            <option value="경기">경기</option>
          </select>
        </label>

        <label style={{ display: 'grid', gap: 6 }}>
          <span>진료 항목</span>
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="예: 임플란트, 도수치료, 초음파"
            style={{ padding: 10, border: '1px solid #ddd', borderRadius: 8 }}
          />
        </label>

        <button
          type="submit"
          style={{
            marginTop: 4,
            padding: '12px 16px',
            borderRadius: 10,
            border: 'none',
            background: '#0ea5e9',
            color: 'white',
            fontWeight: 700,
            cursor: 'pointer',
          }}
        >
          검색
        </button>
      </form>

      {/* 최근 검색 */}
      {recents.length > 0 && (
        <section style={{ marginTop: 18 }}>
          <div style={{ fontSize: 13, color: '#6b7280', marginBottom: 6 }}>최근 검색</div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
            {recents.map((it, idx) => (
              <button
                key={`${it.region}-${it.q}-${idx}`}
                type="button"
                onClick={() => {
                  setRegion(it.region);
                  setQ(it.q);
                  const params = new URLSearchParams({ region: it.region, q: it.q });
                  router.push(`/results?${params.toString()}`);
                }}
                style={{
                  padding: '6px 10px',
                  borderRadius: 999,
                  border: '1px solid #e5e7eb',
                  background: '#fff',
                  cursor: 'pointer',
                  fontSize: 13,
                }}
                title={`${it.region} · ${it.q || '전체'}`}
              >
                {it.region} · {it.q || '전체'}
              </button>
            ))}
            <button
              type="button"
              onClick={() => { setRecents([]); localStorage.removeItem(RECENT_KEY); }}
              style={{
                padding: '6px 10px',
                borderRadius: 999,
                border: '1px solid #e5e7eb',
                background: '#fff',
                cursor: 'pointer',
                fontSize: 13,
                color: '#ef4444',
              }}
              title="최근 검색 비우기"
            >
              비우기
            </button>
          </div>
        </section>
      )}

      <p style={{ marginTop: 14, fontSize: 13, color: '#666' }}>
        예시: 지역은 ‘서울’, 항목은 ‘임플란트’로 검색하여 비교합니다.
      </p>
    </main>
  );
}
