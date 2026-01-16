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
import Toast from "@/components/Toast";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [toast, setToast] = useState<null | {
    message: string;
    type: "success" | "error";
  }>(null);

  const loginEmail = async () => {
    try {
      await signInWithEmailAndPassword(auth, email, password);
      setToast({ message: "Welcome back", type: "success" });
      setTimeout(() => router.push("/dashboard"), 700);
    } catch (e: any) {
      setToast({ message: e.message, type: "error" });
    }
  };

  const loginGoogle = async () => {
    try {
      await signInWithPopup(auth, new GoogleAuthProvider());
      setToast({ message: "Signed in successfully", type: "success" });
      setTimeout(() => router.push("/dashboard"), 700);
    } catch (e: any) {
      setToast({ message: e.message, type: "error" });
    }
  };

  const resetPassword = async () => {
    if (!email) {
      setToast({ message: "Enter email first", type: "error" });
      return;
    }
    await sendPasswordResetEmail(auth, email);
    setToast({ message: "Reset email sent", type: "success" });
  };

  return (
    <div className="min-h-screen flex items-center justify-center">
      {toast && (
        <Toast
          message={toast.message}
          type={toast.type}
          onClose={() => setToast(null)}
        />
      )}

      <div className="card w-[420px] p-8 animate-fade">
        <h1 className="text-3xl font-semibold text-center mb-1">MeetMind</h1>
        <p className="text-sm text-neutral-400 text-center mb-8">
          Sign in to continue
        </p>

        <div className="space-y-4">
          <input
            className="input w-full"
            placeholder="Email"
            onChange={(e) => setEmail(e.target.value)}
          />

          <input
            type="password"
            className="input w-full"
            placeholder="Password"
            onChange={(e) => setPassword(e.target.value)}
          />

          <div className="text-right text-sm text-neutral-400">
            <button onClick={resetPassword} className="hover:text-green-400">
              Forgot password?
            </button>
          </div>

          <button onClick={loginEmail} className="btn-primary w-full">
            Sign in
          </button>

          <div className="flex items-center gap-3 text-xs text-neutral-500">
            <div className="flex-1 h-px bg-neutral-800" />
            OR
            <div className="flex-1 h-px bg-neutral-800" />
          </div>

          <button
            onClick={loginGoogle}
            className="w-full border border-neutral-800 rounded-lg py-3 hover:border-green-600 transition"
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
