'use client';
import { useState, useEffect } from 'react';
import { auth } from '@/lib/firebase';
import { onAuthStateChanged, signOut } from 'firebase/auth';
import { useRouter } from 'next/navigation';
import axios from 'axios';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Plus, Calendar, Clock, Users, FileText, 
  Upload, CheckCircle2, MoreHorizontal, LogOut, 
  PlayCircle, X
} from 'lucide-react';

export default function Dashboard() {
  const [user, setUser] = useState(null);
  const [meetings, setMeetings] = useState([]);
  const [view, setView] = useState('list'); // 'list', 'create', 'detail'
  const [loading, setLoading] = useState(true);

  // Wizard State
  const [step, setStep] = useState(1);
  const [showShareModal, setShowShareModal] = useState(false);
  const [shareOptions, setShareOptions] = useState({ video: true, notes: true, ppt: true });

  // Form Data
  const [formData, setFormData] = useState({
    title: '', 
    startTime: '', 
    endTime: '', 
    description: '', 
    attendees: '', 
    pptUrl: '', 
    polls: []
  });

  const [pollQuestion, setPollQuestion] = useState('');
  const [pollOptions, setPollOptions] = useState(['', '']);
  const [audioFile, setAudioFile] = useState(null);
  const [pptFile, setPptFile] = useState(null);
  const [transcription, setTranscription] = useState('');
  const [summary, setSummary] = useState('');
  const [currentMeetingId, setCurrentMeetingId] = useState(null);

  const router = useRouter();

  // Auth & Initial Fetch
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      if (!currentUser) {
        router.push('/login');
      } else {
        console.log("👤 User Logged In:", currentUser.uid);
        setUser(currentUser);
        fetchMeetings(currentUser.uid);
      }
    });
    return () => unsubscribe();
  }, [router]);

  const fetchMeetings = async (uid) => {
    try {
      const res = await axios.get(`/api/meetings?userId=${uid}`);
      setMeetings(res.data.data);
      setLoading(false);
    } catch (error) {
      console.error("❌ Fetch Error:", error);
      setLoading(false);
    }
  };

  const handleSignOut = async () => {
    await signOut(auth);
    router.push('/login');
  };

  // --- Wizard Actions ---

  const handleNextStep1 = async () => {
    // 1. Validation
    if (!formData.title || !formData.startTime || !formData.endTime) {
      alert("Please fill in Title, Start Time, and End Time.");
      return;
    }

    if (!user || !user.uid) {
      alert("User authentication error. Please reload.");
      return;
    }

    // 2. Prepare Payload
    const payload = { ...formData, userId: user.uid };
    console.log("📤 Sending Payload:", payload);

    try {
      if (!currentMeetingId) {
        // CREATE NEW
        const res = await axios.post('/api/meetings', payload);
        console.log("✅ Meeting Created:", res.data);
        setCurrentMeetingId(res.data.data._id);
        
        // Trigger Pabbly Webhook (Safe Mode)
        try {
           if(process.env.NEXT_PUBLIC_PABBLY_PRE_MEETING_WEBHOOK) {
             await axios.post(process.env.NEXT_PUBLIC_PABBLY_PRE_MEETING_WEBHOOK, {
               ...payload, userEmail: user.email, meetingId: res.data.data._id
             });
           }
        } catch(e) { console.warn("Webhook failed (ignoring):", e.message); }

      } else {
        // UPDATE EXISTING
        await axios.put('/api/meetings', { id: currentMeetingId, ...payload });
      }
      setStep(2);
    } catch (error) {
      // 3. Enhanced Error Handling
      console.error("❌ Save Error:", error);
      const serverError = error.response?.data?.error || error.message;
      const details = error.response?.data?.details || "";
      alert(`Failed to save: ${serverError}\n${JSON.stringify(details)}`);
    }
  };

  const handleAddPoll = () => {
    if(!pollQuestion) return;
    const newPoll = { question: pollQuestion, options: pollOptions.filter(o => o !== '') };
    setFormData({ ...formData, polls: [...formData.polls, newPoll] });
    setPollQuestion('');
    setPollOptions(['', '']);
  };

  const handleNextStep2 = async () => {
    try {
      if (currentMeetingId) {
        await axios.put('/api/meetings', { 
          id: currentMeetingId, 
          polls: formData.polls,
          pptUrl: pptFile ? "uploaded_dummy_url.pdf" : "" 
        });
      }
      setStep(3);
    } catch (error) {
      console.error("Step 2 Error:", error);
    }
  };

  const handleProcessAudio = async () => {
    if (!audioFile) return alert("Please upload an audio file first.");
    setLoading(true);
    try {
      const data = new FormData();
      data.append("file", audioFile);
      data.append("task", "transcribe");
      
      const transRes = await axios.post('/api/groq/process', data);
      setTranscription(transRes.data.text);

      const sumData = new FormData();
      sumData.append("task", "summarize");
      sumData.append("text", transRes.data.text);
      
      const sumRes = await axios.post('/api/groq/process', sumData);
      setSummary(sumRes.data.summary);

      await axios.put('/api/meetings', { 
        id: currentMeetingId, 
        transcription: transRes.data.text, 
        summary: sumRes.data.summary,
        status: 'completed'
      });

      setLoading(false);
      setShowShareModal(true);
    } catch (err) {
      console.error(err);
      setLoading(false);
      alert("AI Processing Failed. Check console for details.");
    }
  };

  const handleFinalFinish = async () => {
    try {
      if(process.env.NEXT_PUBLIC_PABBLY_POST_MEETING_WEBHOOK) {
        await axios.post(process.env.NEXT_PUBLIC_PABBLY_POST_MEETING_WEBHOOK, {
          meetingId: currentMeetingId,
          summary: shareOptions.notes ? summary : '',
          transcription: shareOptions.notes ? transcription : '',
          attendees: formData.attendees,
          includeVideo: shareOptions.video,
          includePPT: shareOptions.ppt
        });
      }
    } catch(e) { console.warn("Post webhook failed"); }

    setShowShareModal(false);
    setView('list');
    setStep(1);
    fetchMeetings(user.uid);
  };

  if (!user) return <div className="bg-black h-screen flex items-center justify-center text-white">Loading...</div>;

  return (
    <div className="min-h-screen bg-black text-white font-sans selection:bg-green-500 selection:text-white">
      
      {/* Navbar */}
      <nav className="border-b border-white/10 px-8 py-4 flex justify-between items-center bg-zinc-950">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-gradient-to-tr from-green-400 to-green-600 rounded-lg flex items-center justify-center font-bold text-black">M</div>
          <span className="font-bold text-lg tracking-tight">MeetMind</span>
        </div>
        <div className="flex items-center gap-4">
          <span className="text-sm text-gray-400">{user.email}</span>
          <button onClick={handleSignOut} className="text-xs border border-zinc-700 px-3 py-1.5 rounded hover:bg-zinc-800 transition">Sign Out</button>
        </div>
      </nav>

      <main className="p-8 max-w-7xl mx-auto">
        
        {/* VIEW: LIST */}
        {view === 'list' && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-8">
            <div className="flex justify-between items-end">
              <div>
                <h1 className="text-4xl font-bold mb-2">Meetings</h1>
                <p className="text-gray-400">Manage and track all your meetings</p>
              </div>
              <button 
                onClick={() => { setView('create'); setStep(1); setFormData({title:'', startTime:'', endTime:'', description:'', attendees:'', polls:[]}); setCurrentMeetingId(null); }}
                className="bg-green-600 hover:bg-green-500 text-black font-semibold px-6 py-3 rounded-lg flex items-center gap-2 transition-transform hover:scale-105"
              >
                <Plus size={20}/> New Meeting
              </button>
            </div>

            <div className="grid gap-4">
              {meetings.map((m) => (
                <div key={m._id} className="bg-zinc-900/50 border border-white/10 p-5 rounded-xl flex items-center justify-between hover:border-green-500/30 transition-colors group">
                  <div className="flex gap-4 items-center">
                     <div className="w-12 h-12 bg-zinc-800 rounded-full flex items-center justify-center font-bold text-gray-400 group-hover:text-green-400 group-hover:bg-zinc-800/80 transition-all">
                        {m.title ? m.title.charAt(0).toUpperCase() : 'M'}
                     </div>
                     <div>
                        <h3 className="font-bold text-lg">{m.title}</h3>
                        <p className="text-sm text-gray-500 flex items-center gap-2">
                           {m.startTime ? new Date(m.startTime).toLocaleString() : m.date}
                        </p>
                     </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="px-3 py-1 bg-zinc-800 rounded text-xs text-gray-300 flex items-center gap-2">
                      <Users size={14}/> {m.attendees ? m.attendees.split(',').length : 0} Attendees
                    </div>
                  </div>
                </div>
              ))}
              {meetings.length === 0 && !loading && (
                <div className="text-center py-20 text-gray-500">No meetings found. Create one to get started.</div>
              )}
            </div>
          </motion.div>
        )}

        {/* VIEW: CREATE WIZARD */}
        {view === 'create' && (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="max-w-3xl mx-auto">
            
            <div className="mb-8 text-center">
              <h2 className="text-3xl font-bold mb-2">Create Your Meeting</h2>
              <p className="text-gray-400">Follow the steps...</p>
            </div>

            {/* Stepper */}
            <div className="flex justify-between items-center mb-10 px-10 relative">
               <div className="absolute top-1/2 left-0 w-full h-0.5 bg-zinc-800 -z-10"></div>
               <StepBadge num={1} label="Pre-Meeting Details" active={step === 1} done={step > 1} />
               <StepBadge num={2} label="Meeting Assets" active={step === 2} done={step > 2} />
               <StepBadge num={3} label="Final Setup" active={step === 3} done={step > 3} />
            </div>

            <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-8 shadow-2xl">
              
              {/* STEP 1: PRE-MEETING */}
              {step === 1 && (
                <div className="space-y-6 animate-in fade-in">
                  <h3 className="text-xl font-bold border-b border-zinc-800 pb-4 mb-4">Pre-Meeting Details</h3>
                  
                  <div>
                    <label className="block text-xs text-gray-400 mb-1 ml-1">Meeting Title *</label>
                    <input 
                      className="w-full bg-black border border-zinc-700 rounded-lg p-3 focus:border-green-500 focus:ring-1 focus:ring-green-500 outline-none transition"
                      placeholder="e.g. Q4 Strategy Review"
                      value={formData.title} onChange={e => setFormData({...formData, title: e.target.value})}
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs text-gray-400 mb-1 ml-1">Start Time *</label>
                      <input 
                        type="datetime-local"
                        className="w-full bg-black border border-zinc-700 rounded-lg p-3 text-sm focus:border-green-500 outline-none"
                        value={formData.startTime} onChange={e => setFormData({...formData, startTime: e.target.value})}
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-gray-400 mb-1 ml-1">End Time *</label>
                      <input 
                        type="datetime-local"
                        className="w-full bg-black border border-zinc-700 rounded-lg p-3 text-sm focus:border-green-500 outline-none"
                        value={formData.endTime} onChange={e => setFormData({...formData, endTime: e.target.value})}
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs text-gray-400 mb-1 ml-1">Description</label>
                    <textarea 
                      rows={3}
                      className="w-full bg-black border border-zinc-700 rounded-lg p-3 focus:border-green-500 outline-none transition"
                      placeholder="Meeting agenda and goals..."
                      value={formData.description} onChange={e => setFormData({...formData, description: e.target.value})}
                    />
                  </div>

                  <div>
                    <label className="block text-xs text-gray-400 mb-1 ml-1">Attendee Emails *</label>
                    <input 
                      className="w-full bg-black border border-zinc-700 rounded-lg p-3 focus:border-green-500 outline-none transition"
                      placeholder="Enter emails separated by commas"
                      value={formData.attendees} onChange={e => setFormData({...formData, attendees: e.target.value})}
                    />
                  </div>

                  <div className="flex justify-end pt-4">
                    <button onClick={handleNextStep1} className="bg-green-600 hover:bg-green-500 text-black font-bold px-8 py-3 rounded-lg">Next &gt;</button>
                  </div>
                </div>
              )}

              {/* STEP 2: ASSETS */}
              {step === 2 && (
                <div className="space-y-8 animate-in fade-in">
                   <h3 className="text-xl font-bold border-b border-zinc-800 pb-4">Meeting Assets</h3>
                   
                   <div>
                      <label className="block text-sm text-gray-400 mb-2">Presentation</label>
                      <div className="border border-dashed border-zinc-700 rounded-lg p-6 bg-black/40 hover:bg-zinc-900 transition-colors cursor-pointer flex flex-col items-center">
                         <input type="file" className="hidden" id="ppt-upload" onChange={e => setPptFile(e.target.files[0])} />
                         <label htmlFor="ppt-upload" className="cursor-pointer flex flex-col items-center">
                            <Upload className="text-green-500 mb-2" size={24}/>
                            <span className="text-sm font-medium">{pptFile ? pptFile.name : "Upload File (PDF/PPT)"}</span>
                         </label>
                      </div>
                   </div>

                   <div>
                      <label className="block text-sm text-gray-400 mb-2">Polls</label>
                      <div className="bg-black/40 border border-zinc-700 rounded-lg p-4">
                         <input 
                            className="w-full bg-zinc-900 border border-zinc-800 rounded p-2 text-sm mb-3" 
                            placeholder="Poll Question"
                            value={pollQuestion} onChange={e => setPollQuestion(e.target.value)}
                         />
                         {pollOptions.map((opt, i) => (
                           <input 
                             key={i}
                             className="w-full bg-zinc-900 border border-zinc-800 rounded p-2 text-sm mb-2"
                             placeholder={`Option ${i+1}`}
                             value={opt}
                             onChange={e => {
                               const newOpts = [...pollOptions];
                               newOpts[i] = e.target.value;
                               setPollOptions(newOpts);
                             }}
                           />
                         ))}
                         <button onClick={() => setPollOptions([...pollOptions, ''])} className="text-xs text-green-500 hover:underline mb-4">+ Add Option</button>
                         <button onClick={handleAddPoll} className="w-full bg-zinc-800 hover:bg-zinc-700 text-white py-2 rounded text-sm flex items-center justify-center gap-2">
                           <Plus size={16}/> Add Poll
                         </button>
                      </div>
                      {formData.polls.length > 0 && (
                        <div className="mt-4 space-y-2">
                          {formData.polls.map((p, i) => (
                            <div key={i} className="flex justify-between items-center bg-zinc-900 px-4 py-2 rounded text-sm">
                               <span>{p.question}</span>
                               <span className="text-zinc-500 text-xs">{p.options.length} options</span>
                            </div>
                          ))}
                        </div>
                      )}
                   </div>

                   <div className="flex justify-between pt-4">
                    <button onClick={() => setStep(1)} className="text-gray-400 hover:text-white">&lt; Back</button>
                    <button onClick={handleNextStep2} className="bg-green-600 hover:bg-green-500 text-black font-bold px-8 py-3 rounded-lg">Next &gt;</button>
                  </div>
                </div>
              )}

              {/* STEP 3: FINAL SETUP */}
              {step === 3 && (
                <div className="space-y-6 animate-in fade-in">
                   <h3 className="text-xl font-bold border-b border-zinc-800 pb-4">Post-Meeting AI Assistant</h3>
                   <div className="border border-zinc-700 rounded-lg p-8 bg-black/40 flex flex-col items-center justify-center">
                      <input 
                        type="file" 
                        accept="audio/*"
                        onChange={e => setAudioFile(e.target.files[0])}
                        className="mb-4 text-sm text-gray-400"
                      />
                      <button 
                        onClick={handleProcessAudio}
                        disabled={loading}
                        className="bg-white text-black font-bold px-6 py-3 rounded-lg flex items-center gap-2 hover:bg-gray-200 disabled:opacity-50"
                      >
                         {loading ? 'Processing...' : (
                           <><PlayCircle size={18}/> Generate Transcript & Summary</>
                         )}
                      </button>
                   </div>
                   <div className="flex justify-between pt-4">
                    <button onClick={() => setStep(2)} className="text-gray-400 hover:text-white">&lt; Back</button>
                    <button onClick={() => setShowShareModal(true)} className="bg-green-600 hover:bg-green-500 text-black font-bold px-8 py-3 rounded-lg">Finish Setup &gt;</button>
                  </div>
                </div>
              )}

            </div>
          </motion.div>
        )}

      </main>

      {/* SHARE MODAL */}
      <AnimatePresence>
        {showShareModal && (
          <motion.div 
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4"
          >
            <div className="bg-zinc-900 border border-zinc-700 rounded-2xl w-full max-w-md p-6 shadow-2xl relative">
              <button onClick={() => setShowShareModal(false)} className="absolute top-4 right-4 text-gray-500 hover:text-white"><X size={20}/></button>
              <div className="flex flex-col items-center mb-6">
                <div className="w-12 h-12 bg-green-500 rounded-full flex items-center justify-center mb-4"><CheckCircle2 size={28} className="text-black"/></div>
                <h3 className="text-xl font-bold">Share Meeting Assets</h3>
              </div>
              <div className="space-y-3 mb-8">
                 <label className="flex items-center gap-3 bg-black/50 p-3 rounded-lg border border-zinc-800 cursor-pointer hover:border-green-500/50 transition">
                    <input type="checkbox" checked={shareOptions.video} onChange={e => setShareOptions({...shareOptions, video: e.target.checked})} className="accent-green-500 w-5 h-5" />
                    <span className="font-medium">Recording Video</span>
                 </label>
                 <label className="flex items-center gap-3 bg-black/50 p-3 rounded-lg border border-zinc-800 cursor-pointer hover:border-green-500/50 transition">
                    <input type="checkbox" checked={shareOptions.notes} onChange={e => setShareOptions({...shareOptions, notes: e.target.checked})} className="accent-green-500 w-5 h-5" />
                    <span className="font-medium">AI Notes & Summary</span>
                 </label>
                 <label className="flex items-center gap-3 bg-black/50 p-3 rounded-lg border border-zinc-800 cursor-pointer hover:border-green-500/50 transition">
                    <input type="checkbox" checked={shareOptions.ppt} onChange={e => setShareOptions({...shareOptions, ppt: e.target.checked})} className="accent-green-500 w-5 h-5" />
                    <span className="font-medium">Presentation (PPT)</span>
                 </label>
              </div>
              <button onClick={handleFinalFinish} className="w-full bg-green-600 hover:bg-green-500 text-black font-bold py-3 rounded-lg">Share & Done</button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

    </div>
  );
}

// Subcomponent for Stepper
function StepBadge({ num, label, active, done }) {
  return (
    <div className="flex flex-col items-center z-10">
       <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm border-2 mb-2 transition-colors ${
          active ? 'bg-green-500 border-green-500 text-black' : 
          done ? 'bg-green-900 border-green-600 text-green-400' : 
          'bg-black border-zinc-700 text-zinc-500'
       }`}>
          {done ? <CheckCircle2 size={16}/> : num}
       </div>
       <span className={`text-xs font-semibold ${active ? 'text-white' : 'text-gray-600'}`}>{label}</span>
    </div>
  )
}