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
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-black via-neutral-900 to-black">
      <div className="w-[380px] rounded-2xl border border-neutral-800 bg-black/70 backdrop-blur-xl p-8 shadow-2xl">
        <h1 className="text-3xl font-semibold text-center mb-2">
          MeetMind
        </h1>
        <p className="text-center text-neutral-400 mb-8 text-sm">
          Multimodal Meeting Copilot
        </p>

        <button
          onClick={login}
          className="w-full flex items-center justify-center gap-3 bg-green-700 hover:bg-green-800 transition py-3 rounded-xl text-white font-medium"
        >
          Continue with Google
        </button>

        <p className="mt-6 text-xs text-neutral-500 text-center">
          Secure login · No spam · No ads
        </p>
      </div>
    </div>
  );
}
