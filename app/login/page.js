'use client';
import { signInWithPopup } from "firebase/auth";
import { auth, provider } from "@/lib/firebase";
import { useRouter } from "next/navigation";
import { Chrome } from "lucide-react";

export default function Login() {
  const router = useRouter();

  const handleLogin = async () => {
    try {
      await signInWithPopup(auth, provider);
      router.push('/dashboard');
    } catch (error) {
      console.error(error);
    }
  };

  return (
    <div className="h-screen w-full flex flex-col items-center justify-center bg-black relative overflow-hidden">
      {/* Background Gradient */}
      <div className="absolute top-[-20%] left-[-10%] w-125 h-125 bg-green-900/30 rounded-full blur-[120px]" />
      <div className="absolute bottom-[-20%] right-[-10%] w-125 h-125 bg-purple-900/20 rounded-full blur-[120px]" />

      <div className="z-10 flex flex-col items-center text-center space-y-8">
        <h1 className="text-6xl font-bold tracking-tighter">
          Turn data <br /> into <span className="text-transparent bg-clip-text bg-linear-to-r from-green-400 to-green-600">decisions</span>
        </h1>
        <p className="text-gray-400 max-w-md">
          Multimodal Meeting Copilot. Automated transcription, summarization, and action items powered by AI.
        </p>
        
        <button 
          onClick={handleLogin}
          className="flex items-center gap-3 px-8 py-4 bg-white text-black font-semibold rounded-full hover:bg-gray-200 transition-all transform hover:scale-105 shadow-[0_0_20px_rgba(255,255,255,0.3)]"
        >
          <Chrome size={24} />
          Continue with Google
        </button>
      </div>
    </div>
  );
}