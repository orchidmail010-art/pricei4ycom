"use client";

export default function StatusTabs({ status, onChange }) {
  const tabs = [
    { key: "all", label: "전체" },
    { key: "auto", label: "자동 처리 가능" },
    { key: "done", label: "자동 처리 완료" },
    { key: "manual", label: "수동 필요" },
  ];

  return (
    <div className="flex gap-2 mb-4">
      {tabs.map((t) => (
        <button
          key={t.key}
          onClick={() => onChange(t.key)}
          className={`px-4 py-2 rounded border ${
            status === t.key
              ? "bg-black text-white"
              : "bg-white text-gray-800"
          }`}
        >
          {t.label}
        </button>
      ))}
    </div>
  );
}
