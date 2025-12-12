const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const ClubRepSchema = new mongoose.Schema({
  collegeId: { type: mongoose.Schema.Types.ObjectId, ref: 'College', required: true },
  name: { type: String, required: true },
  email: { type: String, required: true },
  password: { type: String, required: true },
  clubName: { type: String, required: true },
  phoneNumber: { type: String }
}, { timestamps: true });

// Normalize email and hash password before saving
ClubRepSchema.pre('save', async function() {
  if (this.email) this.email = this.email.toLowerCase();
  if (!this.isModified('password')) return;
  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
});

ClubRepSchema.methods.comparePassword = function(candidate) {
  return bcrypt.compare(candidate, this.password);
};

module.exports = mongoose.model('ClubRep', ClubRepSchema);
