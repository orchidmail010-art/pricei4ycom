export default function AdminStatCard({ title, value, color = "gray" }) {
  const colorMap = {
    gray: "bg-gray-100 text-gray-800 border-gray-300",
    blue: "bg-blue-100 text-blue-800 border-blue-300",
    green: "bg-green-100 text-green-800 border-green-300",
    yellow: "bg-yellow-100 text-yellow-800 border-yellow-300",
    red: "bg-red-100 text-red-800 border-red-300",
    purple: "bg-purple-100 text-purple-800 border-purple-300",
  };

  return (
    <div
      className={`p-4 rounded-lg border shadow-sm ${colorMap[color]} flex flex-col justify-center items-center`}
    >
      <p className="text-sm font-semibold mb-1">{title}</p>
      <p className="text-2xl font-bold">{value}</p>
    </div>
  );
}
