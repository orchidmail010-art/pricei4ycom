export default function PriorityTag({ level }) {
  const color = {
    normal: "bg-gray-200 text-gray-700",
    high: "bg-yellow-300 text-yellow-900",
    urgent: "bg-red-500 text-white",
  }[level || "normal"];

  const label = {
    normal: "일반",
    high: "높음",
    urgent: "긴급",
  }[level || "normal"];

  return (
    <span className={`px-2 py-1 text-xs rounded ${color}`}>
      {label}
    </span>
  );
}
