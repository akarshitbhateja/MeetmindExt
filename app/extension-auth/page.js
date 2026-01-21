'use client';
import { useEffect, useState } from 'react';
import { auth, provider, signInWithPopup } from '@/lib/firebase';
import { onAuthStateChanged } from 'firebase/auth';

// ⚠️ REPLACE THIS WITH YOUR ACTUAL EXTENSION ID FROM STEP 1
const EXTENSION_ID = "bohacieageemelkifbaofkmobdfabidp"; 

export default function ExtensionAuth() {
  const [status, setStatus] = useState('Initializing...');

  useEffect(() => {
    // 1. Listen for Auth State
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (user) {
        sendUserToExtension(user);
      } else {
        setStatus('Please sign in...');
        // Auto-trigger login popup
        signInWithPopup(auth, provider)
          .then((result) => sendUserToExtension(result.user))
          .catch((error) => setStatus('Login Failed: ' + error.message));
      }
    });
    return () => unsubscribe();
  }, []);

  const sendUserToExtension = (user) => {
    setStatus('Sending login data to MeetMind...');
    
    if (chrome && chrome.runtime) {
      // Send the user info to the Chrome Extension
      chrome.runtime.sendMessage(EXTENSION_ID, {
        type: 'LOGIN_SUCCESS',
        user: {
          uid: user.uid,
          email: user.email,
          displayName: user.displayName,
          photoURL: user.photoURL
        }
      }, (response) => {
        if (!response || chrome.runtime.lastError) {
          // Fallback if the extension isn't listening right this second
          setStatus('Login Successful! You can close this tab and open the extension.');
        } else {
          setStatus('Success! You can close this tab.');
          window.close();
        }
      });
    } else {
      setStatus('Error: Not running in Chrome environment.');
    }
  };

  return (
    <div className="h-screen bg-black text-white flex flex-col items-center justify-center">
      <div className="p-8 border border-zinc-800 rounded-2xl bg-zinc-900 text-center">
        <h1 className="text-xl font-bold mb-4">MeetMind Extension Auth</h1>
        <p className="text-green-500 animate-pulse">{status}</p>
      </div>
    </div>
  );
}