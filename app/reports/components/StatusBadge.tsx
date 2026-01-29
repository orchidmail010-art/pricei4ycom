export function StatusBadge({ status }) {
  const styles = {
    pending: "bg-gray-200 text-gray-700",
    auto: "bg-blue-100 text-blue-700",
    manual: "bg-yellow-200 text-yellow-700",
    completed: "bg-green-100 text-green-700",
  };

  const labels = {
    pending: "대기중",
    auto: "자동 처리",
    manual: "수동 처리",
    completed: "처리 완료",
  };

  return (
    <span className={`px-2 py-1 text-xs rounded ${styles[status]}`}>
      {labels[status]}
    </span>
  );
}

