'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function SearchPage() {
  const router = useRouter();
  const [region, setRegion] = useState('');
  const [service, setService] = useState('');

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (!region || !service) {
      alert('지역과 항목을 모두 입력해주세요.');
      return;
    }
    router.push(`/results?region=${encodeURIComponent(region)}&q=${encodeURIComponent(service)}`);
  };

  return (
    <div style={{ maxWidth: '600px', margin: '80px auto', padding: '20px', textAlign: 'center', fontFamily: 'Pretendard, sans-serif' }}>
      <h1 style={{ fontSize: '26px', marginBottom: '30px' }}>비급여 진료비 검색</h1>

      <form onSubmit={handleSearch} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
        {/* 지역 선택 */}
        <div>
          <label htmlFor="region" style={{ display: 'block', marginBottom: '8px', fontWeight: 'bold' }}>지역 선택</label>
          <select
            id="region"
            value={region}
            onChange={(e) => setRegion(e.target.value)}
            style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid #ccc' }}
          >
            <option value="">-- 지역을 선택하세요 --</option>
            <option value="서울">서울</option>
            <option value="인천">인천</option>
            <option value="경기">경기</option>
            <option value="강원">강원</option>
            <option value="부산">부산</option>
            <option value="대전">대전</option>
          </select>
        </div>

        {/* 항목명 입력 */}
        <div>
          <label htmlFor="service" style={{ display: 'block', marginBottom: '8px', fontWeight: 'bold' }}>항목명 입력</label>
          <input
            id="service"
            type="text"
            placeholder="예: 초음파, 내시경 등"
            value={service}
            onChange={(e) => setService(e.target.value)}
            style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid #ccc' }}
          />
        </div>

        {/* 검색 버튼 */}
        <button
          type="submit"
          style={{
            background: '#0070f3',
            color: '#fff',
            border: 'none',
            borderRadius: '6px',
            padding: '12px',
            fontSize: '16px',
            fontWeight: 'bold',
            cursor: 'pointer',
          }}
        >
          검색하기
        </button>
      </form>
    </div>
  );
}
