"use client";

import { auth } from "@/lib/firebase";
import { signOut } from "firebase/auth";
import { useRouter } from "next/navigation";

export default function Dashboard() {
  const router = useRouter();

  const logout = async () => {
    await signOut(auth);
    router.push("/login");
  };

  return (
    <div className="min-h-screen bg-black text-white px-10 py-8">
      <header className="flex justify-between items-center mb-10">
        <div>
          <h1 className="text-3xl font-semibold">Dashboard</h1>
          <p className="text-neutral-400 text-sm">
            Manage your meetings intelligently
          </p>
        </div>

        <button
          onClick={logout}
          className="text-sm text-neutral-400 hover:text-red-400"
        >
          Logout
        </button>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Create Meeting Card */}
        <div
          onClick={() => router.push("/meetings/new")}
          className="cursor-pointer rounded-2xl border border-neutral-800 bg-neutral-900/50 hover:border-green-700 transition p-6"
        >
          <h2 className="text-xl font-medium mb-2">
            + New Meeting
          </h2>
          <p className="text-sm text-neutral-400">
            Schedule, manage & summarize meetings
          </p>
        </div>

        {/* Placeholder cards for future */}
        <div className="rounded-2xl border border-neutral-800 bg-neutral-900/30 p-6 opacity-50">
          <h2 className="text-lg font-medium">Analytics</h2>
          <p className="text-sm text-neutral-500 mt-2">
            Coming soon
          </p>
        </div>

        <div className="rounded-2xl border border-neutral-800 bg-neutral-900/30 p-6 opacity-50">
          <h2 className="text-lg font-medium">Team</h2>
          <p className="text-sm text-neutral-500 mt-2">
            Coming soon
          </p>
        </div>
      </div>
    </div>
  );
}
