'use client';

import { useEffect, useState } from 'react';

type PriceItem = {
  id: number;
  provider_id: number;
  service_id: number;
  original_name: string | null;
  detail_name: string | null;
  price: number | null;
  min_price: number | null;
  max_price: number | null;
  note: string | null;
};

export default function PricesPage() {
  const [items, setItems] = useState<PriceItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [region, setRegion] = useState('전체'); // 아직 API 미연결 (UI 유지)

  useEffect(() => {
    async function fetchPrices() {
      setLoading(true);

      const qs =
        region === '전체'
          ? ''
          : `?region=${encodeURIComponent(region)}`;

      const res = await fetch(`/api/public/prices${qs}`);
      const json = await res.json();

      setItems(json.items || []);
      setLoading(false);
    }

    fetchPrices();
  }, [region]);


  return (
    <div style={{ padding: '20px' }}>
      <h1>비급여 진료비 비교</h1>

      {/* 지역 필터 (UI만 유지, 추후 API 연동) */}
      <div style={{ margin: '15px 0' }}>
        <label style={{ marginRight: '10px' }}>지역 선택:</label>
        <select
          value={region}
          onChange={(e) => setRegion(e.target.value)}
          style={{
            padding: '6px 12px',
            borderRadius: '6px',
            border: '1px solid #ccc',
          }}
        >
          <option value="전체">전체</option>
          <option value="서울">서울</option>
          <option value="인천">인천</option>
          <option value="경기">경기</option>
        </select>
      </div>

      {loading ? (
        <p>로딩 중...</p>
      ) : items.length === 0 ? (
        <p>데이터가 없습니다.</p>
      ) : (
        <table style={tableStyle}>
          <thead>
            <tr style={theadRow}>
              <th style={{ ...th, width: '18%' }}>병원명</th>
              <th style={{ ...th, width: '8%' }}>지역</th>
              <th style={{ ...th, width: '14%' }}>항목</th>
              <th style={{ ...th, width: '10%' }}>세부</th>
              <th style={{ ...th, width: '15%', textAlign: 'right' }}>가격</th>
              <th style={{ ...th, width: '35%' }}>비고</th>
            </tr>
          </thead>

          <tbody>
            {items.map((item) => (
              <tr key={item.id} style={tr}>
                <td style={tdLeft}>{item.provider_name}</td>
                <td style={tdCenter}>{item.provider_region}</td>
                <td style={tdCenter}>{item.original_name ?? '—'}</td>
                <td style={tdCenter}>{item.detail_name ?? '—'}</td>
                <td style={tdRight}>{renderPrice(item)}</td>
                <td style={tdLeft}>{item.note ?? ''}</td>
              </tr>
            ))}
          </tbody>
        </table>

      )}
    </div>
  );
}

function renderPrice(item: any) {
  if (item.price != null) {
    return `${item.price.toLocaleString()}원`;
  }
  if (item.min_price != null && item.max_price != null) {
    return `${item.min_price.toLocaleString()} ~ ${item.max_price.toLocaleString()}원`;
  }
  return '—';
}


const th1: React.CSSProperties = {
  padding: '10px',
  borderBottom: '1px solid #ddd',
  textAlign: 'left',
};

const td: React.CSSProperties = {
  padding: '8px',
  borderBottom: '1px solid #eee',
};

const tableStyle: React.CSSProperties = {
  width: '100%',
  borderCollapse: 'separate',
  borderSpacing: '0 6px', // 행 간격
  fontSize: '15px',
};

const theadRow: React.CSSProperties = {
  background: '#f3f4f6',
};

const th: React.CSSProperties = {
  padding: '12px 10px',
  textAlign: 'left',
  fontWeight: 600,
  color: '#333',
};

const tr: React.CSSProperties = {
  background: '#fff',
};

const tdBase: React.CSSProperties = {
  padding: '10px 10px',
  borderBottom: '1px solid #eee',
  verticalAlign: 'middle',
};

const tdLeft: React.CSSProperties = {
  ...tdBase,
  textAlign: 'left',
};

const tdCenter: React.CSSProperties = {
  ...tdBase,
  textAlign: 'center',
  color: '#444',
};

const tdRight: React.CSSProperties = {
  ...tdBase,
  textAlign: 'right',
  fontWeight: 600,
};
