"use client";

import { useState } from "react";
import { signInWithEmailAndPassword } from "firebase/auth";
import { auth } from "@/lib/firebase";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const login = async () => {
    await signInWithEmailAndPassword(auth, email, password);
  };

  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="card w-[420px] p-8 animate-fade">
        <h1 className="text-3xl font-semibold mb-2 text-center">
          MeetMind
        </h1>
        <p className="text-sm text-neutral-400 mb-8 text-center">
          Sign in to continue
        </p>

        <div className="space-y-4">
          <input
            className="input w-full"
            placeholder="Email"
            onChange={(e) => setEmail(e.target.value)}
          />

          <input
            className="input w-full"
            placeholder="Password"
            type="password"
            onChange={(e) => setPassword(e.target.value)}
          />

          <button onClick={login} className="btn-primary w-full">
            Sign in
          </button>
        </div>
      </div>
    </div>
  );
}
