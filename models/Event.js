const mongoose = require('mongoose');

const EventSchema = new mongoose.Schema({
  clubRepId: { type: mongoose.Schema.Types.ObjectId, ref: 'ClubRep', required: true },
  collegeId: { type: mongoose.Schema.Types.ObjectId, ref: 'College', required: true },
  eventName: { type: String, required: true },
  description: { type: String, required: true },
  eventDate: { type: Date, required: true },
  eventTime: { type: String, required: true }, // e.g., "3:00 PM - 5:00 PM"
  location: { type: String, required: true },
  capacity: { type: Number }, // max participants
  registeredCount: { type: Number, default: 0 },
  eventType: { type: String, enum: ['workshop', 'meetup', 'competition', 'social', 'webinar', 'other'], default: 'meetup' },
  status: { type: String, enum: ['upcoming', 'ongoing', 'completed', 'cancelled'], default: 'upcoming' },
  imageUrl: { type: String },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
}, { timestamps: true });

module.exports = mongoose.model('Event', EventSchema);
