"use client";

import { useState } from "react";
import { auth } from "@/lib/firebase";
import { useRouter } from "next/navigation";

export default function NewMeeting() {
  const [title, setTitle] = useState("");
  const [agenda, setAgenda] = useState("");
  const router = useRouter();

  const saveMeeting = async () => {
    const user = auth.currentUser;
    if (!user) return;

    await fetch("/api/meetings", {
      method: "POST",
      body: JSON.stringify({
        title,
        agenda,
        userId: user.uid,
      }),
    });

    router.push("/dashboard");
  };

  return (
    <div className="p-8 max-w-2xl">
      <h1 className="text-2xl font-bold mb-6">Pre-Meeting Setup</h1>

      <input
        placeholder="Meeting Title"
        className="w-full p-3 mb-4 bg-neutral-900 rounded"
        onChange={(e) => setTitle(e.target.value)}
      />

      <textarea
        placeholder="Meeting Agenda"
        className="w-full p-3 mb-6 bg-neutral-900 rounded h-40"
        onChange={(e) => setAgenda(e.target.value)}
      />

      <button
        onClick={saveMeeting}
        className="bg-green-700 px-6 py-3 rounded-lg"
      >
        Save & Continue
      </button>
    </div>
  );
}
