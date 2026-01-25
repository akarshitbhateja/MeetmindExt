'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import axios from 'axios';
import {
  Plus,
  Calendar,
  Clock,
  Users,
  FileText,
  Upload,
  CheckCircle2,
  LogOut,
  PlayCircle,
  Share2,
  X,
  Link as LinkIcon,
  Mic,
  Copy,
  ArrowLeft,
  Radio,
} from 'lucide-react';

import { auth, provider, signInWithPopup, GoogleAuthProvider } from '@/lib/firebase';
import { onAuthStateChanged, signOut } from 'firebase/auth';

export default function Dashboard() {
  // ============= STATE =============
  const [user, setUser] = useState(null);
  const [meetings, setMeetings] = useState([]);
  const [view, setView] = useState('list');
  const [loading, setLoading] = useState(true);
  const [step, setStep] = useState(1);
  const [showShareModal, setShowShareModal] = useState(false);
  const [shareOptions, setShareOptions] = useState({
    video: true,
    notes: true,
    ppt: true,
  });
  const [activeTab, setActiveTab] = useState('summary');

  // Form Data
  const [formData, setFormData] = useState({
    title: '',
    startTime: '',
    endTime: '',
    description: '',
    attendees: '',
    pptUrl: '',
    polls: [],
  });

  // Processing Data
  const [pollQuestion, setPollQuestion] = useState('');
  const [pollOptions, setPollOptions] = useState(['', '']);
  const [audioFile, setAudioFile] = useState(null);
  const [pptFile, setPptFile] = useState(null);
  const [transcription, setTranscription] = useState('');
  const [summary, setSummary] = useState('');
  const [currentMeetingId, setCurrentMeetingId] = useState(null);

  // ============= EFFECTS =============
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      if (!currentUser) window.location.href = '/login';
      else {
        setUser(currentUser);
        fetchMeetings(currentUser.uid);
      }
    });
    return () => unsubscribe();
  }, []);

  // ============= HANDLERS: Auth & Fetch =============
  const fetchMeetings = async (uid) => {
    try {
      const res = await axios.get(`/api/meetings?userId=${uid}`);
      setMeetings(res.data.data);
      setLoading(false);
    } catch (error) {
      console.error(error);
      setLoading(false);
    }
  };

  const handleSignOut = async () => {
    sessionStorage.removeItem('google_access_token');
    await signOut(auth);
    window.location.href = '/login';
  };

  // ============= HANDLERS: Utilities =============
  const copyToClipboard = (text, e) => {
    if (e) e.stopPropagation();
    navigator.clipboard.writeText(text);
    alert('Link Copied!');
  };

  const cleanSummary = (text) => {
    if (!text) return '';
    return text.replace(/```html|```/g, '').trim();
  };

  const getMeetingStatus = (startStr, endStr) => {
    if (!startStr || !endStr) return 'upcoming';
    const now = new Date();
    if (now > new Date(endStr)) return 'completed';
    if (now >= new Date(startStr) && now <= new Date(endStr)) return 'ongoing';
    return 'upcoming';
  };

  // ============= HANDLERS: Google Calendar =============
  const createGoogleCalendarEvent = async (meetingData) => {
    let token = sessionStorage.getItem('google_access_token');
    if (!token) {
      try {
        const result = await signInWithPopup(auth, provider);
        const credential = GoogleAuthProvider.credentialFromResult(result);
        token = credential.accessToken;
        sessionStorage.setItem('google_access_token', token);
      } catch (e) {
        alert('Calendar access required.');
        return null;
      }
    }

    const userTimeZone = Intl.DateTimeFormat().resolvedOptions().timeZone;
    const event = {
      summary: meetingData.title,
      description: `${meetingData.description}\n\n--\nScheduled via MeetMind`,
      start: {
        dateTime: meetingData.startTime + ':00',
        timeZone: userTimeZone,
      },
      end: {
        dateTime: meetingData.endTime + ':00',
        timeZone: userTimeZone,
      },
      attendees: meetingData.attendees
        .split(',')
        .map((email) => ({ email: email.trim() })),
      reminders: {
        useDefault: false,
        overrides: [
          { method: 'email', minutes: 30 },
          { method: 'popup', minutes: 10 },
        ],
      },
      conferenceData: {
        createRequest: {
          requestId: Math.random().toString(36).substring(7),
        },
      },
    };

    try {
      const response = await fetch(
        `https://www.googleapis.com/calendar/v3/calendars/primary/events?conferenceDataVersion=1&sendUpdates=all`,
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(event),
        }
      );
      const data = await response.json();
      if (data.error) throw new Error(data.error.message);
      return data.htmlLink;
    } catch (error) {
      alert('Schedule failed: ' + error.message);
      return null;
    }
  };

  // ============= HANDLERS: Form Actions =============
  const handleNextStep1 = async () => {
    if (!formData.title || !formData.startTime) {
      alert('Required fields missing.');
      return;
    }
    setLoading(true);
    const calendarLink = await createGoogleCalendarEvent(formData);
    if (!calendarLink) {
      setLoading(false);
      return;
    }

    const meetingData = {
      ...formData,
      userId: user.uid,
      meetingLink: calendarLink,
    };
    try {
      let res;
      if (!currentMeetingId) {
        res = await axios.post('/api/meetings', meetingData);
        setCurrentMeetingId(res.data.data._id);
      } else {
        await axios.put('/api/meetings', { id: currentMeetingId, ...meetingData });
      }
      setStep(2);
    } catch (e) {
      alert('Save failed.');
    }
    setLoading(false);
  };

  const handleProcessAudio = async () => {
    if (!audioFile) return alert('Upload audio first.');
    setLoading(true);
    try {
      const data = new FormData();
      data.append('file', audioFile);
      data.append('task', 'transcribe');
      const transRes = await axios.post('/api/groq/process', data);

      const sumData = new FormData();
      sumData.append('task', 'summarize');
      sumData.append('text', transRes.data.text);
      const sumRes = await axios.post('/api/groq/process', sumData);

      const cleaned = cleanSummary(sumRes.data.summary);
      setTranscription(transRes.data.text);
      setSummary(cleaned);

      await axios.put('/api/meetings', {
        id: currentMeetingId,
        transcription: transRes.data.text,
        summary: cleaned,
        status: 'completed',
      });
      setActiveTab('summary');
    } catch (e) {
      alert('AI Error: ' + e.message);
    }
    setLoading(false);
  };

  const handleFinalFinish = async () => {
    if (process.env.NEXT_PUBLIC_PABBLY_POST_MEETING_WEBHOOK) {
      try {
        await axios.post(process.env.NEXT_PUBLIC_PABBLY_POST_MEETING_WEBHOOK, {
          meetingId: currentMeetingId,
          title: formData.title,
          summary,
          transcription,
          attendees: formData.attendees,
        });
        alert('Assets shared!');
      } catch (e) {}
    }
    setShowShareModal(false);
    setView('list');
    setStep(1);
    fetchMeetings(user.uid);
  };

  // ============= RENDER =============
  if (!user)
    return (
      <div className="flex h-screen items-center justify-center bg-black text-white">
        Loading...
      </div>
    );

  return (
    <div className="flex min-h-screen flex-col bg-black font-sans text-white selection:bg-green-500 selection:text-white">
      
      {/* Navbar */}
      <nav className="sticky top-0 z-50 border-b border-white/10 bg-zinc-950 px-8 py-4">
        <div className="flex h-[72px] items-center justify-between">
          <div
            className="flex cursor-pointer items-center gap-2 transition hover:opacity-80"
            onClick={() => {
              setView('list');
              setStep(1);
            }}
          >
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-tr from-green-400 to-green-600 font-bold text-black">
              M
            </div>
            <span className="text-lg font-bold tracking-tight">MeetMind</span>
          </div>
          <div className="flex items-center gap-4">
            <span className="hidden text-sm text-gray-400 md:block">
              {user.email}
            </span>
            <button
              onClick={handleSignOut}
              className="flex items-center gap-2 rounded border border-zinc-700 px-3 py-1.5 text-xs transition hover:bg-zinc-800"
            >
              <LogOut size={12} /> Sign Out
            </button>
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <main className="mx-auto w-full max-w-7xl flex-1 p-8">
        {/* VIEW: LIST */}
        {view === 'list' && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="space-y-8"
          >
            <div className="flex items-end justify-between">
              <div>
                <h1 className="mb-2 text-4xl font-bold">Meetings</h1>
                <p className="text-gray-400">
                  Manage your schedule and AI insights.
                </p>
              </div>
              <button
                onClick={() => {
                  setView('create');
                  setStep(1);
                  setFormData({
                    title: '',
                    startTime: '',
                    endTime: '',
                    description: '',
                    attendees: '',
                    polls: [],
                  });
                  setCurrentMeetingId(null);
                  setTranscription('');
                  setSummary('');
                }}
                className="flex items-center gap-2 rounded-lg bg-green-600 px-6 py-3 font-semibold text-black transition-transform hover:scale-105 hover:bg-green-500"
              >
                <Plus size={20} />
                New Meeting
              </button>
            </div>
            <div className="grid gap-4">
              {meetings.map((m) => {
                const status = getMeetingStatus(m.startTime, m.endTime);
                return (
                  <div
                    key={m._id}
                    onClick={() => {
                      setFormData(m);
                      setCurrentMeetingId(m._id);
                      setTranscription(m.transcription || '');
                      setSummary(m.summary || '');
                      setView('detail');
                      setActiveTab(m.summary ? 'summary' : 'upload');
                    }}
                    className="group flex cursor-pointer items-center justify-between rounded-xl border border-white/10 bg-zinc-900/50 p-5 transition-colors hover:border-green-500/30"
                  >
                    <div className="flex items-center gap-4">
                      <div className="flex h-12 w-12 items-center justify-center rounded-full border border-white/5 bg-zinc-800 font-bold text-gray-400 transition-all group-hover:bg-zinc-800/80 group-hover:text-green-400">
                        {m.title.charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <h3 className="text-lg font-bold transition-colors group-hover:text-green-400">
                          {m.title}
                        </h3>
                        <p className="flex items-center gap-2 text-sm text-gray-500">
                          <Calendar size={14} />
                          {m.startTime
                            ? new Date(m.startTime).toLocaleString()
                            : m.date}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      {status === 'completed' && (
                        <span className="flex items-center gap-1 rounded border border-green-900/30 bg-green-900/20 px-3 py-1 text-xs font-semibold text-green-500">
                          <CheckCircle2 size={12} />
                          Completed
                        </span>
                      )}
                      {status === 'ongoing' && (
                        <span className="flex animate-pulse items-center gap-1 rounded border border-yellow-900/30 bg-yellow-900/20 px-3 py-1 text-xs font-semibold text-yellow-500">
                          <Radio size={12} />
                          Ongoing
                        </span>
                      )}
                      {status === 'upcoming' && (
                        <span className="flex items-center gap-2 rounded border border-zinc-700 bg-zinc-800 px-3 py-1 text-xs text-gray-300">
                          <Clock size={12} />
                          Upcoming
                        </span>
                      )}
                      <span className="flex items-center gap-1 text-xs text-gray-500">
                        <Users size={12} />
                        {m.attendees ? m.attendees.split(',').length : 0}
                      </span>
                      {m.meetingLink && (
                        <button
                          onClick={(e) => copyToClipboard(m.meetingLink, e)}
                          className="rounded-lg border border-zinc-700 bg-zinc-800 p-2 text-gray-400 transition-all hover:bg-zinc-700 hover:text-white"
                          title="Copy Link"
                        >
                          <LinkIcon size={16} />
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </motion.div>
        )}

        {/* VIEW: CREATE WIZARD */}
        {view === 'create' && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="mx-auto max-w-3xl"
          >
            <div className="mb-8 text-center">
              <h2 className="mb-2 text-3xl font-bold">Create Your Meeting</h2>
            </div>
            <div className="relative mb-10 flex items-center justify-between px-10">
              <div className="absolute top-1/2 left-0 h-0.5 w-full bg-zinc-800 -z-10"></div>
              <StepBadge num={1} label="Plan" active={step === 1} done={step > 1} />
              <StepBadge num={2} label="Assets" active={step === 2} done={step > 2} />
              <StepBadge
                num={3}
                label="AI & Final"
                active={step === 3}
                done={step > 3}
              />
            </div>
            <div className="rounded-2xl border border-zinc-800 bg-zinc-900 p-8 shadow-2xl">
              {step === 1 && (
                <div className="animate-in space-y-6 fade-in">
                  <input
                    className="w-full rounded-lg border border-zinc-700 bg-black p-3"
                    placeholder="Title *"
                    value={formData.title}
                    onChange={(e) =>
                      setFormData({ ...formData, title: e.target.value })
                    }
                  />
                  <div className="grid grid-cols-2 gap-4">
                    <input
                      type="datetime-local"
                      className="w-full rounded-lg border border-zinc-700 bg-black p-3 text-sm"
                      value={formData.startTime}
                      onChange={(e) =>
                        setFormData({ ...formData, startTime: e.target.value })
                      }
                    />
                    <input
                      type="datetime-local"
                      className="w-full rounded-lg border border-zinc-700 bg-black p-3 text-sm"
                      value={formData.endTime}
                      onChange={(e) =>
                        setFormData({ ...formData, endTime: e.target.value })
                      }
                    />
                  </div>
                  <textarea
                    className="w-full rounded-lg border border-zinc-700 bg-black p-3"
                    placeholder="Agenda / Description"
                    rows={3}
                    value={formData.description}
                    onChange={(e) =>
                      setFormData({ ...formData, description: e.target.value })
                    }
                  />
                  <input
                    className="w-full rounded-lg border border-zinc-700 bg-black p-3"
                    placeholder="Attendees (emails)"
                    value={formData.attendees}
                    onChange={(e) =>
                      setFormData({ ...formData, attendees: e.target.value })
                    }
                  />
                  <div className="flex justify-end gap-3 pt-4">
                    <button
                      onClick={() => setView('list')}
                      className="text-gray-400 hover:text-white"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={handleNextStep1}
                      disabled={loading}
                      className="flex items-center gap-2 rounded-lg bg-green-600 px-8 py-3 font-bold text-black hover:bg-green-500"
                    >
                      {loading ? 'Scheduling...' : 'Next >'}
                    </button>
                  </div>
                </div>
              )}
              {step === 2 && (
                <div className="animate-in space-y-8 fade-in">
                  <div className="flex flex-col items-center rounded-lg border border-dashed border-zinc-700 bg-black/40 p-6">
                    <Upload className="mb-2 text-green-500" />
                    <span className="text-sm text-gray-400">
                      Upload Assets (Skipped for Demo)
                    </span>
                  </div>
                  <div className="flex justify-between pt-4">
                    <button
                      onClick={() => setStep(1)}
                      className="text-gray-400"
                    >
                      &lt; Back
                    </button>
                    <button
                      onClick={() => setStep(3)}
                      className="rounded-lg bg-green-600 px-8 py-3 font-bold text-black"
                    >
                      Next &gt;
                    </button>
                  </div>
                </div>
              )}
              {step === 3 && (
                <div className="animate-in space-y-6 fade-in">
                  <div className="flex flex-col items-center justify-center rounded-lg border border-zinc-700 bg-black/40 p-8">
                    <input
                      type="file"
                      accept="audio/*,video/*"
                      onChange={(e) => setAudioFile(e.target.files[0])}
                      className="mb-4 text-sm text-gray-400"
                    />
                    <button
                      onClick={handleProcessAudio}
                      disabled={loading}
                      className="flex items-center gap-2 rounded-lg bg-white px-6 py-3 font-bold text-black"
                    >
                      {loading ? 'Processing...' : 'Generate Insights'}
                    </button>
                  </div>
                  <div className="flex justify-between pt-4">
                    <button
                      onClick={() => setStep(2)}
                      className="text-gray-400"
                    >
                      &lt; Back
                    </button>
                    <button
                      onClick={() => setShowShareModal(true)}
                      className="rounded-lg bg-green-600 px-8 py-3 font-bold text-black"
                    >
                      Finish &gt;
                    </button>
                  </div>
                </div>
              )}
            </div>
          </motion.div>
        )}

        {/* VIEW: DETAIL */}
        {view === 'detail' && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="flex flex-col space-y-6 pb-20"
          >
            {/* Header */}
            <div className="border-b border-white/10 pb-6">
              <button
                onClick={() => setView('list')}
                className="mb-2 flex items-center gap-1 text-xs text-gray-500 transition-colors hover:text-white"
              >
                <ArrowLeft size={14} />
                Back to Dashboard
              </button>
              <h2 className="text-3xl font-bold leading-tight">{formData.title}</h2>
              <div className="mt-2 flex items-center gap-4 text-sm text-gray-400">
                <span className="flex items-center gap-2">
                  <Calendar size={14} />
                  {formData.startTime?.replace('T', ' ')}
                </span>
                <span className="flex items-center gap-2">
                  <Users size={14} />
                  {formData.attendees?.split(',').length} Participants
                </span>
              </div>
            </div>

            {/* Header Actions */}
            <div className="flex gap-3">
              {formData.meetingLink && (
                <button
                  onClick={(e) => copyToClipboard(formData.meetingLink, e)}
                  className="flex items-center gap-2 rounded-lg border border-zinc-700 bg-zinc-800 px-4 py-2 text-sm text-white transition-all hover:bg-zinc-700"
                >
                  <LinkIcon size={16} />
                  Copy Link
                </button>
              )}
              <button
                onClick={() => setShowShareModal(true)}
                className="flex items-center gap-2 rounded-lg bg-green-600 px-6 py-2 text-sm font-bold text-black transition-all hover:bg-green-500"
              >
                <Share2 size={16} />
                Share
              </button>
            </div>

            {/* Content Grid */}
            <div className="grid grid-cols-12 gap-8">
              {/* Left Side Info */}
              <div className="col-span-4 space-y-6">
                <div className="rounded-2xl border border-white/10 bg-zinc-900/50 p-6">
                  <h3 className="mb-4 border-b border-white/5 pb-2 text-xs font-semibold uppercase tracking-wider text-white/80">
                    Agenda & Context
                  </h3>
                  <p className="whitespace-pre-wrap text-sm leading-relaxed text-gray-400">
                    {formData.description || 'No agenda provided.'}
                  </p>
                </div>
              </div>

              {/* Right Side AI Hub */}
              <div className="col-span-8 flex min-h-[500px] flex-col overflow-hidden rounded-2xl border border-white/10 bg-zinc-900/50">
                {/* Tabs */}
                <div className="flex border-b border-white/10 bg-black/20 px-6 pt-4">
                  {['summary', 'transcript', 'upload'].map((tab) => (
                    <button
                      key={tab}
                      onClick={() => setActiveTab(tab)}
                      className={`relative px-4 pb-4 text-sm font-medium capitalize transition-all ${
                        activeTab === tab
                          ? 'text-green-400'
                          : 'text-gray-400 hover:text-white'
                      }`}
                    >
                      {tab === 'upload' ? 'Recording / Upload' : tab}
                      {activeTab === tab && (
                        <motion.div
                          layoutId="underline"
                          className="absolute bottom-0 left-0 right-0 h-0.5 bg-green-400"
                        />
                      )}
                    </button>
                  ))}
                </div>

                {/* Tab Content */}
                <div className="flex-1 overflow-y-auto p-8 custom-scrollbar">
                  {activeTab === 'summary' && (
                    <div className="animate-in h-full fade-in">
                      {summary ? (
                        <div className="min-h-full rounded-xl border border-white/5 bg-black/20 p-6">
                          <div
                            className="prose prose-invert prose-sm max-w-none leading-relaxed text-gray-300 prose-headings:mb-4 prose-headings:mt-0 prose-headings:text-green-400 prose-p:mb-4"
                            dangerouslySetInnerHTML={{ __html: summary }}
                          />
                        </div>
                      ) : (
                        <div className="flex flex-col items-center py-20 text-center text-gray-500">
                          <FileText className="mb-4 opacity-20" size={40} />
                          <p>No summary generated.</p>
                          <button
                            onClick={() => setActiveTab('upload')}
                            className="mt-2 text-sm text-green-400 hover:underline"
                          >
                            Go to Upload
                          </button>
                        </div>
                      )}
                    </div>
                  )}

                  {activeTab === 'transcript' && (
                    <div className="animate-in h-full fade-in">
                      {transcription ? (
                        <div className="min-h-full rounded-xl border border-white/5 bg-black/20 p-6">
                          <div className="whitespace-pre-wrap font-mono text-xs leading-relaxed text-gray-400">
                            {transcription}
                          </div>
                        </div>
                      ) : (
                        <div className="flex flex-col items-center py-20 text-center text-gray-500">
                          <Mic className="mb-4 opacity-20" size={40} />
                          <p>No transcript available.</p>
                        </div>
                      )}
                    </div>
                  )}

                  {activeTab === 'upload' && (
                    <div className="animate-in flex h-full flex-col items-center justify-center space-y-6 fade-in">
                      {!summary ? (
                        <div className="w-full max-w-md rounded-xl border-2 border-dashed border-zinc-700 bg-black/20 p-8 text-center">
                          <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-zinc-800">
                            <Upload className="text-green-500" size={24} />
                          </div>
                          <h4 className="mb-2 font-semibold">Upload Meeting Recording</h4>
                          <input
                            type="file"
                            accept="audio/*,video/*"
                            onChange={(e) => setAudioFile(e.target.files[0])}
                            className="mb-4 w-full text-sm text-gray-400 file:rounded-full file:border-0 file:bg-green-600 file:px-4 file:py-2 file:text-xs file:font-semibold file:text-black file:mr-4 hover:file:bg-green-500"
                          />
                          <button
                            onClick={handleProcessAudio}
                            disabled={loading}
                            className="flex w-full items-center justify-center gap-2 rounded-lg bg-white py-3 font-bold text-black hover:bg-gray-200 disabled:opacity-50"
                          >
                            {loading ? (
                              <span className="animate-spin">⏳</span>
                            ) : (
                              <PlayCircle size={18} />
                            )}
                            {loading ? 'Processing...' : 'Generate Insights'}
                          </button>
                        </div>
                      ) : (
                        <div className="space-y-4 text-center">
                          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full border border-green-500/50 bg-green-900/20">
                            <CheckCircle2 className="text-green-500" size={32} />
                          </div>
                          <h3 className="text-xl font-bold">Processing Complete</h3>
                          <button
                            onClick={() => setActiveTab('summary')}
                            className="text-green-400 hover:underline"
                          >
                            View Results
                          </button>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </motion.div>
        )}

      </main>

      {/* Share Modal */}
      <AnimatePresence>
        {showShareModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm"
          >
            <div className="relative w-full max-w-md rounded-2xl border border-zinc-700 bg-zinc-900 p-6 shadow-2xl">
              <button
                onClick={() => setShowShareModal(false)}
                className="absolute top-4 right-4 text-gray-500 hover:text-white"
              >
                <X size={20} />
              </button>
              <h3 className="mb-4 text-center text-xl font-bold">Share Results</h3>
              <button
                onClick={handleFinalFinish}
                className="w-full rounded-lg bg-green-600 py-3 font-bold text-black"
              >
                Done
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function StepBadge({ num, label, active, done }) {
  return (
    <div className="z-10 flex flex-col items-center">
      <div
        className={`mb-2 flex h-8 w-8 items-center justify-center rounded-full border-2 font-bold text-sm transition-colors ${
          active
            ? 'border-green-500 bg-green-500 text-black'
            : done
              ? 'border-green-600 bg-green-900 text-green-400'
              : 'border-zinc-700 bg-black text-zinc-500'
        }`}
      >
        {done ? <CheckCircle2 size={16} /> : num}
      </div>
      <span
        className={`text-xs font-semibold ${
          active ? 'text-white' : 'text-gray-600'
        }`}
      >
        {label}
      </span>
    </div>
  );
}