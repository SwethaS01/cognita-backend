const mongoose = require('mongoose');

const mentorProfileSchema = new mongoose.Schema({
  user: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'User', 
    required: true,
    unique: true 
  },
  skills: [String],
  placementSkills: [String],
  subjects: [String],
  guidanceAreas: [String],
  about: String,
  preferredTopics: [String],
  isActive: { type: Boolean, default: true },
  mentorshipStatus: { 
    type: String, 
    enum: ['available', 'busy', 'not_accepting'],
    default: 'available'
  }
}, { timestamps: true });

module.exports = mongoose.model('MentorProfile', mentorProfileSchema);
