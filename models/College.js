const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const CollegeSchema = new mongoose.Schema({
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  collegeName: { type: String, required: true }
}, { timestamps: true });

// Normalize email and hash password before saving
CollegeSchema.pre('save', async function() {
  // lowercase email for consistent lookups
  if (this.email) this.email = this.email.toLowerCase();

  if (!this.isModified('password')) return;
  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
});

// Instance method to compare password
CollegeSchema.methods.comparePassword = function(candidate) {
  return bcrypt.compare(candidate, this.password);
};

module.exports = mongoose.model('College', CollegeSchema);
