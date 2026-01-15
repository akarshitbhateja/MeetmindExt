"use client";

import { auth } from "@/lib/firebase";
import { GoogleAuthProvider, signInWithPopup } from "firebase/auth";
import { useRouter } from "next/navigation";

export default function LoginPage() {
  const router = useRouter();

  const login = async () => {
    const provider = new GoogleAuthProvider();
    await signInWithPopup(auth, provider);
    router.push("/dashboard");
  };

  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="bg-white text-black p-8 rounded-xl w-[360px]">
        <h1 className="text-2xl font-bold mb-6 text-center">MeetMind</h1>
        <button
          onClick={login}
          className="w-full bg-green-700 text-white py-3 rounded-lg hover:bg-green-800"
        >
          Sign in with Google
        </button>
      </div>
    </div>
  );
}
