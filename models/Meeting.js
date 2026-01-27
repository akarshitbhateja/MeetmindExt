import mongoose from 'mongoose';

const PollSchema = new mongoose.Schema({
  question: String,
  options: [String],
  createdAt: { type: Date, default: Date.now }
});

const MeetingSchema = new mongoose.Schema({
  userId: { type: String, required: true },
  title: { type: String, required: true },
  description: { type: String, default: '' },
  startTime: { type: String, required: true }, 
  endTime: { type: String, required: true },
  attendees: { type: String, default: '' },
  
  // ✅ ADDED pptName
  pptUrl: { type: String, default: '' },
  pptName: { type: String, default: '' }, 
  
  polls: [PollSchema],
  status: { type: String, default: 'scheduled' },
  recordingUrl: String,
  transcription: String,
  summary: String,
  createdAt: { type: Date, default: Date.now },
});

export default mongoose.models.Meeting || mongoose.model('Meeting', MeetingSchema);