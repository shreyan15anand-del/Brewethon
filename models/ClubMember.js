const mongoose = require('mongoose');

const ClubMemberSchema = new mongoose.Schema({
  clubRepId: { type: mongoose.Schema.Types.ObjectId, ref: 'ClubRep', required: true },
  collegeId: { type: mongoose.Schema.Types.ObjectId, ref: 'College', required: true },
  name: { type: String, required: true },
  email: { type: String, required: true, lowercase: true },
  phoneNumber: { type: String },
  rollNumber: { type: String },
  department: { type: String },
  joinDate: { type: Date, default: Date.now },
  role: { type: String, enum: ['president', 'vice-president', 'secretary', 'treasurer', 'member'], default: 'member' },
  status: { type: String, enum: ['active', 'inactive'], default: 'active' },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
}, { timestamps: true });

module.exports = mongoose.model('ClubMember', ClubMemberSchema);
