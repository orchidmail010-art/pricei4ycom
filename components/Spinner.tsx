// components/Spinner.tsx
'use client';

export default function Spinner({ label = '불러오는 중…' }: { label?: string }) {
  return (
    <div style={{ display:'flex', alignItems:'center', gap:10, padding:'16px 0', color:'#4b5563' }}>
      <div
        aria-hidden
        style={{
          width: 18, height: 18, borderRadius: '50%',
          border: '2px solid #e5e7eb', borderTopColor: '#0ea5e9',
          animation: 'spin 0.8s linear infinite'
        }}
      />
      <span>{label}</span>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  );
}
