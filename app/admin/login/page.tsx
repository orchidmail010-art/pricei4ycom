'use client';

export const dynamic = 'force-dynamic';

import { useRouter, useSearchParams } from 'next/navigation';
import { useState, FormEvent } from 'react';

export default function AdminLoginPage() {
  const [pw, setPw] = useState('');
  const [err, setErr] = useState<string|null>(null);
  const router = useRouter();
  const sp = useSearchParams();
  const next = sp.get('next') || '/admin';

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setErr(null);
    const res = await fetch('/api/admin/auth', {
      method: 'POST',
      headers: { 'Content-Type':'application/json' },
      body: JSON.stringify({ password: pw }),
    });
    if (!res.ok) {
      const data = await res.json().catch(()=>({}));
      setErr(data.error || '로그인 실패');
      return;
    }
    router.replace(next);
  };

  return (
    <main style={{ maxWidth: 420, margin: '80px auto', padding: '0 16px' }}>
      <h1 style={{ fontSize: 22, fontWeight: 800, marginBottom: 12 }}>관리자 로그인</h1>
      <form onSubmit={onSubmit} style={{ display:'grid', gap: 10 }}>
        <input
          type="password"
          value={pw}
          onChange={(e)=>setPw(e.target.value)}
          placeholder="ADMIN_KEY 입력"
          style={{ padding: 12, border:'1px solid #ddd', borderRadius: 10 }}
          autoFocus
        />
        <button
          type="submit"
          style={{ padding: 12, borderRadius: 10, background:'#0ea5e9', color:'#fff', border:'1px solid #0ea5e9', fontWeight:700 }}
        >
          로그인
        </button>
        {err && <div style={{ color:'red' }}>{err}</div>}
      </form>
    </main>
  );
}
