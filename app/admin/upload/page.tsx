'use client';
import { useState } from 'react';

export default function AdminUploadPage() {
  const [secret, setSecret] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);

  const handleUpload = async () => {
    if (!file) return alert('CSV 파일을 선택하세요.');
    setLoading(true);
    setMessage('');

    try {
      const formData = new FormData();
      formData.append('file', file);
      const res = await fetch('/api/admin/upload', {
        method: 'POST',
        headers: { 'x-admin-secret': secret },
        body: formData,
      });

      const result = await res.json();
      if (res.ok) {
        setMessage(`✅ 업로드 성공: ${JSON.stringify(result, null, 2)}`);
      } else {
        setMessage(`❌ 실패: ${result.error || res.statusText}`);
      }
    } catch (err: any) {
      setMessage(`❌ 오류 발생: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <main style={{ maxWidth: 600, margin: '40px auto', padding: '0 16px' }}>
      <h1 style={{ fontSize: 24, fontWeight: 700 }}>관리자 CSV 업로드</h1>

      <label style={{ display: 'block', marginTop: 20 }}>
        관리자 비밀번호:
        <input
          type="password"
          value={secret}
          onChange={(e) => setSecret(e.target.value)}
          style={{ width: '100%', padding: 8, marginTop: 8 }}
        />
      </label>

      <label style={{ display: 'block', marginTop: 20 }}>
        CSV 파일 선택:
        <input
          type="file"
          accept=".csv"
          onChange={(e) => setFile(e.target.files?.[0] ?? null)}
          style={{ width: '100%', marginTop: 8 }}
        />
      </label>

      <button
        onClick={handleUpload}
        disabled={loading}
        style={{
          marginTop: 20,
          width: '100%',
          padding: 12,
          background: '#0ea5e9',
          color: '#fff',
          fontWeight: 700,
          border: 'none',
          borderRadius: 8,
          cursor: 'pointer',
        }}
      >
        {loading ? '업로드 중...' : '업로드 실행'}
      </button>

      {message && (
        <pre
          style={{
            marginTop: 20,
            background: '#f8f8f8',
            padding: 10,
            borderRadius: 6,
            fontSize: 13,
          }}
        >
          {message}
        </pre>
      )}
    </main>
  );
}
