'use client';
import { useState, useEffect } from 'react';
import { auth, provider, signInWithPopup, GoogleAuthProvider } from '@/lib/firebase';
import { onAuthStateChanged, signOut } from 'firebase/auth';
import { useRouter } from 'next/navigation';
import axios from 'axios';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Plus, Calendar, Clock, Users, FileText, 
  Upload, CheckCircle2, MoreHorizontal, LogOut, 
  Trash2, PlayCircle, Share2, X, Link as LinkIcon, Mic, Copy
} from 'lucide-react';

export default function Dashboard() {
  const [user, setUser] = useState(null);
  const [meetings, setMeetings] = useState([]);
  const [view, setView] = useState('list'); 
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

  // --- 1. Authentication & Data Fetching ---
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      if (!currentUser) {
        router.push('/login');
      } else {
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
      console.error("Fetch error:", error);
      setLoading(false);
    }
  };

  const handleSignOut = async () => {
    sessionStorage.removeItem('google_access_token');
    await signOut(auth);
    router.push('/login');
  };

  const copyToClipboard = (text, e) => {
    e.stopPropagation(); 
    navigator.clipboard.writeText(text);
    alert("Meeting Link Copied!");
  };

  // Helper to check if meeting is over
  const isMeetingCompleted = (endTimeStr) => {
    if (!endTimeStr) return false;
    const end = new Date(endTimeStr);
    const now = new Date();
    return now > end;
  };

  // --- 2. Google Calendar Logic ---
  const createGoogleCalendarEvent = async (meetingData) => {
    let token = sessionStorage.getItem('google_access_token');

    if (!token) {
      try {
        console.log("🔄 Token missing, re-authenticating...");
        const result = await signInWithPopup(auth, provider);
        const credential = GoogleAuthProvider.credentialFromResult(result);
        token = credential.accessToken;
        sessionStorage.setItem('google_access_token', token);
      } catch (e) {
        console.error("Auth failed", e);
        alert("We need to connect to Google Calendar to schedule this.");
        return null;
      }
    }

    const userTimeZone = Intl.DateTimeFormat().resolvedOptions().timeZone;

    const event = {
      summary: meetingData.title,
      description: `${meetingData.description}\n\n--\nScheduled via MeetMind Copilot`,
      start: {
        dateTime: meetingData.startTime + ":00", 
        timeZone: userTimeZone,
      },
      end: {
        dateTime: meetingData.endTime + ":00",
        timeZone: userTimeZone,
      },
      attendees: meetingData.attendees.split(',').map(email => ({ email: email.trim() })),
      reminders: {
        useDefault: false,
        overrides: [
          { method: 'email', minutes: 30 },
          { method: 'popup', minutes: 10 }
        ],
      },
      conferenceData: {
        createRequest: { requestId: Math.random().toString(36).substring(7) }
      }
    };

    try {
      const response = await fetch(
        `https://www.googleapis.com/calendar/v3/calendars/primary/events?conferenceDataVersion=1&sendUpdates=all`, 
        {
          method: "POST",
          headers: {
            "Authorization": `Bearer ${token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify(event),
        }
      );

      const data = await response.json();
      if (data.error) throw new Error(data.error.message);
      
      console.log("📅 Event Created:", data.htmlLink);
      return data.htmlLink;

    } catch (error) {
      console.error("Calendar API Error:", error);
      alert("Failed to schedule: " + error.message);
      return null;
    }
  };

  // --- 3. Wizard Steps ---
  const handleNextStep1 = async () => {
    if (!formData.title || !formData.startTime || !formData.endTime) {
      alert("Please fill in the required fields.");
      return;
    }

    try {
      setLoading(true);
      const calendarLink = await createGoogleCalendarEvent(formData);
      if (!calendarLink) { setLoading(false); return; }

      const meetingData = { 
        ...formData, 
        userId: user.uid,
        meetingLink: calendarLink
      };

      if (!currentMeetingId) {
        const res = await axios.post('/api/meetings', meetingData);
        setCurrentMeetingId(res.data.data._id);
      } else {
        await axios.put('/api/meetings', { id: currentMeetingId, ...meetingData });
      }

      setLoading(false);
      setStep(2);
    } catch (error) {
      console.error(error);
      setLoading(false);
      alert("Failed to save meeting details.");
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
    if (currentMeetingId) {
      await axios.put('/api/meetings', { id: currentMeetingId, polls: formData.polls, pptUrl: pptFile ? "uploaded.pdf" : "" });
    }
    setStep(3);
  };

  const handleProcessAudio = async () => {
    if (!audioFile) return alert("Please upload an audio file first.");
    setLoading(true);
    try {
      const data = new FormData();
      data.append("file", audioFile);
      data.append("task", "transcribe");
      
      const transRes = await axios.post('/api/groq/process', data);
      if(!transRes.data.success && transRes.data.error) throw new Error(transRes.data.error);
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
        status: 'completed' // Still save status for backup
      });

      setLoading(false);
      setShowShareModal(true); 
    } catch (err) {
      console.error(err);
      setLoading(false);
      alert("AI Processing Failed: " + (err.message || "Unknown Error"));
    }
  };

  const handleFinalFinish = async () => {
    if (process.env.NEXT_PUBLIC_PABBLY_POST_MEETING_WEBHOOK) {
      try {
        await axios.post(process.env.NEXT_PUBLIC_PABBLY_POST_MEETING_WEBHOOK, {
          meetingId: currentMeetingId,
          title: formData.title,
          summary: shareOptions.notes ? summary : '',
          transcription: shareOptions.notes ? transcription : '',
          attendees: formData.attendees,
          includeVideo: shareOptions.video,
          includePPT: shareOptions.ppt
        });
        alert("Assets shared with attendees!");
      } catch(e) { console.log("Post webhook skipped"); }
    }
    setShowShareModal(false);
    setView('list');
    setStep(1);
    fetchMeetings(user.uid);
  };

  if (!user) return <div className="bg-black h-screen flex items-center justify-center text-white">Loading...</div>;

  return (
    <div className="min-h-screen bg-black text-white font-sans selection:bg-green-500 selection:text-white flex flex-col">
      
      {/* 🟢 FIXED NAVBAR */}
      <nav className="border-b border-white/10 px-8 py-4 flex justify-between items-center bg-zinc-950 sticky top-0 z-50 shadow-md">
        <div className="flex items-center gap-2 cursor-pointer hover:opacity-80 transition" onClick={() => { setView('list'); setStep(1); }}>
          <div className="w-8 h-8 bg-gradient-to-tr from-green-400 to-green-600 rounded-lg flex items-center justify-center font-bold text-black">M</div>
          <span className="font-bold text-lg tracking-tight">MeetMind</span>
        </div>
        <div className="flex items-center gap-4">
          <span className="text-sm text-gray-400 hidden md:block">{user.email}</span>
          <button onClick={handleSignOut} className="text-xs border border-zinc-700 px-3 py-1.5 rounded hover:bg-zinc-800 transition flex items-center gap-2">
            <LogOut size={12} /> Sign Out
          </button>
        </div>
      </nav>

      <main className="flex-1 p-8 max-w-7xl mx-auto w-full">
        
        {/* VIEW: LIST */}
        {view === 'list' && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-8">
            <div className="flex justify-between items-end">
              <div>
                <h1 className="text-4xl font-bold mb-2">Meetings</h1>
                <p className="text-gray-400">Manage your schedule and AI insights.</p>
              </div>
              <button 
                onClick={() => { 
                  setView('create'); 
                  setStep(1); 
                  setFormData({title:'', startTime:'', endTime:'', description:'', attendees:'', polls:[]}); 
                  setCurrentMeetingId(null); 
                  setTranscription('');
                  setSummary('');
                }}
                className="bg-green-600 hover:bg-green-500 text-black font-semibold px-6 py-3 rounded-lg flex items-center gap-2 transition-transform hover:scale-105"
              >
                <Plus size={20}/> New Meeting
              </button>
            </div>

            <div className="grid gap-4">
              {meetings.map((m) => (
                <div key={m._id} 
                  onClick={() => {
                    setFormData(m);
                    setCurrentMeetingId(m._id);
                    setTranscription(m.transcription || '');
                    setSummary(m.summary || '');
                    setView('detail');
                  }}
                  className="bg-zinc-900/50 border border-white/10 p-5 rounded-xl flex items-center justify-between hover:border-green-500/30 transition-colors cursor-pointer group"
                >
                  <div className="flex gap-4 items-center">
                     <div className="w-12 h-12 bg-zinc-800 rounded-full flex items-center justify-center font-bold text-gray-400 group-hover:text-green-400 group-hover:bg-zinc-800/80 transition-all border border-white/5">
                        {m.title.charAt(0).toUpperCase()}
                     </div>
                     <div>
                        <h3 className="font-bold text-lg group-hover:text-green-400 transition-colors">{m.title}</h3>
                        <p className="text-sm text-gray-500 flex items-center gap-2">
                           <Calendar size={14} />
                           {m.startTime ? new Date(m.startTime).toLocaleString() : m.date}
                        </p>
                     </div>
                  </div>
                  
                  <div className="flex items-center gap-4">
                    {/* ✅ STATUS LOGIC: Show Completed if End Time Passed */}
                    {isMeetingCompleted(m.endTime) ? (
                      <span className="px-3 py-1 bg-green-900/20 text-green-500 text-xs font-semibold rounded border border-green-900/30 flex items-center gap-1">
                        <CheckCircle2 size={12}/> Completed
                      </span>
                    ) : (
                      <span className="px-3 py-1 bg-zinc-800 text-gray-300 text-xs rounded border border-zinc-700 flex items-center gap-2">
                        <Users size={12}/> {m.attendees ? m.attendees.split(',').length : 0} Attendees
                      </span>
                    )}

                    {/* COPY LINK ICON */}
                    {m.meetingLink && (
                      <button 
                        onClick={(e) => copyToClipboard(m.meetingLink, e)}
                        className="p-2 bg-zinc-800 hover:bg-zinc-700 rounded-full text-gray-400 hover:text-white transition-colors"
                        title="Copy Meeting Link"
                      >
                        <Copy size={16}/>
                      </button>
                    )}
                  </div>
                </div>
              ))}
              {meetings.length === 0 && !loading && (
                <div className="text-center py-20 text-gray-500 border border-dashed border-zinc-800 rounded-xl">
                  No meetings found. Create one to get started.
                </div>
              )}
            </div>
          </motion.div>
        )}

        {/* VIEW: CREATE WIZARD */}
        {view === 'create' && (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="max-w-3xl mx-auto">
            <div className="mb-8 text-center">
              <h2 className="text-3xl font-bold mb-2">Create Your Meeting</h2>
              <p className="text-gray-400">Schedule directly to Google Calendar</p>
            </div>
            <div className="flex justify-between items-center mb-10 px-10 relative">
               <div className="absolute top-1/2 left-0 w-full h-0.5 bg-zinc-800 -z-10"></div>
               <StepBadge num={1} label="Plan" active={step === 1} done={step > 1} />
               <StepBadge num={2} label="Assets" active={step === 2} done={step > 2} />
               <StepBadge num={3} label="AI & Final" active={step === 3} done={step > 3} />
            </div>
            <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-8 shadow-2xl">
              {step === 1 && (
                <div className="space-y-6 animate-in fade-in">
                  <h3 className="text-xl font-bold border-b border-zinc-800 pb-4 mb-4">Meeting Details</h3>
                  <div>
                    <label className="block text-xs text-gray-400 mb-1 ml-1">Title *</label>
                    <input className="w-full bg-black border border-zinc-700 rounded-lg p-3 focus:border-green-500 outline-none transition" placeholder="e.g. Q4 Strategy Review" value={formData.title} onChange={e => setFormData({...formData, title: e.target.value})}/>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs text-gray-400 mb-1 ml-1">Start Time *</label>
                      <input type="datetime-local" className="w-full bg-black border border-zinc-700 rounded-lg p-3 text-sm focus:border-green-500 outline-none" value={formData.startTime} onChange={e => setFormData({...formData, startTime: e.target.value})}/>
                    </div>
                    <div>
                      <label className="block text-xs text-gray-400 mb-1 ml-1">End Time *</label>
                      <input type="datetime-local" className="w-full bg-black border border-zinc-700 rounded-lg p-3 text-sm focus:border-green-500 outline-none" value={formData.endTime} onChange={e => setFormData({...formData, endTime: e.target.value})}/>
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs text-gray-400 mb-1 ml-1">Description</label>
                    <textarea rows={3} className="w-full bg-black border border-zinc-700 rounded-lg p-3 focus:border-green-500 outline-none transition" placeholder="Agenda..." value={formData.description} onChange={e => setFormData({...formData, description: e.target.value})}/>
                  </div>
                  <div>
                    <label className="block text-xs text-gray-400 mb-1 ml-1">Attendees *</label>
                    <input className="w-full bg-black border border-zinc-700 rounded-lg p-3 focus:border-green-500 outline-none transition" placeholder="Emails separated by commas" value={formData.attendees} onChange={e => setFormData({...formData, attendees: e.target.value})}/>
                  </div>
                  <div className="flex justify-end pt-4 gap-3">
                    <button onClick={() => setView('list')} className="px-4 py-2 text-gray-400 hover:text-white">Cancel</button>
                    <button onClick={handleNextStep1} disabled={loading} className="bg-green-600 hover:bg-green-500 text-black font-bold px-8 py-3 rounded-lg flex items-center gap-2">
                       {loading ? 'Scheduling...' : 'Next >'}
                    </button>
                  </div>
                </div>
              )}
              {step === 2 && (
                <div className="space-y-8 animate-in fade-in">
                   <h3 className="text-xl font-bold border-b border-zinc-800 pb-4">Assets & Polls</h3>
                   <div>
                      <label className="block text-sm text-gray-400 mb-2">Upload Presentation</label>
                      <div className="border border-dashed border-zinc-700 rounded-lg p-6 bg-black/40 hover:bg-zinc-900 cursor-pointer flex flex-col items-center">
                         <input type="file" className="hidden" id="ppt-upload" onChange={e => setPptFile(e.target.files[0])} />
                         <label htmlFor="ppt-upload" className="cursor-pointer flex flex-col items-center">
                            <Upload className="text-green-500 mb-2" size={24}/>
                            <span className="text-sm font-medium">{pptFile ? pptFile.name : "Select PDF/PPT"}</span>
                         </label>
                      </div>
                   </div>
                   <div>
                      <label className="block text-sm text-gray-400 mb-2">Polls</label>
                      <div className="bg-black/40 border border-zinc-700 rounded-lg p-4">
                         <input className="w-full bg-zinc-900 border border-zinc-800 rounded p-2 text-sm mb-2" placeholder="Poll Question" value={pollQuestion} onChange={e => setPollQuestion(e.target.value)}/>
                         {pollOptions.map((opt, i) => (
                           <input key={i} className="w-full bg-zinc-900 border border-zinc-800 rounded p-2 text-sm mb-1" placeholder={`Option ${i+1}`} value={opt} onChange={e => { const newOpts = [...pollOptions]; newOpts[i] = e.target.value; setPollOptions(newOpts); }}/>
                         ))}
                         <button onClick={() => setPollOptions([...pollOptions, ''])} className="text-xs text-green-500 mb-3">+ Add Option</button>
                         <button onClick={handleAddPoll} className="w-full bg-zinc-800 hover:bg-zinc-700 text-white py-2 rounded text-sm"><Plus size={14} className="inline"/> Add Poll</button>
                      </div>
                      <div className="mt-2 space-y-1">
                        {formData.polls.map((p, i) => (
                          <div key={i} className="flex justify-between items-center bg-zinc-900 px-3 py-1.5 rounded text-xs text-gray-400"><span>{p.question}</span><span>{p.options.length} opts</span></div>
                        ))}
                      </div>
                   </div>
                   <div className="flex justify-between pt-4">
                    <button onClick={() => setStep(1)} className="text-gray-400">&lt; Back</button>
                    <button onClick={handleNextStep2} className="bg-green-600 text-black font-bold px-8 py-3 rounded-lg">Next &gt;</button>
                  </div>
                </div>
              )}
              {step === 3 && (
                <div className="space-y-6 animate-in fade-in">
                   <h3 className="text-xl font-bold border-b border-zinc-800 pb-4">Post-Meeting AI</h3>
                   <p className="text-sm text-gray-400">Upload audio/video recording to generate summary.</p>
                   <div className="border border-zinc-700 rounded-lg p-8 bg-black/40 flex flex-col items-center justify-center">
                      <input type="file" accept="audio/*,video/*" onChange={e => setAudioFile(e.target.files[0])} className="mb-4 text-sm text-gray-400"/>
                      <button onClick={handleProcessAudio} disabled={loading} className="bg-white text-black font-bold px-6 py-3 rounded-lg flex items-center gap-2 hover:bg-gray-200 disabled:opacity-50">
                         {loading ? 'Processing...' : <><PlayCircle size={18}/> Generate Insights</>}
                      </button>
                   </div>
                   <div className="flex justify-between pt-4">
                    <button onClick={() => setStep(2)} className="text-gray-400">&lt; Back</button>
                    <button onClick={() => setShowShareModal(true)} className="bg-green-600 text-black font-bold px-8 py-3 rounded-lg">Finish &gt;</button>
                  </div>
                </div>
              )}
            </div>
          </motion.div>
        )}

        {/* VIEW: DETAIL */}
        {view === 'detail' && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="grid grid-cols-12 gap-8 h-full pb-20">
             <div className="col-span-4 space-y-4">
                 <div className="bg-zinc-900/50 border border-white/10 p-6 rounded-2xl">
                    <button onClick={() => setView('list')} className="mb-4 text-xs text-gray-500 hover:text-white flex items-center gap-1">&larr; Back to List</button>
                    <h2 className="text-2xl font-bold mb-1">{formData.title}</h2>
                    <div className="space-y-4 text-sm text-gray-400 mt-4">
                       <div className="flex items-center gap-3"><Calendar size={16}/> {formData.startTime}</div>
                       <div className="flex items-center gap-3"><Users size={16}/> {formData.attendees}</div>
                       {formData.meetingLink && (
                         <div className="flex items-center gap-3"><LinkIcon size={16}/> <a href={formData.meetingLink} target="_blank" className="text-green-400 underline">Open Google Calendar</a></div>
                       )}
                    </div>
                 </div>
                 <div className="bg-zinc-900/50 border border-white/10 p-6 rounded-2xl">
                    <h3 className="font-semibold mb-3">Agenda</h3>
                    <p className="text-sm text-gray-400 leading-relaxed whitespace-pre-wrap">{formData.description}</p>
                 </div>
             </div>
             
             <div className="col-span-8 bg-zinc-900/50 border border-white/10 rounded-2xl p-8">
               <h3 className="text-xl font-bold flex items-center gap-2 mb-6"><Mic className="text-green-500"/> AI Copilot Results</h3>
               {transcription ? (
                 <div className="space-y-6">
                    <div className="bg-black/30 p-6 rounded-xl border border-white/5">
                        <h4 className="text-green-400 font-bold mb-3 text-sm uppercase tracking-wide">Summary</h4>
                        <div className="prose prose-invert prose-sm max-w-none text-gray-300" dangerouslySetInnerHTML={{ __html: summary }} />
                    </div>
                    <div className="bg-black/30 p-6 rounded-xl border border-white/5 opacity-80">
                        <h4 className="text-gray-400 font-bold mb-3 text-sm uppercase tracking-wide">Transcript</h4>
                        <p className="text-xs text-gray-500 leading-relaxed font-mono max-h-60 overflow-y-auto">{transcription}</p>
                    </div>
                 </div>
               ) : (
                 <div className="text-center py-20 text-gray-500">
                    <p>No recording processed yet.</p>
                    <button onClick={() => { setView('create'); setStep(3); }} className="mt-4 text-green-400 hover:underline">Go to Upload</button>
                 </div>
               )}
             </div>
          </motion.div>
        )}

      </main>

      <AnimatePresence>
        {showShareModal && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
            <div className="bg-zinc-900 border border-zinc-700 rounded-2xl w-full max-w-md p-6 shadow-2xl relative">
              <button onClick={() => setShowShareModal(false)} className="absolute top-4 right-4 text-gray-500 hover:text-white"><X size={20}/></button>
              <div className="flex flex-col items-center mb-6">
                <div className="w-12 h-12 bg-green-500 rounded-full flex items-center justify-center mb-4"><CheckCircle2 size={28} className="text-black"/></div>
                <h3 className="text-xl font-bold">Share Meeting Assets</h3>
              </div>
              <div className="space-y-3 mb-8">
                 <label className="flex items-center gap-3 bg-black/50 p-3 rounded-lg border border-zinc-800 cursor-pointer hover:border-green-500/50"><input type="checkbox" checked={shareOptions.video} onChange={e => setShareOptions({...shareOptions, video: e.target.checked})} className="accent-green-500 w-5 h-5" /><span className="font-medium">Video</span></label>
                 <label className="flex items-center gap-3 bg-black/50 p-3 rounded-lg border border-zinc-800 cursor-pointer hover:border-green-500/50"><input type="checkbox" checked={shareOptions.notes} onChange={e => setShareOptions({...shareOptions, notes: e.target.checked})} className="accent-green-500 w-5 h-5" /><span className="font-medium">Summary & Notes</span></label>
              </div>
              <button onClick={handleFinalFinish} className="w-full bg-green-600 hover:bg-green-500 text-black font-bold py-3 rounded-lg">Share & Done</button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function StepBadge({ num, label, active, done }) {
  return (
    <div className="flex flex-col items-center z-10">
       <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm border-2 mb-2 transition-colors ${active ? 'bg-green-500 border-green-500 text-black' : done ? 'bg-green-900 border-green-600 text-green-400' : 'bg-black border-zinc-700 text-zinc-500'}`}>{done ? <CheckCircle2 size={16}/> : num}</div>
       <span className={`text-xs font-semibold ${active ? 'text-white' : 'text-gray-600'}`}>{label}</span>
    </div>
  )
}