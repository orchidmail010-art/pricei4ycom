'use client';

export default function LogoutButton() {
  async function onLogout() {
    try {
      await fetch('/api/admin/auth', { method: 'DELETE' });
    } catch (e) {
      // 무시
    } finally {
      window.location.href = '/admin/login';
    }
  }

  return (
    <button
      onClick={onLogout}
      style={{
        border: '1px solid #ddd',
        borderRadius: 8,
        padding: '6px 10px',
        background: '#fff',
        cursor: 'pointer',
      }}
    >
      로그아웃
    </button>
  );
}
