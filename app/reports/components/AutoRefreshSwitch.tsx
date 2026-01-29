"use client";

import { useEffect, useState } from "react";

export default function AutoRefreshSwitch({ onRefresh }) {
  const [enabled, setEnabled] = useState(true);

  useEffect(() => {
    if (!enabled) return;

    const timer = setInterval(() => {
      onRefresh();
    }, 5000);

    return () => clearInterval(timer);
  }, [enabled, onRefresh]);

  return (
    <div className="flex items-center gap-2 mb-4">
      <label className="font-medium">자동 새로고침</label>
      <input
        type="checkbox"
        checked={enabled}
        onChange={() => setEnabled(!enabled)}
      />
    </div>
  );
}
