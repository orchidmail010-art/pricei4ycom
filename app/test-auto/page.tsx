"use client";

export default function TestAuto() {
  async function testAuto() {
    const id = prompt("신고 ID 입력:");
    if (!id) return;

    const res = await fetch(`/reports/${id}/auto`, {
      method: "POST",
    });

    const json = await res.json();
    alert(JSON.stringify(json, null, 2));
  }

  return (
    <div style={{ padding: 40 }}>
      <h1>자동 처리 테스트 버튼</h1>
      <button
        onClick={testAuto}
        style={{
          padding: "10px 20px",
          background: "#00a667",
          color: "#fff",
          borderRadius: 8,
        }}
      >
        테스트 실행 (POST)
      </button>
    </div>
  );
}
