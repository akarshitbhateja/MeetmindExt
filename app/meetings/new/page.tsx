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
    <div className="min-h-screen bg-black text-white px-10 py-8">
      <div className="max-w-2xl">
        <h1 className="text-3xl font-semibold mb-2">
          Pre-Meeting Setup
        </h1>
        <p className="text-neutral-400 mb-8 text-sm">
          Define context before the meeting starts
        </p>

        <div className="space-y-6 bg-neutral-900/50 border border-neutral-800 rounded-2xl p-8">
          <div>
            <label className="text-sm text-neutral-400">
              Meeting Title
            </label>
            <input
              className="w-full mt-2 p-3 bg-black border border-neutral-800 rounded-xl focus:outline-none focus:border-green-700"
              placeholder="Weekly Product Sync"
              onChange={(e) => setTitle(e.target.value)}
            />
          </div>

          <div>
            <label className="text-sm text-neutral-400">
              Agenda
            </label>
            <textarea
              className="w-full mt-2 p-3 bg-black border border-neutral-800 rounded-xl h-40 focus:outline-none focus:border-green-700"
              placeholder="Topics, goals, decisions to be made…"
              onChange={(e) => setAgenda(e.target.value)}
            />
          </div>

          <button
            onClick={saveMeeting}
            className="w-full bg-green-700 hover:bg-green-800 transition py-3 rounded-xl font-medium"
          >
            Save & Continue
          </button>
        </div>
      </div>
    </div>
  );
}
