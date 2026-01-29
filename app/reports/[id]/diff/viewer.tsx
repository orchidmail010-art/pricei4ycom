"use client";

import { useEffect, useState } from "react";

export default function ClientDiffViewer({ id }) {
  console.log("🔥 diff fetch ID:", id);

  const [diff, setDiff] = useState(null);

  useEffect(() => {
    if (!id) return;

    async function load() {
      const res = await fetch(`/api/reports/${id}/diff`);
      const json = await res.json();
      setDiff(json);
    }

    load();
  }, [id]);

  if (!diff) return <p>로딩 중…</p>;
  if (!diff.ok) return <p>⚠ {diff.message}</p>;

  return (
    <div style={{ padding: 20 }}>
      <h1>Diff 결과</h1>

      <h3>요약</h3>
      <pre>{diff.summary}</pre>

      <h3>Before</h3>
      <pre>{JSON.stringify(diff.before, null, 2)}</pre>

      <h3>After</h3>
      <pre>{JSON.stringify(diff.after, null, 2)}</pre>
    </div>
  );
}
