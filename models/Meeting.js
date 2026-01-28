import mongoose from 'mongoose';

const PollSchema = new mongoose.Schema({
  question: { type: String },
  options: [{ type: String }],
  createdAt: { type: Date, default: Date.now }
});

const MeetingSchema = new mongoose.Schema({
  userId: { type: String, required: true },
  
  // Meeting Details
  title: { type: String, required: true },
  description: { type: String, default: '' },
  startTime: { type: String, required: true }, 
  endTime: { type: String, required: true },
  attendees: { type: String, default: '' },
  meetingLink: { type: String, default: '' },

  // Assets
  pptUrl: { type: String, default: '' },       // The Firebase Download URL
  pptName: { type: String, default: '' },      // The File Name
  pptThumbnail: { type: String, default: '' }, // ✅ The Base64 Image of Page 1
  
  polls: [PollSchema],

  // Post-Meeting Intelligence
  status: { type: String, default: 'scheduled' },
  recordingUrl: String,
  transcription: String,
  summary: String,
  
  createdAt: { type: Date, default: Date.now },
});

export default mongoose.models.Meeting || mongoose.model('Meeting', MeetingSchema);