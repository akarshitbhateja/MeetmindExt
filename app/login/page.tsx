"use client";

import { useState } from "react";
import {
  GoogleAuthProvider,
  signInWithPopup,
  signInWithEmailAndPassword,
  sendPasswordResetEmail,
} from "firebase/auth";
import { auth } from "@/lib/firebase";
import { useRouter } from "next/navigation";
import Toast from "@/components/Toast";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [toast, setToast] = useState<null | {
    message: string;
    type: "success" | "error";
  }>(null);

  const loginWithEmail = async () => {
    try {
      await signInWithEmailAndPassword(auth, email, password);
      setToast({ message: "Welcome back", type: "success" });
      setTimeout(() => router.push("/dashboard"), 700);
    } catch (err: any) {
      setToast({ message: err.message, type: "error" });
    }
  };

  const loginWithGoogle = async () => {
    try {
      const provider = new GoogleAuthProvider();
      await signInWithPopup(auth, provider);
      setToast({ message: "Signed in successfully", type: "success" });
      setTimeout(() => router.push("/dashboard"), 700);
    } catch (err: any) {
      setToast({ message: err.message, type: "error" });
    }
  };

  const resetPassword = async () => {
    if (!email) {
      setToast({ message: "Enter email to reset password", type: "error" });
      return;
    }
    await sendPasswordResetEmail(auth, email);
    setToast({ message: "Password reset email sent", type: "success" });
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-black via-neutral-900 to-black">
      {toast && (
        <Toast
          message={toast.message}
          type={toast.type}
          onClose={() => setToast(null)}
        />
      )}

      <div className="w-[380px] border border-neutral-800 bg-neutral-900/60 backdrop-blur-xl p-8 rounded-xl animate-fade-up">
        <h1 className="text-3xl font-semibold text-center mb-1">MeetMind</h1>
        <p className="text-center text-neutral-400 mb-7 text-sm">
          Sign in to your workspace
        </p>

        <div className="space-y-4">
          <input
            type="email"
            placeholder="Email"
            className="w-full p-3 rounded-lg bg-black border border-neutral-800 focus:border-green-700 outline-none"
            onChange={(e) => setEmail(e.target.value)}
          />

          <input
            type="password"
            placeholder="Password"
            className="w-full p-3 rounded-lg bg-black border border-neutral-800 focus:border-green-700 outline-none"
            onChange={(e) => setPassword(e.target.value)}
          />

          <div className="flex justify-end text-sm text-neutral-400">
            <button onClick={resetPassword} className="hover:text-green-400">
              Forgot password?
            </button>
          </div>

          <button
            onClick={loginWithEmail}
            className="w-full bg-green-700 hover:bg-green-800 transition py-3 rounded-lg font-medium"
          >
            Sign in
          </button>

          <div className="flex items-center gap-3 text-neutral-500 text-xs">
            <div className="flex-1 h-px bg-neutral-800" />
            OR
            <div className="flex-1 h-px bg-neutral-800" />
          </div>

          <button
            onClick={loginWithGoogle}
            className="w-full border border-neutral-800 py-3 rounded-lg hover:border-green-700 transition"
          >
            Continue with Google
          </button>

          <p className="text-sm text-center text-neutral-400 mt-4">
            Don’t have an account?{" "}
            <span
              onClick={() => router.push("/signup")}
              className="text-green-500 cursor-pointer"
            >
              Sign up
            </span>
          </p>
        </div>
      </div>
    </div>
  );
}
