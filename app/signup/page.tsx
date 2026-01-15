"use client";

import { useState } from "react";
import { createUserWithEmailAndPassword } from "firebase/auth";
import { auth } from "@/lib/firebase";
import { useRouter } from "next/navigation";
import Toast from "@/components/Toast";

export default function SignupPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [toast, setToast] = useState<null | {
    message: string;
    type: "success" | "error";
  }>(null);

  const signup = async () => {
    try {
      await createUserWithEmailAndPassword(auth, email, password);
      setToast({ message: "Account created", type: "success" });
      setTimeout(() => router.push("/dashboard"), 700);
    } catch (err: any) {
      setToast({ message: err.message, type: "error" });
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-black">
      {toast && (
        <Toast
          message={toast.message}
          type={toast.type}
          onClose={() => setToast(null)}
        />
      )}

      <div className="w-[380px] border border-neutral-800 bg-neutral-900/60 p-8 rounded-xl animate-fade-up">
        <h1 className="text-3xl font-semibold text-center mb-6">
          Create account
        </h1>

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

          <button
            onClick={signup}
            className="w-full bg-green-700 hover:bg-green-800 transition py-3 rounded-lg font-medium"
          >
            Sign up
          </button>

          <p className="text-sm text-center text-neutral-400">
            Already have an account?{" "}
            <span
              onClick={() => router.push("/login")}
              className="text-green-500 cursor-pointer"
            >
              Sign in
            </span>
          </p>
        </div>
      </div>
    </div>
  );
}
