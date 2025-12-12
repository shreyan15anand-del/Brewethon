const mongoose = require('mongoose');

const ClubAnnouncementSchema = new mongoose.Schema({
  clubRepId: { type: mongoose.Schema.Types.ObjectId, ref: 'ClubRep', required: true },
  collegeId: { type: mongoose.Schema.Types.ObjectId, ref: 'College', required: true },
  title: { type: String, required: true },
  content: { type: String, required: true },
  category: { type: String, enum: ['update', 'recruitment', 'achievement', 'highlight', 'other'], default: 'update' },
  isPinned: { type: Boolean, default: false },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
}, { timestamps: true });

module.exports = mongoose.model('ClubAnnouncement', ClubAnnouncementSchema);
