import Link from 'next/link';
import LogoutButton from './_components/LogoutButton';

export const metadata = {
  title: '관리자 페이지 - 비급여 비교 MVP',
  description: 'Supabase 기반 비급여 진료비 관리자',
};

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ background: '#f9fafb', minHeight: '100vh' }}>
      <div style={{ maxWidth: 1100, margin: '0 auto', padding: '20px 16px 80px' }}>
        <header
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginBottom: 20,
            borderBottom: '2px solid #e5e7eb',
            paddingBottom: 10,
          }}
        >
          <h1 style={{ fontSize: 22, fontWeight: 800 }}>🔧 비급여 진료비 관리자</h1>

          <nav style={{ display: 'flex', gap: 16, alignItems: 'center' }}>
            <Link href="/admin" style={{ textDecoration: 'none', color: '#0369a1' }}>홈</Link>
            <Link href="/admin/providers" style={{ textDecoration: 'none', color: '#0369a1' }}>병원</Link>
            <Link href="/admin/services" style={{ textDecoration: 'none', color: '#0369a1' }}>서비스</Link>
            <Link href="/admin/prices" style={{ textDecoration: 'none', color: '#0369a1' }}>가격</Link>
             <Link href="/admin/reports" className="font-semibold text-red-600">
              신고
              </Link>
            <Link href="/admin/providers/bulk" style={{ marginRight: 14 }}>병원 대량등록</Link>
            <Link href="/admin/services/bulk" style={{ textDecoration: 'none', color: '#0369a1' }}>서비스 대량등록</Link>
             <Link href="/admin/prices/bulk" style={{ textDecoration:'none', color:'#0369a1' }}>가격 대량등록</Link>
             
            <Link href="/" style={{ textDecoration: 'none', color: '#6b7280' }}>← 사용자 화면</Link>

            {/* ✅ onClick이 들어가는 부분은 Client 컴포넌트로 분리 */}
            <LogoutButton />
          </nav>
        </header>

        <main>{children}</main>
      </div>
    </div>
  );
}
