"use client";

export default function Toast({ message }) {
  if (!message) return null;

  return (
    <div className="fixed top-4 right-4 bg-black text-white px-4 py-2 rounded shadow-lg z-[9999] animate-fadeIn">
      {message}
    </div>
  );
}
