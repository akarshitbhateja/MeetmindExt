import mongoose from 'mongoose';

// Define PollSchema first
const PollSchema = new mongoose.Schema({
  question: { type: String },
  options: [{ type: String }],
  createdAt: { type: Date, default: Date.now }
});

const MeetingSchema = new mongoose.Schema({
  userId: { type: String, required: true },
  
  // Make these String to avoid date parsing errors from HTML inputs
  title: { type: String, required: true },
  description: { type: String, default: '' },
  startTime: { type: String, required: true }, 
  endTime: { type: String, required: true },
  
  attendees: { type: String, default: '' },
  pptUrl: { type: String, default: '' },
  
  polls: [PollSchema], // Uses the schema defined above

  status: { type: String, default: 'scheduled' },
  recordingUrl: String,
  transcription: String,
  summary: String,
  
  createdAt: { type: Date, default: Date.now },
});

// Check if model exists before compiling to avoid OverwriteModelError
export default mongoose.models.Meeting || mongoose.model('Meeting', MeetingSchema);