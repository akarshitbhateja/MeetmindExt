"use client";

import { useEffect } from "react";

export default function Toast({
  message,
  type,
  onClose,
}: {
  message: string;
  type: "success" | "error";
  onClose: () => void;
}) {
  useEffect(() => {
    const timer = setTimeout(onClose, 2600);
    return () => clearTimeout(timer);
  }, [onClose]);

  return (
    <div className="fixed top-6 left-1/2 -translate-x-1/2 z-50 animate-toast">
      <div
        className={`px-5 py-3 rounded-md border text-sm shadow-lg backdrop-blur-md
        ${
          type === "success"
            ? "bg-neutral-900 border-green-700 text-green-400"
            : "bg-neutral-900 border-red-600 text-red-400"
        }`}
      >
        {message}
      </div>
    </div>
  );
}
