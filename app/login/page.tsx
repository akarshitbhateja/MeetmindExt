"use client";

import { useState } from "react";
import {
  signInWithEmailAndPassword,
  signInWithPopup,
  GoogleAuthProvider,
  sendPasswordResetEmail,
} from "firebase/auth";
import { auth } from "@/lib/firebase";
import { useRouter } from "next/navigation";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const login = async () => {
    await signInWithEmailAndPassword(auth, email, password);
  };

  const googleLogin = async () => {
    await signInWithPopup(auth, new GoogleAuthProvider());
  };

  const reset = async () => {
    if (!email) return;
    await sendPasswordResetEmail(auth, email);
  };

  return (
    <div className="app-bg min-h-screen flex items-center justify-center">
      <div className="card w-[420px] animate-fade">
        <h1 className="text-3xl font-semibold text-center mb-2">
          MeetMind
        </h1>
        <p className="text-sm text-neutral-400 text-center mb-6">
          Sign in to continue
        </p>

        <div className="space-y-4">
          <input
            className="input"
            placeholder="Email"
            onChange={(e) => setEmail(e.target.value)}
          />

          <input
            type="password"
            className="input"
            placeholder="Password"
            onChange={(e) => setPassword(e.target.value)}
          />

          <div className="flex justify-end text-sm text-neutral-400">
            <button
              type="button"
              onClick={reset}
              className="hover:text-green-400 transition"
            >
              Forgot password?
            </button>
          </div>

          {/* Primary Sign In */}
          <button
            onClick={login}
            className="btn-primary hover:brightness-110 transition"
          >
            Sign in
          </button>

          {/* Divider */}
          <div className="flex items-center gap-3 text-xs text-neutral-500">
            <div className="flex-1 h-px bg-neutral-800" />
            OR
            <div className="flex-1 h-px bg-neutral-800" />
          </div>

          {/* Google Button — NOW STYLED */}
          <button
            onClick={googleLogin}
            className="w-full px-4 py-3 rounded-[8px] border border-neutral-700
                       bg-[#070a07] text-white
                       hover:border-green-600 hover:bg-[#0a120a]
                       transition"
          >
            Continue with Google
          </button>

          <p className="text-sm text-center text-neutral-400 mt-4">
            Don’t have an account?{" "}
            <span
              onClick={() => router.push("/signup")}
              className="text-green-500 cursor-pointer hover:underline"
            >
              Sign up
            </span>
          </p>
        </div>
      </div>
    </div>
  );
}
