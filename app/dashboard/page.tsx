"use client";

import { auth } from "@/lib/firebase";
import { useRouter } from "next/navigation";
import { signOut } from "firebase/auth";

export default function Dashboard() {
  const router = useRouter();

  const logout = async () => {
    await signOut(auth);
    router.push("/login");
  };

  return (
    <div className="p-8">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">Your Meetings</h1>
        <button onClick={logout} className="text-sm text-red-400">
          Logout
        </button>
      </div>

      <button
        onClick={() => router.push("/meetings/new")}
        className="mt-6 bg-green-700 px-6 py-3 rounded-lg"
      >
        Setup New Meeting
      </button>
    </div>
  );
}
