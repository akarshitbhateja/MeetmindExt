'use client';
import { signInWithPopup, GoogleAuthProvider } from "firebase/auth";
import { auth, provider } from "@/lib/firebase";
import { useRouter } from 'next/navigation';

export default function Login() {
  const router = useRouter();

  const handleLogin = async () => {
    try {
      const result = await signInWithPopup(auth, provider);
      
      const credential = GoogleAuthProvider.credentialFromResult(result);
      const token = credential.accessToken;

      // ✅ Save Token to LocalStorage (Persists even if browser closes)
      if (token) {
        localStorage.setItem('google_access_token', token);
      }

      router.push('/dashboard');
    } catch (error) {
      console.error("Login Failed:", error);
      alert("Login failed: " + error.message);
    }
  };

  return (
    <div className="h-screen w-full flex flex-col items-center justify-center bg-black relative overflow-hidden">
      <div className="absolute top-[-20%] left-[-10%] w-[500px] h-[500px] bg-green-900/30 rounded-full blur-[120px]" />
      <div className="absolute bottom-[-20%] right-[-10%] w-[500px] h-[500px] bg-purple-900/20 rounded-full blur-[120px]" />

      <div className="z-10 flex flex-col items-center text-center space-y-8">
        <h1 className="text-6xl font-bold tracking-tighter">
          Turn data <br /> into <span className="text-transparent bg-clip-text bg-gradient-to-r from-green-400 to-green-600">decisions</span>
        </h1>
        <p className="text-gray-400 max-w-md">
          Multimodal Meeting Copilot. Automated transcription, summarization, and action items powered by AI.
        </p>
        
        <button 
          onClick={handleLogin}
          className="flex items-center gap-3 px-8 py-4 bg-white text-black font-semibold rounded-full hover:bg-gray-200 transition-all transform hover:scale-105 shadow-[0_0_20px_rgba(255,255,255,0.3)]"
        >
          {/* ✅ Official Google SVG Icon */}
          <svg width="24" height="24" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
            <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
            <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
            <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
            <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
          </svg>
          Continue with Google
        </button>
      </div>
    </div>
  );
}